import type { Components } from "./components";

/**
 * The level, as pure data: every entity is a JSON definition mapping
 * component names to component values. Nothing here is executable — the
 * whole array would survive JSON.stringify — so a level could equally be
 * loaded from a file or a server. main.ts spawns each entry on startup.
 *
 * The ground's top sits at y = -0.5; cubes resting on it have their centers
 * at y = 0. The staircase rises 0.4 per step — below the player's 0.5
 * stepHeight, so it is walkable while its full height blocks non-steppers.
 */
export const WORLD_ENTITIES: Partial<Components>[] = [
  // The island: a thick slab whose top sits at y = -0.5 and whose cliffs
  // reach below the waterline.
  {
    transform: {
      translation: { x: 0, y: -1.25, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 20, y: 1.5, z: 20 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.24, 0.33, 0.28] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The sea around the island, stretching to the horizon.
  {
    transform: {
      translation: { x: 0, y: -1, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 600, y: 1, z: 600 },
    },
    water: {},
  },

  // Obstacles — static bodies the player collides with.
  {
    transform: {
      translation: { x: 3, y: 0, z: -2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.55, 0.36, 0.68] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -4, y: 0, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.36, 0.55, 0.68] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: 2, y: 0, z: 3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.42, 0.68, 0.36] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The staircase, lightening as it rises.
  {
    transform: {
      translation: { x: -1, y: -0.3, z: -3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.4, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.45, 0.45, 0.45] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.1, z: -4 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.4, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.53, 0.53, 0.53] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.5, z: -5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.4, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.61, 0.61, 0.61] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.9, z: -6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.4, z: 1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.69, 0.69, 0.69] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The fan: a pedestal, two crossed spinning blades, an invisible wind
  // region and the particle column that makes it visible.
  {
    transform: {
      translation: { x: 4, y: -0.42, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.6, y: 0.16, z: 1.6 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.25, 0.25, 0.28] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: 4, y: -0.28, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.3, y: 0.05, z: 0.16 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.7, 0.72, 0.75] },
    },
    spin: { speed: 6 },
  },
  {
    transform: {
      translation: { x: 4, y: -0.28, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.16, y: 0.05, z: 1.3 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", color: [0.7, 0.72, 0.75] },
    },
    spin: { speed: 6 },
  },
  {
    transform: {
      translation: { x: 4, y: 2, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    windZone: { size: { x: 1.8, y: 5, z: 1.8 }, force: { x: 0, y: 25, z: 0 } },
  },
  {
    transform: {
      translation: { x: 4, y: -0.5, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    particleEmitter: {
      textureUrl: "/whitePuff00.png",
      count: 36,
      radius: 0.7,
      height: 5,
      minimumSpeed: 3.5,
      maximumSpeed: 6.5,
    },
  },

  // suricato's chair: a textured OBJ model, pushable as a dynamic body.
  // The model spans 175 x 235 x 137 of its own units with its bounds
  // centered at (0, 41.6, -0.4), so at this scale it is about
  // 0.97 x 1.29 x 0.75 world units — the collider size — and the mesh
  // offset lines its bounds center up with the collider's center.
  {
    transform: {
      translation: { x: -5, y: 0.145, z: -4 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.0055, y: 0.0055, z: 0.0055 },
    },
    renderable: {
      geometry: {
        kind: "obj",
        url: "/chair.obj",
        offset: { x: 0, y: -0.229, z: 0.002 },
      },
      material: { kind: "lit", textureUrl: "/chair.png" },
    },
    physicsBody: {
      type: "dynamic",
      restitution: 0,
      damping: 2,
      stepHeight: 0,
      size: { x: 0.97, y: 1.29, z: 0.75 },
    },
  },

  // Collectible pesos: six on the floor, one on top of the staircase, one
  // high in the wind column — stairs, jumping and the fan all have a reward.
  {
    transform: {
      translation: { x: -2, y: 0.05, z: 4 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: 6, y: 0.05, z: 4 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: -7, y: 0.05, z: -1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: 7, y: 0.05, z: -5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: 0, y: 0.05, z: 6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: -4, y: 0.05, z: -7 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: -1, y: 1.65, z: -6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: {
      translation: { x: 4, y: 3, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/peso.obj" },
      material: { kind: "basic", textureUrl: "/peso.jpg" },
    },
    spin: { speed: 2 },
    coin: { value: 1 },
  },

  // The player: dynamic, spawned above the ground so it falls in on load.
  // No renderable — the avatar system draws it as an animated box figure.
  {
    transform: {
      translation: { x: 0, y: 3, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    physicsBody: {
      type: "dynamic",
      restitution: 0,
      damping: 0,
      stepHeight: 0.5,
    },
    player: { speed: 6, facing: { x: 0, y: 0, z: -1 } },
  },
];
