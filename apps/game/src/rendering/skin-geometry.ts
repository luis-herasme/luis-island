import { Data, Geometry, IndexBuffer, VertexBuffer, VertexData } from "@game/render";

/** Minecraft skins are 64x64 pixels; uv coordinates are pixels over this. */
const SKIN_TEXTURE_SIZE = 64;

export type SkinBoxOptions = {
  /** Top-left pixel of the part's unwrap region in the skin. */
  origin: [number, number];
  /** The part's dimensions in skin pixels: width (x), height (y), depth (z). */
  size: [number, number, number];
};

/** A face's pixel rectangle in the skin: left, top, right, bottom. */
type PixelRectangle = [number, number, number, number];

/**
 * A unit box UV-mapped the way Minecraft skins unwrap a body part: top and
 * bottom rectangles above a strip of right, front, left and back faces.
 * The avatar faces -Z, so the skin's front face lands on the box's -Z side
 * and the skin's right column on its +X side.
 */
export function createSkinBoxGeometry(options: SkinBoxOptions): Geometry {
  const [originU, originV] = options.origin;
  const [width, height, depth] = options.size;

  const rightRectangle: PixelRectangle = [originU, originV + depth, originU + depth, originV + depth + height];
  const frontRectangle: PixelRectangle = [
    originU + depth,
    originV + depth,
    originU + depth + width,
    originV + depth + height,
  ];
  const leftRectangle: PixelRectangle = [
    originU + depth + width,
    originV + depth,
    originU + 2 * depth + width,
    originV + depth + height,
  ];
  const backRectangle: PixelRectangle = [
    originU + 2 * depth + width,
    originV + depth,
    originU + 2 * depth + 2 * width,
    originV + depth + height,
  ];
  const topRectangle: PixelRectangle = [originU + depth, originV, originU + depth + width, originV + depth];
  const bottomRectangle: PixelRectangle = [
    originU + depth + width,
    originV,
    originU + depth + 2 * width,
    originV + depth,
  ];

  const positions: [number, number, number][] = [];
  const normals: [number, number, number][] = [];
  const uvs: [number, number][] = [];
  const indices: number[] = [];

  // corners: the face's vertices in texture order — top-left, top-right,
  // bottom-right, bottom-left of its rectangle.
  const addFace = (
    normal: [number, number, number],
    rectangle: PixelRectangle,
    corners: [number, number, number][],
  ): void => {
    const [left, top, right, bottom] = rectangle;
    const firstIndex = positions.length;

    positions.push(corners[0]!, corners[1]!, corners[2]!, corners[3]!);
    normals.push(normal, normal, normal, normal);
    uvs.push(
      [left / SKIN_TEXTURE_SIZE, top / SKIN_TEXTURE_SIZE],
      [right / SKIN_TEXTURE_SIZE, top / SKIN_TEXTURE_SIZE],
      [right / SKIN_TEXTURE_SIZE, bottom / SKIN_TEXTURE_SIZE],
      [left / SKIN_TEXTURE_SIZE, bottom / SKIN_TEXTURE_SIZE],
    );
    indices.push(firstIndex, firstIndex + 1, firstIndex + 2, firstIndex + 2, firstIndex + 3, firstIndex);
  };

  // Front: the character's face, on -Z. Its right (+X) is the viewer's left.
  addFace(
    [0, 0, -1],
    frontRectangle,
    [
      [0.5, 0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [-0.5, -0.5, -0.5],
      [0.5, -0.5, -0.5],
    ],
  );
  // Back, on +Z.
  addFace(
    [0, 0, 1],
    backRectangle,
    [
      [-0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, -0.5, 0.5],
      [-0.5, -0.5, 0.5],
    ],
  );
  // Right side (+X); its rectangle's right edge touches the front face.
  addFace(
    [1, 0, 0],
    rightRectangle,
    [
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, -0.5, 0.5],
    ],
  );
  // Left side (-X); its rectangle's left edge touches the front face.
  addFace(
    [-1, 0, 0],
    leftRectangle,
    [
      [-0.5, 0.5, -0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, -0.5, 0.5],
      [-0.5, -0.5, -0.5],
    ],
  );
  // Top (+Y); the rectangle's bottom edge touches the front face.
  addFace(
    [0, 1, 0],
    topRectangle,
    [
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, 0.5, -0.5],
      [0.5, 0.5, -0.5],
    ],
  );
  // Bottom (-Y).
  addFace(
    [0, -1, 0],
    bottomRectangle,
    [
      [0.5, -0.5, -0.5],
      [-0.5, -0.5, -0.5],
      [-0.5, -0.5, 0.5],
      [0.5, -0.5, 0.5],
    ],
  );

  return new Geometry({
    vertexCount: positions.length,
    indices: IndexBuffer.fromUint8(indices),
    vertexBuffers: [
      new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(positions) }) }),
      new VertexBuffer({ vertexData: new VertexData({ name: "normal", data: Data.vector3(normals) }) }),
      new VertexBuffer({ vertexData: new VertexData({ name: "uv", data: Data.vector2(uvs) }) }),
    ],
  });
}
