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

/** A short buzz for trying something you cannot afford. */
export function playDeniedSound(): void {
  context.audioPlayer.playTone({ frequency: 160, duration: 0.12, oscillator: "square", volume: 0.12 });
  context.audioPlayer.playTone({ frequency: 120, duration: 0.25, oscillator: "square", volume: 0.12, delay: 0.13 });
}

// The jukebox tune: the opening phrase of Ode to Joy, one square-wave voice.
// [frequency, duration in seconds]
// prettier-ignore
const SONG_NOTES: [number, number][] = [
  [659, 0.3], [659, 0.3], [698, 0.3], [784, 0.3],
  [784, 0.3], [698, 0.3], [659, 0.3], [587, 0.3],
  [523, 0.3], [523, 0.3], [587, 0.3], [659, 0.3],
  [659, 0.45], [587, 0.15], [587, 0.6],
];

/** Plays the jukebox song; returns its duration in seconds. */
export function playSong(): number {
  let startTime = 0;
  for (const [frequency, duration] of SONG_NOTES) {
    context.audioPlayer.playTone({ frequency, duration, oscillator: "square", volume: 0.1, delay: startTime });
    startTime += duration;
  }
  return startTime;
}
