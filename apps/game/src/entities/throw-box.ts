import { Vector3 } from "@game/math";
import type { GameContext } from "../game-context";
import { spawnBox } from "./spawn-box";

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

type ThrowBoxOptions = {
  context: GameContext;
  from: Vector3;
  facing: Vector3;
};

/** A small box thrown from a point: one kick, and gravity draws the parabola. */
export function throwBox(options: ThrowBoxOptions): void {
  const { context, from, facing } = options;
  const color = THROW_COLORS[Math.floor(Math.random() * THROW_COLORS.length)]!;

  const entity = spawnBox({
    context,
    color,
    position: [from.x + facing.x * 1.2, from.y + 0.3, from.z + facing.z * 1.2],
    scale: [0.4, 0.4, 0.4],
    body: {
      type: "dynamic",
      restitution: 0.4,
      // There is no contact friction yet, so damping is what makes a landed
      // box skid to a stop instead of sliding off the world.
      damping: 1.5,
    },
  });

  // The body was materialized synchronously when the components were added.
  const body = context.ecs.get(entity, "body");
  if (body?.type === "dynamic") {
    body.applyImpulse(
      new Vector3(facing.x * THROW_HORIZONTAL_IMPULSE, THROW_UPWARD_IMPULSE, facing.z * THROW_HORIZONTAL_IMPULSE),
    );
  }
}
