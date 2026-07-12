import type { Entity } from "@game/ecs";
import type { SoundHandle } from "@game/audio";
import { context } from "../game-context";

/** Seconds of noise in a hum loop — long enough that the seam is rare. */
const HUM_LOOP_DURATION = 2;

/** Loop handles are this system's private memory, keyed by entity. */
const handles = new Map<Entity, SoundHandle>();

/**
 * Positional audio: every `soundEmitter` entity plays a continuous loop
 * whose volume follows the player's distance — full volume at the source,
 * fading quadratically to silence at the emitter's range. The loops start
 * silently before the autoplay unlock; main.ts resumes the context on the
 * first gesture and they become audible.
 */
export const soundEmitterSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "soundEmitter"],

  onEntityAdded(entity, ecs) {
    const emitter = ecs.get(entity, "soundEmitter");
    if (!emitter) return;

    // "fanHum" is the whole catalog today; more sounds branch here.
    const buffer = context.audioPlayer.createNoiseBuffer({ duration: HUM_LOOP_DURATION, kind: "brown" });

    // Born silent: the first update sets the real distance-based volume.
    handles.set(entity, context.audioPlayer.playLoop(buffer, { volume: 0 }));
  },

  onEntityRemoved(entity) {
    const handle = handles.get(entity);
    if (!handle) return;

    handles.delete(entity);
    handle.stop();
  },

  update({ entities, components }) {
    const { ecs, playerEntity } = context;
    if (playerEntity === null) return;
    const playerTransform = ecs.get(playerEntity, "transform");
    if (!playerTransform) return;
    const player = playerTransform.translation;

    for (const entity of entities) {
      const handle = handles.get(entity);
      if (!handle) continue;

      const { volume, range } = components.get(entity, "soundEmitter");
      const { translation } = components.get(entity, "transform");

      const distance = Math.hypot(translation.x - player.x, translation.y - player.y, translation.z - player.z);

      // Quadratic falloff: 1 at the source, 0 at range, gentle in between.
      let closeness = 1 - distance / range;
      if (closeness < 0) closeness = 0;

      handle.setVolume(volume * closeness * closeness);
    }
  },
});
