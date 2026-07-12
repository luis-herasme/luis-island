import type { Vector3, Transform3D } from "@game/math";
import type { RigidBody } from "@game/physics";
import type { Mesh } from "@game/render";

/**
 * Everything an entity can be, in one place.
 *
 * Two kinds of components live here. Description components are plain data
 * written at spawn time — they say what an entity is. Materialized components
 * are runtime resources a system creates from a description in its
 * onEntityAdded hook and releases in onEntityRemoved; game code never
 * constructs them directly.
 */
export type Components = {
  // -------------------------------------------------------------------------
  // Descriptions
  // -------------------------------------------------------------------------

  /** Where an entity is. Written by physics for entities with a body. */
  transform: Transform3D;

  /** Draw the entity as a colored box sized by its transform's scale. */
  visual: { color: [number, number, number] };

  /** Give the entity a physics body sized by its transform's scale. */
  physicsBody: {
    type: "dynamic" | "static";
    restitution: number;
    damping: number;
    stepHeight: number;
  };

  /** The player: facing is the last movement direction — where throws go. */
  player: { speed: number; facing: Vector3 };

  /**
   * A box region (centered on the transform) that pushes dynamic bodies.
   * The force is strongest at the region's base and decays linearly to zero
   * at its top, like the airflow of a fan.
   */
  windZone: { size: Vector3; force: Vector3 };

  /** Purely visual rotation around the Y axis, radians per second. */
  spin: { speed: number };

  /** A column of rising streaks that makes a wind zone visible. */
  windStreaks: {
    center: [number, number];
    radius: number;
    bottom: number;
    top: number;
    count: number;
  };

  // -------------------------------------------------------------------------
  // Materialized resources
  // -------------------------------------------------------------------------

  /** Created by the render system from `visual`, and by the streak system. */
  mesh: Mesh;

  /** Created by the body system from `physicsBody`. */
  body: RigidBody;
};
