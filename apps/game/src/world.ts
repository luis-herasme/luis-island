import type { Components } from "./components";

/**
 * The level, as pure data: every entity is a JSON definition mapping
 * component names to component values. Nothing here is executable — the
 * whole array would survive JSON.stringify — so a level could equally be
 * loaded from a file or a server. main.ts spawns each entry on startup.
 *
 * The ground's top sits at y = -0.5; cubes resting on it have their centers
 * at y = 0.
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
      material: { kind: "lit", textureUrl: "/grass.png", textureScale: 10 },
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
      material: { kind: "lit", textureUrl: "/box.png" },
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
      material: { kind: "lit", textureUrl: "/box.png" },
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
      material: { kind: "lit", textureUrl: "/box.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The staircase up to the house: stone brick, rises of 0.2 — below the
  // player's 0.25 stepHeight, so it is walkable while its full height
  // blocks non-steppers. Eight steps climb to the house floor at y = 1.1.
  {
    transform: {
      translation: { x: -1, y: -0.4, z: -2.75 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: -0.2, z: -3.25 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0, z: -3.75 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.2, z: -4.25 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.4, z: -4.75 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.6, z: -5.25 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 0.8, z: -5.75 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: -1, y: 1.0, z: -6.25 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2, y: 0.2, z: 0.5 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_stone_brick.png", textureScale: [4, 1] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The house behind the stairs: a wooden cabin raised on four bark
  // pillars, entered only through the door at the top of the staircase.
  // Its floor top sits at y = 1.1, flush with the last step.
  {
    // Floor
    transform: {
      translation: { x: -1, y: 1.0, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 6, y: 0.2, z: 3 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 3 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Back wall
    transform: {
      translation: { x: -1, y: 2.1, z: -9.4 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 6, y: 2, z: 0.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 2 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Left wall
    transform: {
      translation: { x: -3.9, y: 2.1, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.2, y: 2, z: 3 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 2 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Right wall
    transform: {
      translation: { x: 1.9, y: 2.1, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.2, y: 2, z: 3 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 2 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Front wall, left of the door
    transform: {
      translation: { x: -2.8, y: 2.1, z: -6.6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2.4, y: 2, z: 0.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 2 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Front wall, right of the door
    transform: {
      translation: { x: 0.8, y: 2.1, z: -6.6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 2.4, y: 2, z: 0.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 2 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Door lintel
    transform: {
      translation: { x: -1, y: 2.75, z: -6.6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.2, y: 0.7, z: 0.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Roof, with a small overhang
    transform: {
      translation: { x: -1, y: 3.2, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 6.4, y: 0.2, z: 3.4 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png", textureScale: 3 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Stilt pillar, front-left
    transform: {
      translation: { x: -3.8, y: 0.3, z: -6.7 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.35, y: 1.6, z: 0.35 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_tree.png" },
    },
  },
  {
    // Stilt pillar, front-right
    transform: {
      translation: { x: 1.8, y: 0.3, z: -6.7 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.35, y: 1.6, z: 0.35 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_tree.png" },
    },
  },
  {
    // Stilt pillar, back-left
    transform: {
      translation: { x: -3.8, y: 0.3, z: -9.3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.35, y: 1.6, z: 0.35 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_tree.png" },
    },
  },
  {
    // Stilt pillar, back-right
    transform: {
      translation: { x: 1.8, y: 0.3, z: -9.3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.35, y: 1.6, z: 0.35 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_tree.png" },
    },
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
    soundEmitter: { sound: "fanHum", volume: 0.4, range: 9 },
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

  // The way to the discotheque: ride the fan's wind column up to the first
  // wool platform, then jump platform to platform, each a little higher.
  {
    transform: {
      translation: { x: 6, y: 2.3, z: 2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.6, y: 0.2, z: 1.6 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/wool_cyan.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: 7.5, y: 2.8, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.4, y: 0.2, z: 1.4 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/wool_yellow.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: 6.5, y: 3.3, z: -2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.4, y: 0.2, z: 1.4 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/wool_green.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    transform: {
      translation: { x: 7, y: 3.75, z: -4.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.4, y: 0.2, z: 1.4 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/wool_magenta.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },

  // The discotheque: an obsidian dance floor hanging over the north-east
  // shore,
  // glowing meselamp tiles inlaid (visual only — too thin to collide),
  // bark-and-wood tables with wool chairs, and the jukebox as the resident
  // band.
  {
    // Dance floor
    transform: {
      translation: { x: 7, y: 3.9, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 9, y: 0.3, z: 7 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_obsidian.png", textureScale: [6, 4] },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Glow tile
    transform: {
      translation: { x: 5.5, y: 4.065, z: -6.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.2, y: 0.02, z: 1.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "basic", textureUrl: "/minetest_textures/default_meselamp.png" },
    },
  },
  {
    // Glow tile
    transform: {
      translation: { x: 8.5, y: 4.065, z: -6.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.2, y: 0.02, z: 1.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "basic", textureUrl: "/minetest_textures/default_meselamp.png" },
    },
  },
  {
    // Glow tile
    transform: {
      translation: { x: 7, y: 4.065, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.6, y: 0.02, z: 1.6 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "basic", textureUrl: "/minetest_textures/default_meselamp.png" },
    },
  },
  {
    // Glow tile
    transform: {
      translation: { x: 5.5, y: 4.065, z: -9.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.2, y: 0.02, z: 1.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "basic", textureUrl: "/minetest_textures/default_meselamp.png" },
    },
  },
  {
    // Glow tile
    transform: {
      translation: { x: 8.5, y: 4.065, z: -9.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.2, y: 0.02, z: 1.2 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "basic", textureUrl: "/minetest_textures/default_meselamp.png" },
    },
  },
  {
    // Table leg, north table
    transform: {
      translation: { x: 4.8, y: 4.35, z: -6.8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.25, y: 0.6, z: 0.25 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_tree.png" },
    },
  },
  {
    // Table top, north table
    transform: {
      translation: { x: 4.8, y: 4.7, z: -6.8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.1, y: 0.1, z: 1.1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Table leg, south table
    transform: {
      translation: { x: 4.8, y: 4.35, z: -9.2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.25, y: 0.6, z: 0.25 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_tree.png" },
    },
  },
  {
    // Table top, south table
    transform: {
      translation: { x: 4.8, y: 4.7, z: -9.2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1.1, y: 0.1, z: 1.1 },
    },
    renderable: {
      geometry: { kind: "box" },
      material: { kind: "lit", textureUrl: "/minetest_textures/default_wood.png" },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
  },
  {
    // Chair — the armchair model, facing its table, pushable
    transform: {
      translation: { x: 3.7, y: 4.695, z: -6.8 },
      rotation: { x: 0, y: 0.7071068, z: 0, w: 0.7071068 },
      scale: { x: 0.0055, y: 0.0055, z: 0.0055 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/chair.obj", offset: { x: 0, y: -0.229, z: 0.002 } },
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
  {
    // Chair — the armchair model, facing its table, pushable
    transform: {
      translation: { x: 5.9, y: 4.695, z: -6.8 },
      rotation: { x: 0, y: -0.7071068, z: 0, w: 0.7071068 },
      scale: { x: 0.0055, y: 0.0055, z: 0.0055 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/chair.obj", offset: { x: 0, y: -0.229, z: 0.002 } },
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
  {
    // Chair — the armchair model, facing its table, pushable
    transform: {
      translation: { x: 3.7, y: 4.695, z: -9.2 },
      rotation: { x: 0, y: 0.7071068, z: 0, w: 0.7071068 },
      scale: { x: 0.0055, y: 0.0055, z: 0.0055 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/chair.obj", offset: { x: 0, y: -0.229, z: 0.002 } },
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
  {
    // Chair — the armchair model, facing its table, pushable
    transform: {
      translation: { x: 5.9, y: 4.695, z: -9.2 },
      rotation: { x: 0, y: -0.7071068, z: 0, w: 0.7071068 },
      scale: { x: 0.0055, y: 0.0055, z: 0.0055 },
    },
    renderable: {
      geometry: { kind: "obj", url: "/chair.obj", offset: { x: 0, y: -0.229, z: 0.002 } },
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

  // The jukebox, resident band of the discotheque: come close and its
  // label offers a song for coins. No renderable — its system draws the
  // pixel-art sprite.
  {
    transform: {
      translation: { x: 9.5, y: 4.8, z: -8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.9, y: 1.5, z: 0.7 },
    },
    physicsBody: { type: "static", restitution: 0, damping: 0, stepHeight: 0 },
    jukebox: { songCost: 3, textureUrl: "/juke-box.png", songUrl: "/cristopher.mpeg" },
    label: { text: "", offsetY: 1.2 },
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
      stepHeight: 0.25,
    },
    player: { speed: 6, facing: { x: 0, y: 0, z: -1 } },
    label: { text: "Luis", offsetY: 0.95 },
  },
];
