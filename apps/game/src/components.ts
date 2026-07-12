import type { QuaternionLike, Vector3Like } from "@game/math";

/**
 * Everything an entity can be, in one place — and all of it plain,
 * JSON-serializable data. A component is never a class: vectors and
 * quaternions are plain `{ x, y, z(, w) }` records (the math package's
 * `Vector3Like`/`QuaternionLike` shapes), and `JSON.stringify` round-trips
 * every component. Read-only math methods accept the shapes directly;
 * colors stay `[r, g, b]` tuples because they are GPU upload payloads, not
 * math operands.
 *
 * Runtime state and resources are not components: meshes live in the render
 * system's memory, rigid bodies in `context.bodies` — materialized in
 * onEntityAdded and released in onEntityRemoved.
 */

/** Scale, rotation (a quaternion, identity `{x:0, y:0, z:0, w:1}`) and translation. */
export type Transform = {
  translation: Vector3Like;
  rotation: QuaternionLike;
  scale: Vector3Like;
};

/**
 * A reference to a shared geometry: the unit box, or an OBJ model by url.
 * `offset` (world units) shifts the mesh when placed — it aligns a model
 * whose origin is not its center with the entity's collider-centered
 * translation.
 */
export type GeometryDescription =
  | {
      kind: "box";
    }
  | {
      kind: "obj";
      url: string;
      offset?: Vector3Like;
    };

/**
 * A closed, compiler-checked set of looks — deliberately not shaders-as-data.
 * A new look is a new kind here plus a case in the render system. Kinds are
 * lighting models, not color sources: `lit` is shaded by the demo's one
 * directional light, `basic` is unlit and drawn at full brightness (right
 * for textures with baked-in lighting, like photo scans). Both have an
 * optional color and an optional texture that multiply together, like
 * three.js materials do — texture absent shows the color, both present is a
 * tinted texture.
 */
export type MaterialDescription = {
  kind: "lit" | "basic";
  /** Multiplied with the texture; defaults to white. */
  color?: [number, number, number];
  textureUrl?: string;
  /** Tiles the texture this many times across the geometry's UVs; defaults to 1. */
  textureScale?: number;
};

export type Components = {
  /** Where an entity is. Written by physics for entities with a body. */
  transform: Transform;

  /**
   * What the entity looks like: a geometry reference plus a material
   * description. The render system materializes both through the asset
   * cache, so geometries and textures are loaded once and shared. Purely
   * procedural visuals (the avatar, the wind puffs) do not use this — their
   * systems own their meshes directly and register them in the scene.
   */
  renderable: {
    geometry: GeometryDescription;
    material: MaterialDescription;
  };

  /**
   * Give the entity a physics body. The collider size defaults to the
   * transform's scale — right for unit-box visuals — and `size` (world
   * units) overrides it for entities whose scale is not their size, like
   * OBJ models. The materialized RigidBody lives in `context.bodies`.
   */
  physicsBody: {
    type: "dynamic" | "static";
    restitution: number;
    damping: number;
    stepHeight: number;
    size?: Vector3Like;
  };

  /** The player: facing is the last movement direction — where throws go. */
  player: { speed: number; facing: Vector3Like };

  /** A collectible: the player walking into it picks it up. */
  coin: { value: number };

  /**
   * A camera-facing text label floating `offsetY` above the transform,
   * rendered from a hidden canvas. Set `text` to "" to show nothing; the
   * label system regenerates the texture whenever the text changes.
   */
  label: { text: string; offsetY: number };

  /**
   * A jukebox: walk close and it offers to play a song for `songCost`
   * coins through its label. Drawn as a billboarded sprite of `textureUrl`
   * that vibrates while the song plays.
   */
  jukebox: { songCost: number; textureUrl: string };

  /**
   * A box region (centered on the transform) that pushes dynamic bodies.
   * The force is strongest at the region's base and decays linearly to zero
   * at its top, like the airflow of a fan.
   */
  windZone: { size: Vector3Like; force: Vector3Like };

  /** Purely visual rotation around the Y axis, radians per second. */
  spin: { speed: number };

  /**
   * An animated water surface: a flat plane at the transform's height,
   * sized by its scale. The look lives in the water system's shader.
   */
  water: Record<string, never>;

  /**
   * Emits billboarded sprite particles: they spawn within `radius` of the
   * transform's translation, rise from the transform's height to `height`
   * above it at a random speed in [minimumSpeed, maximumSpeed], and wrap
   * back to the base. The particle system owns the mesh; the rise-fade-grow
   * behavior stays fixed in the system until a second effect needs choices.
   */
  particleEmitter: {
    textureUrl: string;
    count: number;
    radius: number;
    height: number;
    minimumSpeed: number;
    maximumSpeed: number;
  };
};
