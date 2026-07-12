import type { Entity } from "@game/ecs";
import { context } from "../game-context";
import type { PositionalSound } from "../game-context";

/** Seconds of noise in a hum loop — long enough that the seam is rare. */
const HUM_LOOP_DURATION = 2;

/** This system's own registry entries, keyed by emitter entity. */
const emitterSounds = new Map<Entity, PositionalSound>();

/**
 * All positional audio in one place, the way the render system draws every
 * scene mesh: whatever anyone registers in context.positionalSounds is
 * faded with the square of the player's distance every frame — full volume
 * at the source, silence at the sound's range.
 *
 * The system also materializes the `soundEmitter` component: a continuous
 * loop registered while the entity lives. Other producers (the jukebox's
 * song) register their own entries. Loops start silent and become audible
 * when main.ts's first-gesture resume unlocks the context.
 */
export const positionalAudioSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "soundEmitter"],

  onEntityAdded(entity, ecs) {
    const transform = ecs.get(entity, "transform");
    const emitter = ecs.get(entity, "soundEmitter");
    if (!transform || !emitter) return;

    // "fanHum" is the whole catalog today; more sounds branch here.
    const buffer = context.audioPlayer.createNoiseBuffer({ duration: HUM_LOOP_DURATION, kind: "brown" });

    const sound: PositionalSound = {
      // Born silent: the first update sets the real distance-based volume.
      handle: context.audioPlayer.playLoop(buffer, { volume: 0 }),
      position: transform.translation,
      volume: emitter.volume,
      range: emitter.range,
    };

    emitterSounds.set(entity, sound);
    context.positionalSounds.add(sound);
  },

  onEntityRemoved(entity) {
    const sound = emitterSounds.get(entity);
    if (!sound) return;

    emitterSounds.delete(entity);
    context.positionalSounds.delete(sound);
    sound.handle.stop();
  },

  update() {
    const { ecs, playerEntity } = context;
    if (playerEntity === null) return;
    const playerTransform = ecs.get(playerEntity, "transform");
    if (!playerTransform) return;
    const player = playerTransform.translation;

    for (const sound of context.positionalSounds) {
      const { position } = sound;
      const distance = Math.hypot(position.x - player.x, position.y - player.y, position.z - player.z);

      // Quadratic falloff: 1 at the source, 0 at range, gentle in between.
      let closeness = 1 - distance / sound.range;
      if (closeness < 0) closeness = 0;

      sound.handle.setVolume(sound.volume * closeness * closeness);
    }
  },
});
