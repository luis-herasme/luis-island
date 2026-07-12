import { ECS } from "@game/ecs";
import { Keyboard } from "@game/input";
import { AXIS_Y, Matrix4x4, Vector3 } from "@game/math";
import { PhysicsWorld } from "@game/physics";
import { PerspectiveCamera, Renderer } from "@game/render";
import type { Components } from "./components";

/** Where the camera sits relative to the player. */
export const CAMERA_OFFSET = new Vector3(0, 9, 12);

/**
 * The shared pieces every system and spawner works with. Passing this around
 * explicitly keeps each file's dependencies visible in its signature — and a
 * headless game server can build a context without a renderer in it.
 */
export type GameContext = {
  ecs: ECS<Components>;
  keyboard: Keyboard;
  physicsWorld: PhysicsWorld;
  renderer: Renderer;
  camera: PerspectiveCamera;
};

export function createGameContext(): GameContext {
  const camera = new PerspectiveCamera({ aspect: window.innerWidth / window.innerHeight });

  // The camera trails the player at a fixed offset, so its viewing angle is
  // constant: aim it once, from the offset toward the origin.
  camera.transform.translation.copy(CAMERA_OFFSET);
  camera.transform.rotation.setFromRotationMatrix(
    new Matrix4x4().targetTo(CAMERA_OFFSET, new Vector3(0, 0, 0), AXIS_Y),
  );

  return {
    ecs: new ECS<Components>(),
    keyboard: new Keyboard(),
    physicsWorld: new PhysicsWorld(),
    renderer: new Renderer(),
    camera,
  };
}
