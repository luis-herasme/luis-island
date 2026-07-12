import { MagnificationFilter, MinificationFilter, Texture } from "@game/render";

/**
 * Text becomes a texture through a hidden canvas: draw a rounded dark pill
 * with the text in white, read the pixels back, and upload them. The pill
 * keeps labels readable over any background.
 */

const FONT_SIZE_PIXELS = 44;
const HORIZONTAL_PADDING_PIXELS = 22;
const VERTICAL_PADDING_PIXELS = 12;
const PILL_COLOR = "rgba(10, 16, 24, 0.78)";
const TEXT_COLOR = "#ffffff";

export type TextTexture = {
  texture: Texture;
  /** Pixel aspect ratio (width / height) — sizes the quad that shows it. */
  aspect: number;
};

export function createTextTexture(text: string): TextTexture {
  const canvas = document.createElement("canvas");
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) throw new Error("Failed to create a 2d canvas context");

  const font = `600 ${FONT_SIZE_PIXELS}px system-ui, sans-serif`;
  canvasContext.font = font;
  const textWidth = canvasContext.measureText(text).width;

  canvas.width = Math.ceil(textWidth) + HORIZONTAL_PADDING_PIXELS * 2;
  canvas.height = FONT_SIZE_PIXELS + VERTICAL_PADDING_PIXELS * 2;

  // Resizing the canvas resets the context state, so the font is set again.
  canvasContext.font = font;
  canvasContext.textAlign = "center";
  canvasContext.textBaseline = "middle";

  canvasContext.fillStyle = PILL_COLOR;
  canvasContext.beginPath();
  canvasContext.roundRect(0, 0, canvas.width, canvas.height, canvas.height / 2);
  canvasContext.fill();

  canvasContext.fillStyle = TEXT_COLOR;
  canvasContext.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
  const texture = Texture.fromPixels({
    width: canvas.width,
    height: canvas.height,
    bytes: new Uint8Array(imageData.data.buffer),
  });
  texture.minificationFilter = MinificationFilter.LinearMipmapLinear;
  texture.magnificationFilter = MagnificationFilter.Linear;

  return { texture, aspect: canvas.width / canvas.height };
}
