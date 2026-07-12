import { describe, expect, it } from "vitest";
import { AudioPlayer } from "./audio-player";

class FakeParameter {
  value = 0;
  events: [string, number, number][] = [];

  setValueAtTime(value: number, time: number): void {
    this.events.push(["set", value, time]);
  }

  exponentialRampToValueAtTime(value: number, time: number): void {
    this.events.push(["ramp", value, time]);
  }
}

class FakeNode {
  connections: unknown[] = [];
  type = "sine";
  frequency = new FakeParameter();
  gain = new FakeParameter();
  playbackRate = new FakeParameter();
  buffer: unknown = null;
  started: number[] = [];
  stopped: number[] = [];

  connect(target: unknown): void {
    this.connections.push(target);
  }

  start(time = 0): void {
    this.started.push(time);
  }

  stop(time = 0): void {
    this.stopped.push(time);
  }
}

class FakeAudioContext {
  state = "suspended";
  currentTime = 10;
  destination = { kind: "destination" };
  resumeCallCount = 0;
  oscillators: FakeNode[] = [];
  gains: FakeNode[] = [];
  bufferSources: FakeNode[] = [];

  resume(): Promise<void> {
    this.state = "running";
    this.resumeCallCount += 1;
    return Promise.resolve();
  }

  createOscillator(): FakeNode {
    const oscillator = new FakeNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeNode {
    const gain = new FakeNode();
    this.gains.push(gain);
    return gain;
  }

  createBufferSource(): FakeNode {
    const source = new FakeNode();
    this.bufferSources.push(source);
    return source;
  }
}

function createPlayer(): { player: AudioPlayer; fakeContext: FakeAudioContext } {
  const fakeContext = new FakeAudioContext();
  const player = new AudioPlayer({ createContext: () => fakeContext as unknown as AudioContext });
  return { player, fakeContext };
}

describe("AudioPlayer", () => {
  it("resumes a suspended context on the first play attempt", () => {
    const { player, fakeContext } = createPlayer();

    player.playTone({ frequency: 440, duration: 0.1 });

    expect(fakeContext.resumeCallCount).toBe(1);
    expect(fakeContext.state).toBe("running");
  });

  it("wires a tone through a gain envelope to the destination", () => {
    const { player, fakeContext } = createPlayer();

    player.playTone({ frequency: 440, endFrequency: 220, duration: 0.5, oscillator: "square", volume: 0.3 });

    const oscillator = fakeContext.oscillators[0]!;
    const gain = fakeContext.gains[0]!;

    expect(oscillator.type).toBe("square");
    expect(oscillator.frequency.events).toEqual([
      ["set", 440, 10],
      ["ramp", 220, 10.5],
    ]);
    expect(gain.gain.events).toEqual([
      ["set", 0.3, 10],
      ["ramp", 0.001, 10.5],
    ]);
    expect(oscillator.connections).toEqual([gain]);
    expect(gain.connections).toEqual([fakeContext.destination]);
    expect(oscillator.started).toEqual([10]);
    expect(oscillator.stopped).toEqual([10.5]);
  });

  it("delays a tone by the requested time", () => {
    const { player, fakeContext } = createPlayer();

    player.playTone({ frequency: 440, duration: 0.2, delay: 0.1 });

    const oscillator = fakeContext.oscillators[0]!;
    expect(oscillator.started[0]).toBeCloseTo(10.1);
    expect(oscillator.stopped[0]).toBeCloseTo(10.3);
  });

  it("plays a decoded buffer through a gain", () => {
    const { player, fakeContext } = createPlayer();
    const buffer = { kind: "buffer" };

    player.playSound(buffer as unknown as AudioBuffer, { volume: 0.5, playbackRate: 2 });

    const source = fakeContext.bufferSources[0]!;
    const gain = fakeContext.gains[0]!;

    expect(source.buffer).toBe(buffer);
    expect(source.playbackRate.value).toBe(2);
    expect(gain.gain.value).toBe(0.5);
    expect(source.connections).toEqual([gain]);
    expect(gain.connections).toEqual([fakeContext.destination]);
    expect(source.started.length).toBe(1);
  });
});
