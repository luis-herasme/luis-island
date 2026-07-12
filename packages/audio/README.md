# @game/audio

A minimal Web Audio wrapper: one `AudioPlayer` holding a lazily created
`AudioContext`, with two ways to make noise.

```ts
import { AudioPlayer } from "@game/audio";

const audioPlayer = new AudioPlayer();

// Synthesized effects — no asset files. An oscillator with an exponential
// decay envelope, the classic chiptune voice:
audioPlayer.playTone({ frequency: 988, duration: 0.08, oscillator: "square" });
audioPlayer.playTone({ frequency: 1319, duration: 0.35, oscillator: "square", delay: 0.08 });

// Decoded audio files:
const splash = await audioPlayer.loadSound("/splash.ogg");
audioPlayer.playSound(splash, { volume: 0.8 });
```

## Autoplay policy

Browsers keep audio suspended until a user gesture. The player calls
`resume()` on every play attempt, so the first attempt that happens during
(or after) a gesture unlocks the context permanently. In a game where
sounds react to input this is invisible — by the time anything plays, a
key has been pressed.

## Design notes

- The `AudioContext` is created lazily on first use, not at construction —
  constructing an `AudioPlayer` at module load costs nothing and warns
  nothing.
- `playTone` schedules against the context clock (`delay` is relative), so
  a few calls compose into little tunes without timers.
- The context factory is injectable (`new AudioPlayer({ createContext })`),
  which is how the tests run against a fake in plain node.
