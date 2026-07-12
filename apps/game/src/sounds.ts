import { context } from "./game-context";

/**
 * The game's sound effects, all synthesized — no audio files. Each one is a
 * few tones scheduled on the audio player.
 */

/** The classic two-note coin chime: B5 into a ringing E6. */
export function playCoinSound(): void {
  context.audioPlayer.playTone({ frequency: 988, duration: 0.08, oscillator: "square", volume: 0.12 });
  context.audioPlayer.playTone({ frequency: 1319, duration: 0.35, oscillator: "square", volume: 0.12, delay: 0.08 });
}

/** A sad downward slide for falling into the sea. */
export function playRespawnSound(): void {
  context.audioPlayer.playTone({ frequency: 400, endFrequency: 80, duration: 0.5, oscillator: "sawtooth", volume: 0.15 });
}
