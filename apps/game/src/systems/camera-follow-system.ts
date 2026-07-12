import { Vector3 } from "@game/math";
import type { GameContext } from "../game-context";
import { CAMERA_OFFSET } from "../game-context";

/** Per-second catch-up rate of the camera toward its target position. */
const CAMERA_FOLLOW_RATE = 4;

/** Trails the player at CAMERA_OFFSET, smoothed so the motion feels weighted. */
export function createCameraFollowSystem(context: GameContext) {
  const cameraTargetPosition = new Vector3();

  return context.ecs.createSystem({
    requiredComponents: ["transform", "player"],

    update({ entities, components, deltaTime }) {
      for (const entity of entities) {
        const playerPosition = components.get(entity, "transform").translation;
        cameraTargetPosition.copy(playerPosition).add(CAMERA_OFFSET);

        // Exponential smoothing, frame-rate independent.
        const blend = 1 - Math.exp(-CAMERA_FOLLOW_RATE * deltaTime);
        context.camera.transform.translation.lerp(cameraTargetPosition, blend);
      }
    },
  });
}
