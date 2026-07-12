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

  async loadSound(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    return this.getContext().decodeAudioData(bytes);
  }

  playSound(buffer: AudioBuffer, options: PlaySoundOptions = {}): void {
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
