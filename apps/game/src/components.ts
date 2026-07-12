import type { Vector3, Transform3D } from "@game/math";
import type { RigidBody } from "@game/physics";

/**
 * A reference to a shared geometry: the unit box, or an OBJ model by url.
 * `offset` (world units) shifts the mesh when placed — it aligns a model
 * whose origin is not its center with the entity's collider-centered
 * translation.
 */
export type GeometryDescription = { kind: "box" } | { kind: "obj"; url: string; offset?: [number, number, number] };

/**
 * A closed, compiler-checked set of looks — deliberately not shaders-as-data.
 * A new look (say, an unlit `basic`) is a new kind here plus a case in the
 * render system. Kinds are lighting models, not color sources: `lit` has an
 * optional color and an optional texture that multiply together, like
 * three.js materials do — texture absent shows the color, both present is a
 * tinted texture.
 */
export type MaterialDescription = {
  kind: "lit";
  /** Multiplied with the texture; defaults to white. */
  color?: [number, number, number];
  textureUrl?: string;
};

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

  /**
   * What the entity looks like: a geometry reference plus a material
   * description. The render system materializes both through the asset
   * cache, so geometries and textures are loaded once and shared. Purely
   * procedural visuals (the avatar, the wind puffs) do not use this — their
   * systems own their meshes directly and register them in the scene.
   */
  renderable: { geometry: GeometryDescription; material: MaterialDescription };

  /**
   * Give the entity a physics body. The collider size defaults to the
   * transform's scale — right for unit-box visuals — and `size` (world
   * units) overrides it for entities whose scale is not their size, like
   * OBJ models.
   */
  physicsBody: {
    type: "dynamic" | "static";
    restitution: number;
    damping: number;
    stepHeight: number;
    size?: [number, number, number];
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
