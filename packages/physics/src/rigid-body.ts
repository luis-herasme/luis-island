import { Vector3 } from "@game/math";
import type { Collider } from "./collider";

/**
 * Static bodies never move and behave as if they had infinite mass — the
 * ground, walls, obstacles. Dynamic bodies are integrated and respond to
 * collisions.
 */
export type BodyType = "dynamic" | "static";

type RigidBodyOptions = {
  collider: Collider;
  type?: BodyType;
  translation?: Vector3;
  velocity?: Vector3;
  /** Ignored for static bodies (treated as infinite). */
  mass?: number;
  /** Bounciness, 0 (none) to 1 (perfectly elastic). A contact uses the larger of the two bodies'. */
  restitution?: number;
  /** Per-second linear deceleration; 0 keeps momentum forever. */
  damping?: number;
};

export class RigidBody {
  readonly collider: Collider;
  readonly type: BodyType;
  readonly translation: Vector3;
  readonly velocity: Vector3;
  mass: number;
  restitution: number;
  damping: number;

  constructor(options: RigidBodyOptions) {
    this.collider = options.collider;
    this.type = options.type ?? "dynamic";
    this.translation = options.translation ?? new Vector3();
    this.velocity = options.velocity ?? new Vector3();
    this.mass = options.mass ?? 1;
    this.restitution = options.restitution ?? 0;
    this.damping = options.damping ?? 0;
  }

  /** 1 / mass, with static bodies reading as 0 — the form resolution needs. */
  get inverseMass(): number {
    return this.type === "static" ? 0 : 1 / this.mass;
  }
}
