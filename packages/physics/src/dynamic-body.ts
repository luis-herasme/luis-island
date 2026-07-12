import { Vector3 } from "@game/math";

type DynamicBodyOptions = {
  /**
   * Full dimensions of the box on each axis — a unit cube is (1, 1, 1).
   * Every body is an axis-aligned box, the only shape this engine supports.
   */
  size: Vector3;
  translation: Vector3;
  velocity: Vector3;
  mass: number;
  /** Bounciness, 0 (none) to 1 (perfectly elastic). A contact uses the larger of the two bodies'. */
  restitution: number;
  /** Per-second linear deceleration; 0 keeps momentum forever. */
  damping: number;
  /**
   * Side contacts with static boxes whose top edge is at most this far above
   * the body's bottom lift the body onto the ledge instead of blocking it —
   * this is what makes staircases of static boxes walkable. 0 disables it.
   */
  stepHeight: number;
};

/**
 * A body the world integrates and collisions push around. Every property is
 * required on purpose: each one changes how the body behaves, so the caller
 * decides each one explicitly.
 */
export class DynamicBody {
  readonly type = "dynamic";
  readonly size: Vector3;
  readonly translation: Vector3;
  readonly velocity: Vector3;
  mass: number;
  restitution: number;
  damping: number;
  stepHeight: number;

  constructor(options: DynamicBodyOptions) {
    this.size = options.size;
    this.translation = options.translation;
    this.velocity = options.velocity;
    this.mass = options.mass;
    this.restitution = options.restitution;
    this.damping = options.damping;
    this.stepHeight = options.stepHeight;
  }

  /** 1 / mass — the form the resolver weighs responses with. */
  get inverseMass(): number {
    return 1 / this.mass;
  }
}
