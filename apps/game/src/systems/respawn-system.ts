import { context } from "../game-context";

/**
 * Below this height the player is under water (or fell off the island —
 * every way out of bounds ends in falling past it).
 */
const KILL_PLANE_Y = -1.5;

/** Where the world data spawns the player. */
const RESPAWN_POSITION = { x: 0, y: 3, z: 0 };

/** Falling into the water or off the island puts the player back at spawn. */
export const respawnSystem = context.ecs.createSystem({
  requiredComponents: ["physicsBody", "player"],

  update({ entities }) {
    for (const entity of entities) {
      const body = context.bodies.get(entity);
      if (!body || body.translation.y > KILL_PLANE_Y) continue;

      body.translation.set(RESPAWN_POSITION.x, RESPAWN_POSITION.y, RESPAWN_POSITION.z);
      if (body.type === "dynamic") body.velocity.set(0, 0, 0);
    }
  },
});
