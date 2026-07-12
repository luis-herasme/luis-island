type AudioPlayerOptions = {
  /** Injectable for tests; defaults to creating a real AudioContext. */
  createContext?: () => AudioContext;
};

const DEFAULT_AUDIO_PLAYER_OPTIONS = {
  createContext: (): AudioContext => new AudioContext(),
};

type PlaySoundOptions = {
  /** Gain, 0..1. */
  volume?: number;
  /** 1 is normal speed; 2 plays an octave up and twice as fast. */
  playbackRate?: number;
};

const DEFAULT_PLAY_SOUND_OPTIONS = {
  volume: 1,
  playbackRate: 1,
};

type NoiseBufferOptions = {
  /** Seconds of noise; loops seamlessly enough for ambience. */
  duration: number;
  /** white is hiss; brown is a deep rumble — machinery, wind, surf. */
  kind?: "white" | "brown";
};

const DEFAULT_NOISE_BUFFER_OPTIONS = {
  kind: "white" as "white" | "brown",
};

type PlayLoopOptions = {
  /** Gain, 0..1. */
  volume?: number;
};

const DEFAULT_PLAY_LOOP_OPTIONS = {
  volume: 1,
};

/** A handle to a playing sound: adjust its volume live, or stop it. */
export type SoundHandle = {
  setVolume(volume: number): void;
  stop(): void;
};

/** How quickly setVolume changes take effect, seconds — avoids zipper noise. */
const VOLUME_SMOOTHING_SECONDS = 0.05;

type ToneOptions = {
  /** Start frequency, Hz. */
  frequency: number;
  /** Frequency to glide to by the end of the tone; omit for a steady pitch. */
  endFrequency?: number;
  /** Seconds. */
  duration: number;
  /** Waveform. Square and sawtooth read as retro. */
  oscillator?: OscillatorType;
  /** Peak gain, 0..1 — tones are piercing at full volume. */
  volume?: number;
  /** Seconds from now to start; lets a few tones form a little tune. */
  delay?: number;
};

const DEFAULT_TONE_OPTIONS = {
  oscillator: "sine" as OscillatorType,
  volume: 0.2,
  delay: 0,
};

/**
 * The one audio door: a lazily created AudioContext behind two ways to make
 * noise — playSound for decoded audio files, playTone for synthesized
 * effects that need no assets at all (an oscillator with an exponential
 * decay envelope, the classic chiptune voice).
 *
 * Browsers keep audio suspended until a user gesture; every play attempt
 * calls resume(), so the first one that happens during (or after) a
 * gesture unlocks the context for good.
 */
export class AudioPlayer {
  private context: AudioContext | null = null;
  private readonly createContext: () => AudioContext;

  constructor(options: AudioPlayerOptions = {}) {
    const resolved = { ...DEFAULT_AUDIO_PLAYER_OPTIONS, ...options };
    this.createContext = resolved.createContext;
  }

  private getContext(): AudioContext {
    if (!this.context) this.context = this.createContext();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  /**
   * Pokes the context so a suspended one resumes at the next user gesture.
   * Sounds started before any gesture (ambient loops) begin the moment this
   * succeeds — poll it from a system and audio unlocks as soon as it can.
   */
  resume(): void {
    this.getContext();
  }

  async loadSound(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    return this.getContext().decodeAudioData(bytes);
  }

  playSound(buffer: AudioBuffer, options: PlaySoundOptions = {}): SoundHandle {
    const { volume, playbackRate } = { ...DEFAULT_PLAY_SOUND_OPTIONS, ...options };
    const context = this.getContext();

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gain = context.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(context.destination);
    source.start();

    return {
      setVolume(nextVolume: number): void {
        gain.gain.setTargetAtTime(nextVolume, context.currentTime, VOLUME_SMOOTHING_SECONDS);
      },
      stop(): void {
        source.stop();
      },
    };
  }

  /** Synthesized noise to loop — ambience without an asset file. */
  createNoiseBuffer(options: NoiseBufferOptions): AudioBuffer {
    const { duration, kind } = { ...DEFAULT_NOISE_BUFFER_OPTIONS, ...options };
    const context = this.getContext();
    const sampleCount = Math.floor(duration * context.sampleRate);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const samples = buffer.getChannelData(0);

    if (kind === "white") {
      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
        samples[sampleIndex] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    // Brown noise: integrated white noise, rolling off the high end into a
    // rumble. The leak factor keeps the random walk from wandering away.
    let lastSample = 0;
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
      const white = Math.random() * 2 - 1;
      lastSample = (lastSample + 0.02 * white) / 1.02;
      samples[sampleIndex] = lastSample * 3.5;
    }
    return buffer;
  }

  /** Starts a sound looping forever; the handle adjusts it from outside. */
  playLoop(buffer: AudioBuffer, options: PlayLoopOptions = {}): SoundHandle {
    const { volume } = { ...DEFAULT_PLAY_LOOP_OPTIONS, ...options };
    const context = this.getContext();

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = context.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(context.destination);
    source.start();

    return {
      setVolume(nextVolume: number): void {
        gain.gain.setTargetAtTime(nextVolume, context.currentTime, VOLUME_SMOOTHING_SECONDS);
      },
      stop(): void {
        source.stop();
      },
    };
  }

  playTone(options: ToneOptions): void {
    const { frequency, endFrequency, duration, oscillator, volume, delay } = { ...DEFAULT_TONE_OPTIONS, ...options };
    const context = this.getContext();
    const startTime = context.currentTime + delay;
    const endTime = startTime + duration;

    const oscillatorNode = context.createOscillator();
    oscillatorNode.type = oscillator;
    oscillatorNode.frequency.setValueAtTime(frequency, startTime);
    if (endFrequency !== undefined) {
      oscillatorNode.frequency.exponentialRampToValueAtTime(endFrequency, endTime);
    }

    // The envelope: full volume at once, exponential fade to silence. The
    // ramp target cannot be exactly zero — exponential curves never reach it.
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    oscillatorNode.connect(gain);
    gain.connect(context.destination);
    oscillatorNode.start(startTime);
    oscillatorNode.stop(endTime);
  }
}
