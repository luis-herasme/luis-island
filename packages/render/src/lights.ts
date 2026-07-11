import { Vector3 } from "@game/math";
import { Node } from "./node";
import { Color } from "./color";

export class AmbientLight extends Node {
  color = new Color();

  constructor(hex = 0xffffff, public intensity = 0.2) {
    super();
    this.color.setHex(hex);
  }
}

export class DirectionalLight extends Node {
  color = new Color();
  /** Direction the light travels, in world space. Normalized by the renderer. */
  direction = new Vector3(0, -1, 0);

  constructor(hex = 0xffffff, public intensity = 1) {
    super();
    this.color.setHex(hex);
  }
}
