import type { Entity } from "@game/ecs";
import { MagnificationFilter } from "@game/render";
import type { Mesh } from "@game/render";
import { context } from "../game-context";
import type { PositionalSound } from "../game-context";
import { setCoinCount } from "../hud";
import { getSoundBuffer, getTexture } from "../rendering/asset-cache";
import { createSpriteMesh } from "../rendering/sprite-mesh";
import { playDeniedSound } from "../sounds";

/** How close the player must be for the jukebox to talk to them. */
const INTERACT_DISTANCE = 2.2;

/** World-unit height of the jukebox sprite — matches its collider. */
const SPRITE_HEIGHT = 1.5;

/** The song's volume at the jukebox, fading to silence at its range. */
const SONG_VOLUME = 0.7;
const SONG_RANGE = 14;

/** Shake size and speeds while a song plays. */
const VIBRATION_AMPLITUDE = 0.03;
const VIBRATION_FREQUENCY_X = 35;
const VIBRATION_FREQUENCY_Y = 47;

type JukeboxState = {
  /** Clock time when the current song ends; 0 when nothing is playing. */
  playingUntil: number;
  /** True after a Q press the player could not afford. */
  showInsufficient: boolean;
  mesh: Mesh;
  /** The playing song's positional registration; null when silent. */
  song: PositionalSound | null;
};

/** Per-jukebox state and sprite, keyed by entity. */
const states = new Map<Entity, JukeboxState>();

let clock = 0;
let interactKeyWasPressed = false;

/**
 * The jukebox: a billboarded pixel-art sprite (this system's private mesh)
 * that talks through the entity's label — an offer when the player comes
 * close, a song for songCost coins on Q, a complaint when the player
 * cannot afford one. While the song plays the cabinet vibrates. Walking
 * away clears the complaint; the song plays on.
 */
export const jukeboxSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "jukebox", "label"],

  onEntityAdded(entity, ecs) {
    const jukebox = ecs.get(entity, "jukebox");
    if (!jukebox) return;

    const texture = getTexture(jukebox.textureUrl);
    // Pixel art: crisp texels when magnified, not smeared ones.
    texture.magnificationFilter = MagnificationFilter.Nearest;

    const mesh = createSpriteMesh({
      texture,
      width: SPRITE_HEIGHT * (texture.width / texture.height),
      height: SPRITE_HEIGHT,
    });

    states.set(entity, { playingUntil: 0, showInsufficient: false, mesh, song: null });
    context.sceneMeshes.add(mesh);
  },

  onEntityRemoved(entity) {
    const state = states.get(entity);
    if (!state) return;

    states.delete(entity);
    context.sceneMeshes.delete(state.mesh);
    if (state.song) {
      context.positionalSounds.delete(state.song);
      state.song.handle.stop();
    }
  },

  update({ entities, components, deltaTime }) {
    clock += deltaTime;

    const { ecs, playerEntity } = context;
    if (playerEntity === null) return;
    const playerTransform = ecs.get(playerEntity, "transform");
    if (!playerTransform) return;
    const player = playerTransform.translation;

    const interactKeyIsPressed = context.keyboard.isPressed("KeyQ");
    const interactKeyJustPressed = interactKeyIsPressed && !interactKeyWasPressed;
    interactKeyWasPressed = interactKeyIsPressed;

    for (const entity of entities) {
      const state = states.get(entity);
      if (!state) continue;

      const jukebox = components.get(entity, "jukebox");
      const label = components.get(entity, "label");
      const { translation } = components.get(entity, "transform");
      const isPlaying = clock < state.playingUntil;

      // The sprite follows the entity, shaking while the song plays.
      state.mesh.transform.translation.copy(translation);
      if (isPlaying) {
        state.mesh.transform.translation.x += Math.sin(clock * VIBRATION_FREQUENCY_X) * VIBRATION_AMPLITUDE;
        state.mesh.transform.translation.y += Math.cos(clock * VIBRATION_FREQUENCY_Y) * VIBRATION_AMPLITUDE;
      }

      const distance = Math.hypot(translation.x - player.x, translation.y - player.y, translation.z - player.z);
      const playerIsNear = distance <= INTERACT_DISTANCE;

      // A finished song leaves the positional registry.
      if (state.song && !isPlaying) {
        context.positionalSounds.delete(state.song);
        state.song = null;
      }

      if (!playerIsNear) {
        label.text = "";
        state.showInsufficient = false;
        continue;
      }

      // Collecting enough coins withdraws the complaint.
      if (state.showInsufficient && context.coins >= jukebox.songCost) {
        state.showInsufficient = false;
      }

      if (interactKeyJustPressed && !isPlaying) {
        if (context.coins >= jukebox.songCost) {
          context.coins -= jukebox.songCost;
          setCoinCount(context.coins);

          const songBuffer = getSoundBuffer(jukebox.songUrl);
          state.song = {
            handle: context.audioPlayer.playSound(songBuffer, { volume: SONG_VOLUME }),
            position: translation,
            volume: SONG_VOLUME,
            range: SONG_RANGE,
          };
          context.positionalSounds.add(state.song);
          state.playingUntil = clock + songBuffer.duration;
          state.showInsufficient = false;
        } else {
          state.showInsufficient = true;
          playDeniedSound();
        }
      }

      if (clock < state.playingUntil) {
        label.text = "♪ ♪ ♪";
      } else if (state.showInsufficient) {
        label.text = `You need ${jukebox.songCost} coins to play a song`;
      } else {
        label.text = `Press Q to play a song (${jukebox.songCost} coins)`;
      }
    }
  },
});
