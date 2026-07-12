import type { Mesh } from "@game/render";
import { createSpriteMesh } from "./sprite-mesh";
import { createTextTexture } from "./text-texture";

type TextSpriteMeshOptions = {
  text: string;
  /** World-unit height of the label; width follows the text's aspect. */
  height: number;
};

/** A camera-facing quad textured with canvas-rendered text. */
export function createTextSpriteMesh(options: TextSpriteMeshOptions): Mesh {
  const { texture, aspect } = createTextTexture(options.text);
  return createSpriteMesh({ texture, width: options.height * aspect, height: options.height });
}
