import type { Vector3, Transform3D } from "@game/math";
import type { RigidBody } from "@game/physics";

/**
 * Everything an entity can be, in one place — and all of it plain data.
 *
 * Runtime resources (meshes, GPU buffers) are not components: they are
 * private memory of the system that owns them, created in onEntityAdded and
 * released in onEntityRemoved. The one exception in spirit is `body`, which
 * is the simulation state itself and is consumed by several systems.
 */
export type Components = {
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

  /** Created by the body system from `physicsBody`; the moving state of the entity. */
  body: RigidBody;

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
};
