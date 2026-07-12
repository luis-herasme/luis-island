import type { DynamicBody } from "./dynamic-body";
import type { StaticBody } from "./static-body";

/**
 * Anything the physics world can hold. The `type` discriminant narrows the
 * union: only dynamic bodies have motion state (velocity, mass, damping,
 * stepHeight), so the compiler rejects reading it off a static body.
 */
export type RigidBody = DynamicBody | StaticBody;
