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
import { AXIS_Y, Matrix4x4, Quaternion, Transform3D, Vector3 } from "@game/math";
import { DynamicBody, PhysicsWorld, StaticBody } from "@game/physics";
import type { RigidBody } from "@game/physics";
import {
  BufferUsage,
  Data,
  GEOMETRY_BOX,
  Geometry,
  IndexBuffer,
  Material,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Uniform,
  VertexBuffer,
  VertexData,
  startAnimationLoop,
} from "@game/render";

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
  /**
   * A box region (centered on the transform) that pushes dynamic bodies.
   * The force is strongest at the region's base and decays linearly to
   * zero at its top, like the airflow of a fan.
   */
  windZone: { size: Vector3; force: Vector3 };
  /** Purely visual rotation around the Y axis, radians per second. */
  spin: { speed: number };
  /** Rising streaks that make a wind zone visible. */
  windStreaks: { offsets: Vector3[]; speeds: number[]; bottom: number; top: number };
};

const ecs = new ECS<Components>();
const keyboard = new Keyboard();
const physicsWorld = new PhysicsWorld();

type SpawnBoxOptions = {
  color: [number, number, number];
  position: [number, number, number];
  scale?: [number, number, number];
  /** "none" spawns a purely visual box with no physics body. */
  bodyType?: "dynamic" | "static" | "none";
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

  const entity = ecs.addEntity();
  ecs.addComponent(entity, "transform", transform);
  ecs.addComponent(entity, "mesh", new Mesh({ geometry: GEOMETRY_BOX.copy(), material }));

  if (options.bodyType !== "none") {
    // The mesh is a unit box scaled by the transform, so the body size is
    // exactly the scale.
    const size = transform.scale.clone();
    const translation = new Vector3(...options.position);

    const body: RigidBody =
      options.bodyType === "dynamic"
        ? new DynamicBody({
            size,
            translation,
            velocity: new Vector3(),
            mass: 1,
            restitution: options.restitution ?? 0,
            damping: options.damping ?? 0,
            stepHeight: options.stepHeight ?? 0,
          })
        : new StaticBody({ size, translation, restitution: options.restitution ?? 0 });
    physicsWorld.addBody(body);
    ecs.addComponent(entity, "body", body);
  }

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

// ---------------------------------------------------------------------------
// The fan: a wind zone that pushes bodies upward, made visible by a spinning
// blade cross on a pedestal and rising streak particles.
// ---------------------------------------------------------------------------

const FAN_X = 4;
const FAN_Z = 1;
const GROUND_TOP = -0.5;
const WIND_TOP = 4.5;
const WIND_FORCE = 25;
const STREAK_COUNT = 36;

// Pedestal: a steppable static box the blades sit on.
spawnBox({ color: [0.25, 0.25, 0.28], position: [FAN_X, GROUND_TOP + 0.08, FAN_Z], scale: [1.6, 0.16, 1.6] });

// Blades: two crossed visual-only boxes sharing the same spin, so the cross
// stays a cross while it rotates.
for (const scale of [
  [1.3, 0.05, 0.16],
  [0.16, 0.05, 1.3],
] as [number, number, number][]) {
  const blade = spawnBox({
    color: [0.7, 0.72, 0.75],
    position: [FAN_X, GROUND_TOP + 0.22, FAN_Z],
    scale,
    bodyType: "none",
  });
  ecs.addComponent(blade, "spin", { speed: 6 });
}

// The wind region itself: invisible, centered over the fan.
{
  const zoneTransform = new Transform3D();
  zoneTransform.translation.set(FAN_X, (GROUND_TOP + WIND_TOP) / 2, FAN_Z);

  const zone = ecs.addEntity();
  ecs.addComponent(zone, "transform", zoneTransform);
  ecs.addComponent(zone, "windZone", {
    size: new Vector3(1.8, WIND_TOP - GROUND_TOP, 1.8),
    force: new Vector3(0, WIND_FORCE, 0),
  });
}

const STREAK_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 offset;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

void main() {
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position + offset, 1.0);
}`;

const STREAK_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

out vec4 fragment_color;

void main() {
  fragment_color = vec4(0.78, 0.88, 0.98, 1.0);
}`;

/** A thin upright cross (two perpendicular quads) per streak, instanced. */
function createWindStreaksMesh(offsets: Vector3[]): Mesh {
  const halfWidth = 0.035;
  const halfHeight = 0.28;

  // prettier-ignore
  const positions: [number, number, number][] = [
    // Quad in the XY plane
    [-halfWidth, -halfHeight, 0], [halfWidth, -halfHeight, 0], [halfWidth, halfHeight, 0], [-halfWidth, halfHeight, 0],
    // Quad in the ZY plane
    [0, -halfHeight, -halfWidth], [0, -halfHeight, halfWidth], [0, halfHeight, halfWidth], [0, halfHeight, -halfWidth],
  ];

  // prettier-ignore
  const indices = [
    0, 1, 2, 2, 3, 0,
    4, 5, 6, 6, 7, 4,
  ];

  const geometry = new Geometry({
    vertexCount: positions.length,
    instanceCount: offsets.length,
    indices: IndexBuffer.fromUint8(indices),
    vertexBuffers: [
      new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(positions) }) }),
      new VertexBuffer({
        vertexData: new VertexData({
          name: "offset",
          data: Data.vector3(offsets.map((offset) => [offset.x, offset.y, offset.z])),
          divisor: 1,
        }),
        usage: BufferUsage.DynamicDraw,
      }),
    ],
  });

  return new Mesh({
    geometry,
    material: new Material({
      vertexShaderSource: STREAK_VERTEX_SHADER_SOURCE,
      fragmentShaderSource: STREAK_FRAGMENT_SHADER_SOURCE,
    }),
  });
}

// The streaks: one instanced mesh, one thin upright cross per particle, all
// moved by rewriting the per-instance offset attribute each frame.
{
  const offsets: Vector3[] = [];
  const speeds: number[] = [];
  for (let streakIndex = 0; streakIndex < STREAK_COUNT; streakIndex++) {
    offsets.push(
      new Vector3(
        FAN_X + (Math.random() - 0.5) * 1.4,
        GROUND_TOP + Math.random() * (WIND_TOP - GROUND_TOP),
        FAN_Z + (Math.random() - 0.5) * 1.4,
      ),
    );
    speeds.push(3.5 + Math.random() * 3);
  }

  const streaks = ecs.addEntity();
  const streakTransform = new Transform3D();
  ecs.addComponent(streaks, "transform", streakTransform);
  ecs.addComponent(streaks, "mesh", createWindStreaksMesh(offsets));
  ecs.addComponent(streaks, "windStreaks", { offsets, speeds, bottom: GROUND_TOP, top: WIND_TOP });
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
const THROW_HORIZONTAL_IMPULSE = 9;
const THROW_UPWARD_IMPULSE = 5.5;

function throwBox(from: Vector3, facing: Vector3) {
  const color = THROW_COLORS[Math.floor(Math.random() * THROW_COLORS.length)]!;

  const entity = spawnBox({
    color,
    position: [from.x + facing.x * 1.2, from.y + 0.3, from.z + facing.z * 1.2],
    scale: [0.4, 0.4, 0.4],
    bodyType: "dynamic",
    restitution: 0.4,
    // There is no contact friction yet, so damping is what makes a landed
    // box skid to a stop instead of sliding off the world.
    damping: 1.5,
  });

  // The actual throw: one kick, and gravity draws the parabola.
  const body = ecs.get(entity, "body");
  if (body?.type === "dynamic") {
    body.applyImpulse(
      new Vector3(facing.x * THROW_HORIZONTAL_IMPULSE, THROW_UPWARD_IMPULSE, facing.z * THROW_HORIZONTAL_IMPULSE),
    );
  }
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
      if (body.type !== "dynamic") continue;

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

/**
 * Wind zones push every dynamic body inside them, each frame. The push
 * fades with height — full force at the base, none at the top — so bodies
 * hover around the height where the wind balances gravity instead of being
 * launched out of the column.
 */
const scaledWindForce = new Vector3();
const windSystem = ecs.createSystem({
  requiredComponents: ["transform", "windZone"],

  update({ entities, components }) {
    for (const entity of entities) {
      const zoneCenter = components.get(entity, "transform").translation;
      const { size, force } = components.get(entity, "windZone");

      for (const body of physicsWorld.bodies) {
        if (body.type !== "dynamic") continue;

        const inside =
          Math.abs(body.translation.x - zoneCenter.x) <= size.x * 0.5 &&
          Math.abs(body.translation.y - zoneCenter.y) <= size.y * 0.5 &&
          Math.abs(body.translation.z - zoneCenter.z) <= size.z * 0.5;
        if (!inside) continue;

        const zoneBottom = zoneCenter.y - size.y * 0.5;
        const normalizedHeight = (body.translation.y - zoneBottom) / size.y;
        const strength = 1 - normalizedHeight;

        scaledWindForce.copy(force).multiplyScalar(strength);
        body.applyForce(scaledWindForce);
      }
    }
  },
});

/** Purely visual rotation — the fan blades. */
const spinQuaternion = new Quaternion();
const spinSystem = ecs.createSystem({
  requiredComponents: ["transform", "spin"],

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const transform = components.get(entity, "transform");
      const { speed } = components.get(entity, "spin");
      spinQuaternion.setFromAxisAngle(AXIS_Y, speed * deltaTime);
      transform.rotation.multiply(spinQuaternion);
    }
  },
});

/** Raises each streak and wraps it back to the base of its column. */
const streakSystem = ecs.createSystem({
  requiredComponents: ["mesh", "windStreaks"],

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const mesh = components.get(entity, "mesh");
      const { offsets, speeds, bottom, top } = components.get(entity, "windStreaks");

      const offsetBuffer = mesh.geometry.getVertexBuffer("offset");
      if (!offsetBuffer) continue;

      for (let streakIndex = 0; streakIndex < offsets.length; streakIndex++) {
        const offset = offsets[streakIndex]!;
        offset.y += speeds[streakIndex]! * deltaTime;
        if (offset.y > top) offset.y = bottom;

        offsetBuffer.setVertex(streakIndex, [offset.x, offset.y, offset.z]);
      }
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
ecs.addSystem(windSystem);
ecs.addSystem(spinSystem);
ecs.addSystem(streakSystem);
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
