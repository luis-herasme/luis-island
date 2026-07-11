/**
 * The first demo wiring the packages together: the ECS owns the world, the
 * renderer draws it, @game/math carries the transforms, @game/input feeds a
 * movement system and @game/physics makes it all solid.
 *
 * Drive the orange cube with WASD or the arrows — it falls onto the ground
 * when the page loads, the obstacle boxes block its way, and the staircase
 * is walkable thanks to the body's stepHeight. Space throws a small box in
 * the direction you last moved, arcing under gravity.
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
  /** facing is the last movement direction — where thrown boxes go. */
  player: { speed: number; facing: Vector3 };
};

const ecs = new ECS<Components>();
const keyboard = new Keyboard();
const physicsWorld = new PhysicsWorld();

type SpawnBoxOptions = {
  color: [number, number, number];
  position: [number, number, number];
  scale?: [number, number, number];
  bodyType?: "dynamic" | "static";
  velocity?: [number, number, number];
  restitution?: number;
  damping?: number;
  stepHeight?: number;
};

function spawnBox(options: SpawnBoxOptions) {
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
    velocity: options.velocity ? new Vector3(...options.velocity) : undefined,
    restitution: options.restitution,
    damping: options.damping,
    stepHeight: options.stepHeight,
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

// A staircase: rises of 0.4, below the player's 0.5 stepHeight, so it is
// walkable — while its total height would block anything that cannot step.
const STAIR_STEP_COUNT = 4;
const STAIR_STEP_RISE = 0.4;
for (let stepIndex = 0; stepIndex < STAIR_STEP_COUNT; stepIndex++) {
  const shade = 0.45 + stepIndex * 0.08;
  spawnBox({
    color: [shade, shade, shade],
    position: [-1, -0.5 + STAIR_STEP_RISE * (stepIndex + 0.5), -3 - stepIndex],
    scale: [2, STAIR_STEP_RISE, 1],
  });
}

// The player: dynamic, spawned above the ground so it falls in on load.
const player = spawnBox({
  color: [1, 0.53, 0.27],
  position: [0, 3, 0],
  bodyType: "dynamic",
  stepHeight: 0.5,
});
ecs.addComponent(player, "player", { speed: 6, facing: new Vector3(0, 0, -1) });

// Thrown boxes arc toward where the player last moved.
const THROW_COLORS: [number, number, number][] = [
  [0.95, 0.77, 0.06],
  [0.9, 0.49, 0.13],
  [0.61, 0.35, 0.71],
  [0.2, 0.6, 0.86],
  [0.9, 0.3, 0.24],
  [0.15, 0.68, 0.38],
];
const THROW_HORIZONTAL_SPEED = 9;
const THROW_UPWARD_SPEED = 5.5;

function throwBox(from: Vector3, facing: Vector3) {
  const color = THROW_COLORS[Math.floor(Math.random() * THROW_COLORS.length)]!;

  spawnBox({
    color,
    position: [from.x + facing.x * 1.2, from.y + 0.3, from.z + facing.z * 1.2],
    scale: [0.4, 0.4, 0.4],
    bodyType: "dynamic",
    restitution: 0.4,
    // There is no contact friction yet, so damping is what makes a landed
    // box skid to a stop instead of sliding off the world.
    damping: 1.5,
    velocity: [facing.x * THROW_HORIZONTAL_SPEED, THROW_UPWARD_SPEED, facing.z * THROW_HORIZONTAL_SPEED],
  });
}

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
      const player = components.get(entity, "player");

      // Horizontal velocity comes from input; vertical stays with gravity.
      body.velocity.x = directionX * player.speed;
      body.velocity.z = directionZ * player.speed;

      if (length > 0) player.facing.set(directionX, 0, directionZ);
    }
  },
});

/** Space throws a box in the facing direction, arcing under gravity. */
let throwKeyWasPressed = false;
const throwSystem = ecs.createSystem({
  requiredComponents: ["body", "player"],

  update({ entities, components }) {
    const throwKeyIsPressed = keyboard.isPressed("Space");
    const shouldThrow = throwKeyIsPressed && !throwKeyWasPressed;
    throwKeyWasPressed = throwKeyIsPressed;
    if (!shouldThrow) return;

    for (const entity of entities) {
      const body = components.get(entity, "body");
      const { facing } = components.get(entity, "player");
      throwBox(body.translation, facing);
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
ecs.addSystem(throwSystem);
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
