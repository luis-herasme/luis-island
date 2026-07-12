import { Transform3D, Vector3 } from "@game/math";
import type { Entity } from "@game/ecs";
import { context } from "../game-context";
import { spawnBox } from "./spawn-box";

const STAIR_STEP_COUNT = 4;
const STAIR_STEP_RISE = 0.4;

const FAN_X = 4;
const FAN_Z = 1;
const GROUND_TOP = -0.5;
const WIND_TOP = 4.5;
const WIND_FORCE = 25;
const PARTICLE_COUNT = 36;

/** The level, written as data: every entity is just description components. */
export function spawnWorld(): { player: Entity } {
  const { ecs } = context;

  // Ground slab; its top sits at y = -0.5, flush with the cubes' bottoms.
  spawnBox({ color: [0.2, 0.27, 0.33], position: [0, -0.6, 0], scale: [20, 0.2, 20], body: { type: "static" } });

  // Obstacles — static bodies the player collides with.
  spawnBox({ color: [0.55, 0.36, 0.68], position: [3, 0, -2], body: { type: "static" } });
  spawnBox({ color: [0.36, 0.55, 0.68], position: [-4, 0, 1], body: { type: "static" } });
  spawnBox({ color: [0.42, 0.68, 0.36], position: [2, 0, 3], body: { type: "static" } });

  // A staircase: rises of 0.4, below the player's 0.5 stepHeight, so it is
  // walkable — while its total height would block anything that cannot step.
  for (let stepIndex = 0; stepIndex < STAIR_STEP_COUNT; stepIndex++) {
    const shade = 0.45 + stepIndex * 0.08;
    spawnBox({
      color: [shade, shade, shade],
      position: [-1, -0.5 + STAIR_STEP_RISE * (stepIndex + 0.5), -3 - stepIndex],
      scale: [2, STAIR_STEP_RISE, 1],
      body: { type: "static" },
    });
  }

  // The fan: a pedestal, two crossed spinning blades, an invisible wind
  // region and the particle column that makes it visible.
  spawnBox({
    color: [0.25, 0.25, 0.28],
    position: [FAN_X, GROUND_TOP + 0.08, FAN_Z],
    scale: [1.6, 0.16, 1.6],
    body: { type: "static" },
  });

  for (const scale of [
    [1.3, 0.05, 0.16],
    [0.16, 0.05, 1.3],
  ] as [number, number, number][]) {
    const blade = spawnBox({
      color: [0.7, 0.72, 0.75],
      position: [FAN_X, GROUND_TOP + 0.22, FAN_Z],
      scale,
    });
    ecs.addComponent(blade, "spin", { speed: 6 });
  }

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

  {
    const emitterTransform = new Transform3D();
    emitterTransform.translation.set(FAN_X, GROUND_TOP, FAN_Z);

    const emitter = ecs.addEntity();
    ecs.addComponent(emitter, "transform", emitterTransform);
    ecs.addComponent(emitter, "particleEmitter", {
      textureUrl: "/whitePuff00.png",
      count: PARTICLE_COUNT,
      radius: 0.7,
      height: WIND_TOP - GROUND_TOP,
      minimumSpeed: 3.5,
      maximumSpeed: 6.5,
    });
  }

  // A textured OBJ model: suricato's chair, materialized by the render
  // system through the asset cache and pushable as a dynamic body. The model spans 175 x 235 x 137 of its own
  // units with its bounds centered at (0, 41.6, -0.4), so at CHAIR_SCALE it
  // is about 0.97 x 1.29 x 0.75 world units — the collider size — and the
  // mesh needs a small offset to line its bounds center up with the
  // collider's center.
  {
    const CHAIR_SCALE = 0.0055;
    const CHAIR_SIZE: [number, number, number] = [0.97, 1.29, 0.75];
    const CHAIR_MODEL_OFFSET: [number, number, number] = [0, -0.229, 0.002];

    const chairTransform = new Transform3D();
    chairTransform.translation.set(-5, GROUND_TOP + CHAIR_SIZE[1] / 2, -4);
    chairTransform.scale.set(CHAIR_SCALE, CHAIR_SCALE, CHAIR_SCALE);

    const chair = ecs.addEntity();
    ecs.addComponent(chair, "transform", chairTransform);
    ecs.addComponent(chair, "renderable", {
      geometry: { kind: "obj", url: "/chair.obj", offset: CHAIR_MODEL_OFFSET },
      material: { kind: "lit", textureUrl: "/chair.png" },
    });
    ecs.addComponent(chair, "physicsBody", {
      type: "dynamic",
      restitution: 0,
      // No contact friction yet: damping is what stops a pushed chair.
      damping: 2,
      stepHeight: 0,
      size: CHAIR_SIZE,
    });

  }

  // A Dominican peso: a generated coin OBJ (scripts/generate-peso-obj.mjs)
  // textured by an atlas with the front and back faces, hovering and
  // spinning like a pickup. No physics body — the player walks through it.
  {
    const COIN_SCALE = 0.6;
    const COIN_HOVER_HEIGHT = 0.55;

    const coinTransform = new Transform3D();
    coinTransform.translation.set(-2, GROUND_TOP + COIN_HOVER_HEIGHT, 4);
    coinTransform.scale.set(COIN_SCALE, COIN_SCALE, COIN_SCALE);

    const coin = ecs.addEntity();
    ecs.addComponent(coin, "transform", coinTransform);
    ecs.addComponent(coin, "renderable", {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "lit", textureUrl: "/peso.jpg" },
    });
    ecs.addComponent(coin, "spin", { speed: 2 });
  }

  // The player: dynamic, spawned above the ground so it falls in on load.
  // No `visual` — the avatar system renders it as an animated box figure
  // filling the unit-cube collider.
  const playerTransform = new Transform3D();
  playerTransform.translation.set(0, 3, 0);

  const player = ecs.addEntity();
  ecs.addComponent(player, "transform", playerTransform);
  ecs.addComponent(player, "physicsBody", { type: "dynamic", restitution: 0, damping: 0, stepHeight: 0.5 });
  ecs.addComponent(player, "player", { speed: 6, facing: new Vector3(0, 0, -1) });

  return { player };
}
