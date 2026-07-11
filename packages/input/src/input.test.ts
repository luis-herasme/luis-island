import { describe, expect, it } from "vitest";
import { Keyboard } from "./keyboard";

function keyEvent(type: "keydown" | "keyup", code: string): Event {
  return Object.assign(new Event(type), { code });
}

describe("Keyboard", () => {
  it("tracks pressed and released keys", () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);

    expect(keyboard.isPressed("KeyW")).toBe(false);

    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    expect(keyboard.isPressed("KeyW")).toBe(true);

    target.dispatchEvent(keyEvent("keyup", "KeyW"));
    expect(keyboard.isPressed("KeyW")).toBe(false);
  });

  it("maps opposing keys to an axis", () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);

    expect(keyboard.axis({ negative: "KeyA", positive: "KeyD" })).toBe(0);

    target.dispatchEvent(keyEvent("keydown", "KeyD"));
    expect(keyboard.axis({ negative: "KeyA", positive: "KeyD" })).toBe(1);

    target.dispatchEvent(keyEvent("keydown", "KeyA"));
    expect(keyboard.axis({ negative: "KeyA", positive: "KeyD" })).toBe(0); // both held cancel out

    target.dispatchEvent(keyEvent("keyup", "KeyD"));
    expect(keyboard.axis({ negative: "KeyA", positive: "KeyD" })).toBe(-1);
  });

  it("clears held keys when the window loses focus", () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);

    target.dispatchEvent(keyEvent("keydown", "KeyW"));
    target.dispatchEvent(new Event("blur"));

    expect(keyboard.isPressed("KeyW")).toBe(false);
  });

  it("stops listening after dispose", () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);

    keyboard.dispose();
    target.dispatchEvent(keyEvent("keydown", "KeyW"));

    expect(keyboard.isPressed("KeyW")).toBe(false);
  });
});
