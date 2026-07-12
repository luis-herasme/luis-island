import { Vector3 } from "@game/math";
import type { RigidBody } from "./rigid-body";

/**
 * A detected overlap between two bodies. The normal points from `first`
 * toward `second`, and moving the bodies apart along it by `penetration`
 * separates them.
 */
export type Contact = {
  first: RigidBody;
  second: RigidBody;
  normal: Vector3;
  penetration: number;
};

/**
 * The contact between two bodies, or null when they do not overlap.
 * Positional parameters are kept here (a per-pair, per-frame hot path);
 * the argument order defines the normal's direction: first → second.
 */
export function contactBetween(first: RigidBody, second: RigidBody): Contact | null {
  const deltaX = second.translation.x - first.translation.x;
  const deltaY = second.translation.y - first.translation.y;
  const deltaZ = second.translation.z - first.translation.z;

  // Two boxes overlap on an axis when the gap between their centers is
  // smaller than the sum of their half sizes.
  const overlapX = (first.size.x + second.size.x) * 0.5 - Math.abs(deltaX);
  if (overlapX <= 0) return null;

  const overlapY = (first.size.y + second.size.y) * 0.5 - Math.abs(deltaY);
  if (overlapY <= 0) return null;

  const overlapZ = (first.size.z + second.size.z) * 0.5 - Math.abs(deltaZ);
  if (overlapZ <= 0) return null;

  // Separate along the axis of least overlap — the shortest way out.
  if (overlapX <= overlapY && overlapX <= overlapZ) {
    let directionX = -1;
    if (deltaX >= 0) directionX = 1;
    return { first, second, normal: new Vector3(directionX, 0, 0), penetration: overlapX };
  }

  if (overlapY <= overlapZ) {
    let directionY = -1;
    if (deltaY >= 0) directionY = 1;
    return { first, second, normal: new Vector3(0, directionY, 0), penetration: overlapY };
  }

  let directionZ = -1;
  if (deltaZ >= 0) directionZ = 1;
  return { first, second, normal: new Vector3(0, 0, directionZ), penetration: overlapZ };
}
