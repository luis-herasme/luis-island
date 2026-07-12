import { Vector3 } from "@game/math";
import { CAMERA_OFFSET, context } from "../game-context";

/** Per-second catch-up rate of the camera toward its target position. */
const CAMERA_FOLLOW_RATE = 4;

const cameraTargetPosition = new Vector3();

/** Trails the player at CAMERA_OFFSET, smoothed so the motion feels weighted. */
export const cameraFollowSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "player"],

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const { translation } = components.get(entity, "transform");
      cameraTargetPosition.copy(translation).add(CAMERA_OFFSET);

      // Exponential smoothing, frame-rate independent.
      const blend = 1 - Math.exp(-CAMERA_FOLLOW_RATE * deltaTime);
      context.camera.transform.translation.lerp(cameraTargetPosition, blend);
    }
  },
});
