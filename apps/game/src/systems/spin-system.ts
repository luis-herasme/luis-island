import { AXIS_Y, Quaternion } from "@game/math";
import type { GameContext } from "../game-context";

/** Purely visual rotation — the fan blades. */
export function createSpinSystem(context: GameContext) {
  const spinQuaternion = new Quaternion();

  return context.ecs.createSystem({
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
}
