import { Vector3 } from "@game/math";
import type { Vector3Like } from "@game/math";
import { context } from "../game-context";
import { spawnEntity } from "../spawn-entity";

const THROW_COLORS: [number, number, number][] = [
  [0.95, 0.77, 0.06],
  [0.9, 0.49, 0.13],
  [0.61, 0.35, 0.71],
  [0.2, 0.6, 0.86],
  [0.9, 0.3, 0.24],
  [0.15, 0.68, 0.38],
];
const THROW_HORIZONTAL_IMPULSE = 9;
const THROW_UPWARD_IMPULSE = 5.5;
const THROWN_BOX_SIZE = 0.4;

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

type ThrowBoxOptions = {
  from: Vector3Like;
  facing: Vector3Like;
};

/** A small box thrown from a point: one kick, and gravity draws the parabola. */
function throwBox(options: ThrowBoxOptions): void {
  const { from, facing } = options;
  const color = THROW_COLORS[Math.floor(Math.random() * THROW_COLORS.length)]!;

  const entity = spawnEntity({
    transform: {
      translation: { x: from.x + facing.x * 1.2, y: from.y + 0.3, z: from.z + facing.z * 1.2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: THROWN_BOX_SIZE, y: THROWN_BOX_SIZE, z: THROWN_BOX_SIZE },
    },
    renderable: { geometry: { kind: "box" }, material: { kind: "lit", color } },
    // No contact friction yet, so damping is what makes a landed box skid
    // to a stop instead of sliding off the world.
    physicsBody: { type: "dynamic", restitution: 0.4, damping: 1.5, stepHeight: 0 },
  });

  // The body was materialized synchronously when the components were added.
  const thrownBody = context.bodies.get(entity);
  if (thrownBody?.type === "dynamic") {
    thrownBody.applyImpulse(
      new Vector3(facing.x * THROW_HORIZONTAL_IMPULSE, THROW_UPWARD_IMPULSE, facing.z * THROW_HORIZONTAL_IMPULSE),
    );
  }
}
