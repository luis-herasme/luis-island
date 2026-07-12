import { context } from "../game-context";
import { setCoinCount } from "../hud";
import { playCoinSound } from "../sounds";

/** How close the player's center must be to a coin's center to collect it. */
const COLLECT_DISTANCE = 0.8;

/**
 * Collects coins: when the player comes within reach of a `coin` entity,
 * the entity is destroyed — every owning system releases its resources
 * through onEntityRemoved, so the coin simply vanishes from the world.
 */
export const coinSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "coin"],

  update({ entities, components }) {
    const { ecs, playerEntity } = context;
    if (playerEntity === null) return;

    const playerTransform = ecs.get(playerEntity, "transform");
    if (!playerTransform) return;
    const player = playerTransform.translation;

    for (const entity of entities) {
      const coin = components.get(entity, "transform").translation;
      const distance = Math.hypot(coin.x - player.x, coin.y - player.y, coin.z - player.z);
      if (distance > COLLECT_DISTANCE) continue;

      context.coins += components.get(entity, "coin").value;
      ecs.destroyEntity(entity);
      setCoinCount(context.coins);
      playCoinSound();
    }
  },
});
