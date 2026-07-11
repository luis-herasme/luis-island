import { Vector3 } from "@game/math";

/**
 * An axis-aligned box, described by its half extents (half the size on each
 * axis). This physics system is linear-only by design, so colliders never
 * rotate.
 */
export type BoxCollider = {
  kind: "box";
  halfExtents: Vector3;
};

/** Grows into a union (sphere, capsule, ...) as shapes are added. */
export type Collider = BoxCollider;

type BoxColliderOptions = {
  halfExtents: Vector3;
};

export const Collider = {
  box: (options: BoxColliderOptions): Collider => ({ kind: "box", halfExtents: options.halfExtents }),
};
