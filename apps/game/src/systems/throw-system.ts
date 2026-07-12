import { throwBox } from "../entities/throw-box";
import { context } from "../game-context";

let throwKeyWasPressed = false;

/** E throws a box in the facing direction, arcing under gravity. */
export const throwSystem = context.ecs.createSystem({
  requiredComponents: ["physicsBody", "player"],

  update({ entities, components }) {
    const throwKeyIsPressed = context.keyboard.isPressed("KeyE");
    const shouldThrow = throwKeyIsPressed && !throwKeyWasPressed;
    throwKeyWasPressed = throwKeyIsPressed;
    if (!shouldThrow) return;

    for (const entity of entities) {
      const body = context.bodies.get(entity);
      if (!body) continue;

      const { facing } = components.get(entity, "player");
      throwBox({ from: body.translation, facing });
    }
  },
});
