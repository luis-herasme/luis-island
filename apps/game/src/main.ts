/**
 * The first demo wiring the packages together: the ECS owns the world, the
 * renderer draws it, @game/math carries the transforms, @game/input feeds a
 * movement system and @game/physics makes it all solid. Drive the orange
 * cube with WASD or the arrows — it falls onto the ground when the page
 * loads and the obstacle boxes block its way.
 */
import { ECS } from "@game/ecs";
import { Keyboard } from "@game/input";
import { AXIS_Y, Matrix4x4, Transform3D, Vector3 } from "@game/math";
import { Collider, PhysicsWorld, RigidBody } from "@game/physics";
import { GEOMETRY_BOX, Material, Mesh, PerspectiveCamera, Renderer, Uniform, startAnimationLoop } from "@game/render";

// ---------------------------------------------------------------------------
// Rendering setup — one shader for everything, colored per mesh
// ---------------------------------------------------------------------------

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec3 v_normal;

void main() {
  v_normal = mat3(transform) * normal;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;

uniform vec3 base_color;

out vec4 fragment_color;

void main() {
  float light = max(0.35, dot(normalize(v_normal), normalize(vec3(0.4, 1.0, 0.6))));
  fragment_color = vec4(base_color * light, 1.0);
}`;

const renderer = new Renderer();

const camera = new PerspectiveCamera({ aspect: window.innerWidth / window.innerHeight });
camera.transform.translation.set(0, 9, 12);
camera.transform.rotation.setFromRotationMatrix(
  new Matrix4x4().targetTo(camera.transform.translation, new Vector3(0, 0, 0), AXIS_Y),
);

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

type Components = {
  /** Source of truth for rendering; the physics system writes it from the body. */
  transform: Transform3D;
  mesh: Mesh;
  /** Source of truth for where an entity is and how it moves. */
  body: RigidBody;
  player: { speed: number };
};

const ecs = new ECS<Components>();
const keyboard = new Keyboard();
const physicsWorld = new PhysicsWorld();

function spawnBox(options: {
  color: [number, number, number];
  position: [number, number, number];
  scale?: [number, number, number];
  bodyType?: "dynamic" | "static";
}) {
  const material = new Material({
    vertexShaderSource: VERTEX_SHADER_SOURCE,
    fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
  });
  material.setUniform("base_color", Uniform.vector3(options.color));

  const transform = new Transform3D();
  transform.translation.set(...options.position);
  if (options.scale) transform.scale.set(...options.scale);

  // The mesh is a unit box scaled by the transform, so the collider's half
  // extents are half the scale.
  const body = new RigidBody({
    collider: Collider.box({ halfExtents: transform.scale.clone().multiplyScalar(0.5) }),
    type: options.bodyType ?? "static",
    translation: new Vector3(...options.position),
  });
  physicsWorld.addBody(body);

  const entity = ecs.addEntity();
  ecs.addComponent(entity, "transform", transform);
  ecs.addComponent(entity, "body", body);
  ecs.addComponent(entity, "mesh", new Mesh({ geometry: GEOMETRY_BOX.copy(), material }));
  return entity;
}

// Ground slab; its top sits at y = -0.5, flush with the cubes' bottoms.
spawnBox({ color: [0.2, 0.27, 0.33], position: [0, -0.6, 0], scale: [20, 0.2, 20] });

// Obstacles — static bodies the player collides with.
spawnBox({ color: [0.55, 0.36, 0.68], position: [3, 0, -2] });
spawnBox({ color: [0.36, 0.55, 0.68], position: [-4, 0, 1] });
spawnBox({ color: [0.42, 0.68, 0.36], position: [2, 0, 3] });

// The player: dynamic, spawned above the ground so it falls in on load.
const player = spawnBox({ color: [1, 0.53, 0.27], position: [0, 3, 0], bodyType: "dynamic" });
ecs.addComponent(player, "player", { speed: 6 });

// ---------------------------------------------------------------------------
// Systems, in frame order: input → physics → render
// ---------------------------------------------------------------------------

/** Input writes velocities; the physics step decides where things end up. */
const playerMovementSystem = ecs.createSystem({
  requiredComponents: ["body", "player"],

  update({ entities, components }) {
    // W/up is -Z: away from the camera, which looks down the -Z axis.
    const moveX = keyboard.axis({ negative: "KeyA", positive: "KeyD" }) + keyboard.axis({ negative: "ArrowLeft", positive: "ArrowRight" });
    const moveZ = keyboard.axis({ negative: "KeyW", positive: "KeyS" }) + keyboard.axis({ negative: "ArrowUp", positive: "ArrowDown" });

    // Normalize so diagonals are not faster than straight lines.
    const length = Math.hypot(moveX, moveZ);
    const directionX = length === 0 ? 0 : moveX / length;
    const directionZ = length === 0 ? 0 : moveZ / length;

    for (const entity of entities) {
      const body = components.get(entity, "body");
      const { speed } = components.get(entity, "player");

      // Horizontal velocity comes from input; vertical stays with gravity.
      body.velocity.x = directionX * speed;
      body.velocity.z = directionZ * speed;
    }
  },
});

/** Steps the world, then hands the resulting positions to the transforms. */
const physicsSystem = ecs.createSystem({
  requiredComponents: ["transform", "body"],

  update({ entities, components, deltaTime }) {
    physicsWorld.step(deltaTime);

    for (const entity of entities) {
      const transform = components.get(entity, "transform");
      const body = components.get(entity, "body");
      transform.translation.copy(body.translation);
    }
  },
});

/** Copies each entity's transform component into its mesh and draws the frame. */
const meshes: Mesh[] = [];
const renderSystem = ecs.createSystem({
  requiredComponents: ["transform", "mesh"],

  update({ entities, components }) {
    meshes.length = 0;

    for (const entity of entities) {
      const transform = components.get(entity, "transform");
      const mesh = components.get(entity, "mesh");

      mesh.transform.translation.copy(transform.translation);
      mesh.transform.rotation.copy(transform.rotation);
      mesh.transform.scale.copy(transform.scale);

      meshes.push(mesh);
    }

    renderer.renderScene({ scene: meshes, camera });
  },
});

ecs.addSystem(playerMovementSystem);
ecs.addSystem(physicsSystem);
ecs.addSystem(renderSystem);

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

let previousTime = performance.now();

startAnimationLoop(() => {
  const currentTime = performance.now();
  // Clamped so a background tab does not produce a giant first step on return.
  const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.1);
  previousTime = currentTime;

  ecs.update(deltaTime);
});
