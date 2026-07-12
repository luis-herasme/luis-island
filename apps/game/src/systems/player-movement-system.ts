import { context } from "../game-context";

/** Vertical takeoff speed: apex height is speed² / (2 · gravity) ≈ 1.27. */
const JUMP_SPEED = 5;

let jumpKeyWasPressed = false;

/** Input writes velocities; the physics step decides where things end up. */
export const playerMovementSystem = context.ecs.createSystem({
  requiredComponents: ["physicsBody", "player"],

  update({ entities, components }) {
    const { keyboard } = context;

    // W/up is -Z: away from the camera, which looks down the -Z axis.
    const moveX =
      keyboard.axis({ negative: "KeyA", positive: "KeyD" }) +
      keyboard.axis({ negative: "ArrowLeft", positive: "ArrowRight" });
    const moveZ =
      keyboard.axis({ negative: "KeyW", positive: "KeyS" }) +
      keyboard.axis({ negative: "ArrowUp", positive: "ArrowDown" });

    // Normalize so diagonals are not faster than straight lines.
    const length = Math.hypot(moveX, moveZ);
    let directionX = 0;
    let directionZ = 0;
    if (length > 0) {
      directionX = moveX / length;
      directionZ = moveZ / length;
    }

    const jumpKeyIsPressed = keyboard.isPressed("Space");
    const shouldJump = jumpKeyIsPressed && !jumpKeyWasPressed;
    jumpKeyWasPressed = jumpKeyIsPressed;

    for (const entity of entities) {
      const body = context.bodies.get(entity);
      if (!body || body.type !== "dynamic") continue;

      const player = components.get(entity, "player");

      // Horizontal velocity comes from input; vertical stays with gravity.
      body.velocity.x = directionX * player.speed;
      body.velocity.z = directionZ * player.speed;

      // Grounded means the last physics step zeroed the vertical velocity
      // against the floor (restitution 0): airborne bodies always carry
      // some vertical speed when input runs.
      if (shouldJump && body.velocity.y === 0) body.velocity.y = JUMP_SPEED;

      if (length > 0) {
        player.facing.x = directionX;
        player.facing.y = 0;
        player.facing.z = directionZ;
      }
    }
  },
});
