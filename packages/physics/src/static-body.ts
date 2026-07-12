import { Vector3 } from "@game/math";

type StaticBodyOptions = {
  /**
   * Full dimensions of the box on each axis — a unit cube is (1, 1, 1).
   * Every body is an axis-aligned box, the only shape this engine supports.
   */
  size: Vector3;
  translation: Vector3;
  /** Bounciness, 0 (none) to 1 (perfectly elastic). A contact uses the larger of the two bodies'. */
  restitution: number;
};

/**
 * A body that never moves: the ground, walls, stairs. It has no motion
 * state at all — no velocity, no mass (it behaves as infinitely heavy,
 * which is what inverseMass 0 means to the resolver).
 */
export class StaticBody {
  readonly type = "static";
  readonly inverseMass = 0;
  readonly size: Vector3;
  readonly translation: Vector3;
  restitution: number;

  constructor(options: StaticBodyOptions) {
    this.size = options.size;
    this.translation = options.translation;
    this.restitution = options.restitution;
  }
}
