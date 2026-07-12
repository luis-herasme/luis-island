import type { GameContext } from "../game-context";

/** Input writes velocities; the physics step decides where things end up. */
export function createPlayerMovementSystem(context: GameContext) {
  const { keyboard } = context;

  return context.ecs.createSystem({
    requiredComponents: ["body", "player"],

    update({ entities, components }) {
      // W/up is -Z: away from the camera, which looks down the -Z axis.
      const moveX =
        keyboard.axis({ negative: "KeyA", positive: "KeyD" }) +
        keyboard.axis({ negative: "ArrowLeft", positive: "ArrowRight" });
      const moveZ =
        keyboard.axis({ negative: "KeyW", positive: "KeyS" }) +
        keyboard.axis({ negative: "ArrowUp", positive: "ArrowDown" });

      // Normalize so diagonals are not faster than straight lines.
      const length = Math.hypot(moveX, moveZ);
      const directionX = length === 0 ? 0 : moveX / length;
      const directionZ = length === 0 ? 0 : moveZ / length;

      for (const entity of entities) {
        const body = components.get(entity, "body");
        if (body.type !== "dynamic") continue;

        const player = components.get(entity, "player");

        // Horizontal velocity comes from input; vertical stays with gravity.
        body.velocity.x = directionX * player.speed;
        body.velocity.z = directionZ * player.speed;

        if (length > 0) player.facing.set(directionX, 0, directionZ);
      }
    },
  });
}
