# @game/input

The input abstraction. Game logic never reads DOM events directly — it asks
this package about the current input state, once per frame, inside a system.

`Keyboard` tracks held keys by `KeyboardEvent.code` (physical keys, so WASD
stays in place on non-QWERTY layouts):

```ts
import { Keyboard } from "@game/input";

const keyboard = new Keyboard();

// In a system, once per frame:
const moveX = keyboard.axis({ negative: "KeyA", positive: "KeyD" }); // -1 | 0 | 1
const jumping = keyboard.isPressed("Space");
```

Held keys are cleared when the window loses focus, so nothing sticks after
alt-tab. The event target is injectable (`new Keyboard(target)`), which keeps
the class testable without a browser and will let a headless game server feed
it recorded input.
