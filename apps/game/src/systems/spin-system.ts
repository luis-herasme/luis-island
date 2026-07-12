import { AXIS_Y, Quaternion } from "@game/math";
import { context } from "../game-context";

const currentRotation = new Quaternion();
const spinRotation = new Quaternion();

/** Purely visual rotation — the fan blades, the coins. */
export const spinSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "spin"],

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const { rotation } = components.get(entity, "transform");
      const { speed } = components.get(entity, "spin");

      spinRotation.setFromAxisAngle(AXIS_Y, speed * deltaTime);
      currentRotation.set(...rotation).multiply(spinRotation);

      rotation[0] = currentRotation.x;
      rotation[1] = currentRotation.y;
      rotation[2] = currentRotation.z;
      rotation[3] = currentRotation.w;
    }
  },
});
