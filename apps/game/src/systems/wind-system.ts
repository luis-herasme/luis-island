import { Vector3 } from "@game/math";
import type { GameContext } from "../game-context";

/**
 * Wind zones push every dynamic body inside them, each frame. The push
 * fades with height — full force at the base, none at the top — so bodies
 * hover around the height where the wind balances gravity instead of being
 * launched out of the column.
 */
export function createWindSystem(context: GameContext) {
  const scaledWindForce = new Vector3();

  return context.ecs.createSystem({
    requiredComponents: ["transform", "windZone"],

    update({ entities, components }) {
      for (const entity of entities) {
        const zoneCenter = components.get(entity, "transform").translation;
        const { size, force } = components.get(entity, "windZone");

        for (const body of context.physicsWorld.bodies) {
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
}
