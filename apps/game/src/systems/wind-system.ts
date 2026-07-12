import { Vector3 } from "@game/math";
import { context } from "../game-context";

const scaledWindForce = new Vector3();

/**
 * Wind zones push every dynamic body inside them, each frame. The push
 * fades with height — full force at the base, none at the top — so bodies
 * hover around the height where the wind balances gravity instead of being
 * launched out of the column.
 */
export const windSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "windZone"],

  update({ entities, components }) {
    for (const entity of entities) {
      const zoneCenter = components.get(entity, "transform").translation;
      const { size, force } = components.get(entity, "windZone");

      for (const body of context.physicsWorld.bodies) {
        if (body.type !== "dynamic") continue;

        const inside =
          Math.abs(body.translation.x - zoneCenter[0]) <= size[0] * 0.5 &&
          Math.abs(body.translation.y - zoneCenter[1]) <= size[1] * 0.5 &&
          Math.abs(body.translation.z - zoneCenter[2]) <= size[2] * 0.5;
        if (!inside) continue;

        const zoneBottom = zoneCenter[1] - size[1] * 0.5;
        const normalizedHeight = (body.translation.y - zoneBottom) / size[1];
        const strength = 1 - normalizedHeight;

        scaledWindForce.set(force[0], force[1], force[2]).multiplyScalar(strength);
        body.applyForce(scaledWindForce);
      }
    }
  },
});
