import { AudioPlayer } from "@game/audio";
import { ECS } from "@game/ecs";
import type { Entity } from "@game/ecs";
import { Keyboard } from "@game/input";
import { AXIS_Y, Matrix4x4, Vector3 } from "@game/math";
import { PhysicsWorld } from "@game/physics";
import type { RigidBody } from "@game/physics";
import { Mesh, PerspectiveCamera, Renderer } from "@game/render";
import type { Components } from "./components";

/** Where the camera sits relative to the player. */
export const CAMERA_OFFSET = new Vector3(0, 9, 12);

const camera = new PerspectiveCamera({ aspect: window.innerWidth / window.innerHeight });

// The camera trails the player at a fixed offset, so its viewing angle is
// constant: aim it once, from the offset toward the origin.
camera.transform.translation.copy(CAMERA_OFFSET);
camera.transform.rotation.setFromRotationMatrix(new Matrix4x4().targetTo(CAMERA_OFFSET, new Vector3(0, 0, 0), AXIS_Y));

/**
 * The one live game: every system and spawner imports this directly. The
 * game runs in exactly one world, so the context is a singleton rather than
 * something passed around.
 *
 * sceneMeshes is the draw list and bodies maps each entity to its
 * materialized RigidBody. Components are plain serializable data, so
 * runtime resources like meshes and bodies are never components — they are
 * registered here (or in a system's private memory) by the system that
 * materializes them.
 */
export const context = {
  ecs: new ECS<Components>(),
  keyboard: new Keyboard(),
  audioPlayer: new AudioPlayer(),
  physicsWorld: new PhysicsWorld(),
  renderer: new Renderer(),
  camera,
  sceneMeshes: new Set<Mesh>(),
  bodies: new Map<Entity, RigidBody>(),
  /** Set by spawnWorld — the entity systems read when they need "the player". */
  playerEntity: null as Entity | null,
  /** The player's coins: earned by the coin system, spent by the jukebox. */
  coins: 0,
};
