import type { Entity } from "@game/ecs";
import { context } from "../game-context";
import { setCoinCount } from "../hud";
import { playDeniedSound, playSong } from "../sounds";

/** How close the player must be for the jukebox to talk to them. */
const INTERACT_DISTANCE = 2.2;

type JukeboxState = {
  /** Clock time when the current song ends; 0 when nothing is playing. */
  playingUntil: number;
  /** True after a Q press the player could not afford. */
  showInsufficient: boolean;
};

/** Per-jukebox interaction state, keyed by entity. */
const states = new Map<Entity, JukeboxState>();

let clock = 0;
let interactKeyWasPressed = false;

/**
 * The jukebox conversation, spoken through the entity's label: an offer
 * when the player comes close, a song for songCost coins on Q, and a
 * complaint when the player cannot afford one. Walking away clears the
 * complaint; the song keeps playing on its own.
 */
export const jukeboxSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "jukebox", "label"],

  onEntityAdded(entity) {
    states.set(entity, { playingUntil: 0, showInsufficient: false });
  },

  onEntityRemoved(entity) {
    states.delete(entity);
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

      const distance = Math.hypot(translation.x - player.x, translation.y - player.y, translation.z - player.z);
      const playerIsNear = distance <= INTERACT_DISTANCE;
      const isPlaying = clock < state.playingUntil;

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
          state.playingUntil = clock + playSong();
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
