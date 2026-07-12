type AxisOptions = {
  negative: string;
  positive: string;
};

/**
 * Tracks which keys are currently held down, by KeyboardEvent.code
 * ("KeyW", "ArrowLeft", "Space", ...). Codes name physical keys, so WASD
 * controls stay in place on non-QWERTY layouts.
 *
 * The target is injectable so game logic can be driven by a plain
 * EventTarget in tests; it defaults to window in the browser.
 */
export class Keyboard {
  private readonly pressedKeys = new Set<string>();

  private readonly handleKeyDown = (event: Event) => {
    this.pressedKeys.add((event as KeyboardEvent).code);
  };

  private readonly handleKeyUp = (event: Event) => {
    this.pressedKeys.delete((event as KeyboardEvent).code);
  };

  // Without this, a key held while the window loses focus (alt-tab) never
  // receives its keyup and would read as pressed forever.
  private readonly handleBlur = () => {
    this.pressedKeys.clear();
  };

  constructor(private readonly target: EventTarget = window) {
    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.target.addEventListener("blur", this.handleBlur);
  }

  isPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  /**
   * -1, 0 or 1 from a pair of opposing keys — the usual shape for movement:
   * keyboard.axis({ negative: "KeyA", positive: "KeyD" }). Both held cancel
   * out to 0.
   */
  axis(options: AxisOptions): number {
    let value = 0;
    if (this.isPressed(options.positive)) value += 1;
    if (this.isPressed(options.negative)) value -= 1;
    return value;
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.pressedKeys.clear();
  }
}
