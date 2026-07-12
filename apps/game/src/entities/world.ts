import type { Components } from "../components";

/**
 * The level, as pure data: every entity is a JSON definition mapping
 * component names to component values. Nothing here is executable — the
 * whole array would survive JSON.stringify — so a level could equally be
 * loaded from a file or a server. spawnWorld instantiates it.
 *
 * The ground's top sits at y = -0.5; cubes resting on it have their centers
 * at y = 0. The staircase rises 0.4 per step — below the player's 0.5
 * stepHeight, so it is walkable while its full height blocks non-steppers.
 */
export const WORLD_ENTITIES: Partial<Components>[] = [
  // The ground slab.
  {
    transform: { translation: [0, -0.6, 0], rotation: [0, 0, 0, 1], scale: [20, 0.2, 20] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.2, 0.27, 0.33] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // Obstacles — static bodies the player collides with.
  {
    transform: { translation: [3, 0, -2], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.55, 0.36, 0.68] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: { translation: [-4, 0, 1], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.36, 0.55, 0.68] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: { translation: [2, 0, 3], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.42, 0.68, 0.36] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The staircase, lightening as it rises.
  {
    transform: { translation: [-1, -0.3, -3], rotation: [0, 0, 0, 1], scale: [2, 0.4, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.45, 0.45, 0.45] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: { translation: [-1, 0.1, -4], rotation: [0, 0, 0, 1], scale: [2, 0.4, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.53, 0.53, 0.53] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: { translation: [-1, 0.5, -5], rotation: [0, 0, 0, 1], scale: [2, 0.4, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.61, 0.61, 0.61] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: { translation: [-1, 0.9, -6], rotation: [0, 0, 0, 1], scale: [2, 0.4, 1] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.69, 0.69, 0.69] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The fan: a pedestal, two crossed spinning blades, an invisible wind
  // region and the particle column that makes it visible.
  {
    transform: { translation: [4, -0.42, 1], rotation: [0, 0, 0, 1], scale: [1.6, 0.16, 1.6] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.25, 0.25, 0.28] } },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: { translation: [4, -0.28, 1], rotation: [0, 0, 0, 1], scale: [1.3, 0.05, 0.16] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.7, 0.72, 0.75] } },
    spin: { speed: 6 },
  },
  {
    transform: { translation: [4, -0.28, 1], rotation: [0, 0, 0, 1], scale: [0.16, 0.05, 1.3] },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color: [0.7, 0.72, 0.75] } },
    spin: { speed: 6 },
  },
  {
    transform: { translation: [4, 2, 1], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    windZone: { size: [1.8, 5, 1.8], force: [0, 25, 0] },
  },
  {
    transform: { translation: [4, -0.5, 1], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
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
    transform: { translation: [-5, 0.145, -4], rotation: [0, 0, 0, 1], scale: [0.0055, 0.0055, 0.0055] },
    renderable: {
      geometry: { kind: "obj", url: "/chair.obj", offset: [0, -0.229, 0.002] },
      material: { kind: "lit", textureUrl: "/chair.png" },
    },
    physicsBody: { type: "dynamic", restitution: 0, damping: 2, stepHeight: 0, size: [0.97, 1.29, 0.75] },
  },

  // Collectible pesos: six on the floor, one on top of the staircase, one
  // high in the wind column — stairs, jumping and the fan all have a reward.
  {
    transform: { translation: [-2, 0.05, 4], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [6, 0.05, 4], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [-7, 0.05, -1], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [7, 0.05, -5], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [0, 0.05, 6], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [-4, 0.05, -7], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [-1, 1.65, -6], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },
  {
    transform: { translation: [4, 3, 1], rotation: [0, 0, 0, 1], scale: [0.6, 0.6, 0.6] },
    renderable: { geometry: { kind: "obj", url: "/peso.obj" }, material: { kind: "basic", textureUrl: "/peso.jpg" } },
    spin: { speed: 2 },
    coin: { value: 1 },
  },

  // The player: dynamic, spawned above the ground so it falls in on load.
  // No renderable — the avatar system draws it as an animated box figure.
  {
    transform: { translation: [0, 3, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    physicsBody: { type: "dynamic", restitution: 0, damping: 0, stepHeight: 0.5 },
    player: { speed: 6, facing: [0, 0, -1] },
  },
];
