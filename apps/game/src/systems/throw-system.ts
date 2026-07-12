import { throwBox } from "../entities/throw-box";
import type { GameContext } from "../game-context";

/** Space throws a box in the facing direction, arcing under gravity. */
export function createThrowSystem(context: GameContext) {
  let throwKeyWasPressed = false;

  return context.ecs.createSystem({
    requiredComponents: ["body", "player"],

    update({ entities, components }) {
      const throwKeyIsPressed = context.keyboard.isPressed("Space");
      const shouldThrow = throwKeyIsPressed && !throwKeyWasPressed;
      throwKeyWasPressed = throwKeyIsPressed;
      if (!shouldThrow) return;

      for (const entity of entities) {
        const body = components.get(entity, "body");
        const { facing } = components.get(entity, "player");
        throwBox({ context, from: body.translation, facing });
      }
    },
  });
}
