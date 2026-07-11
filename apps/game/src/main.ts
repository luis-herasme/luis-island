/**
 * The first demo wiring the packages together: the ECS owns the world, the
 * renderer draws it, @game/math carries the transforms, and @game/input
 * feeds a movement system. Drive the orange cube with WASD or the arrows.
 *
 * The boxes standing around are inert for now — they become interesting once
 * the collision system exists.
 */
import { ECS } from "@game/ecs";
import { Keyboard } from "@game/input";
import { Matrix4x4, Transform3D, Vector3 } from "@game/math";
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

const camera = PerspectiveCamera.withWindowAspect();
camera.transform.translation.set(0, 9, 12);
camera.transform.rotation.setFromRotationMatrix(
  new Matrix4x4().targetTo(camera.transform.translation, new Vector3(0, 0, 0), new Vector3(0, 1, 0)),
);

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

type Components = {
  /** Source of truth for where an entity is; the render system copies it into the mesh. */
  transform: Transform3D;
  mesh: Mesh;
  player: { speed: number };
};

const ecs = new ECS<Components>();
const keyboard = new Keyboard();

function spawnBox(options: {
  color: [number, number, number];
  position: [number, number, number];
  scale?: [number, number, number];
}) {
  const material = new Material({
    vertexShaderSource: VERTEX_SHADER_SOURCE,
    fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
  });
  material.setUniform("base_color", Uniform.vector3(options.color));

  const transform = new Transform3D();
  transform.translation.set(...options.position);
  if (options.scale) transform.scale.set(...options.scale);

  const entity = ecs.addEntity();
  ecs.addComponent(entity, "transform", transform);
  ecs.addComponent(entity, "mesh", new Mesh({ geometry: GEOMETRY_BOX.copy(), material }));
  return entity;
}

// Ground slab; its top sits at y = -0.5, flush with the cubes' bottoms.
spawnBox({ color: [0.2, 0.27, 0.33], position: [0, -0.6, 0], scale: [20, 0.2, 20] });

// Obstacles — inert until the collision system exists.
spawnBox({ color: [0.55, 0.36, 0.68], position: [3, 0, -2] });
spawnBox({ color: [0.36, 0.55, 0.68], position: [-4, 0, 1] });
spawnBox({ color: [0.42, 0.68, 0.36], position: [2, 0, 3] });

// The player.
const player = spawnBox({ color: [1, 0.53, 0.27], position: [0, 0, 0] });
ecs.addComponent(player, "player", { speed: 6 });

// ---------------------------------------------------------------------------
// Systems, in frame order: input → (someday: physics) → render
// ---------------------------------------------------------------------------

const playerMovementSystem = ecs.createSystem({
  requiredComponents: ["transform", "player"],

  update({ entities, components, deltaTime }) {
    // W/up is -Z: away from the camera, which looks down the -Z axis.
    const moveX = keyboard.axis({ negative: "KeyA", positive: "KeyD" }) + keyboard.axis({ negative: "ArrowLeft", positive: "ArrowRight" });
    const moveZ = keyboard.axis({ negative: "KeyW", positive: "KeyS" }) + keyboard.axis({ negative: "ArrowUp", positive: "ArrowDown" });

    // Normalize so diagonals are not faster than straight lines.
    const length = Math.hypot(moveX, moveZ);
    if (length === 0) return;

    const directionX = moveX / length;
    const directionZ = moveZ / length;

    for (const entity of entities) {
      const transform = components.get(entity, "transform");
      const { speed } = components.get(entity, "player");
      transform.translation.x += directionX * speed * deltaTime;
      transform.translation.z += directionZ * speed * deltaTime;
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
