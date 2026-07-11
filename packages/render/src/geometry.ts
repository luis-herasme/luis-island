export class Geometry {
  constructor(
    public positions: Float32Array,
    public normals: Float32Array,
    public indices: Uint16Array,
  ) {}
}

/** Axis-aligned box centered at the origin. 24 vertices (4 per face) so normals are flat. */
export function createBoxGeometry(width = 1, height = 1, depth = 1): Geometry {
  const halfWidth = width / 2, halfHeight = height / 2, halfDepth = depth / 2;

  // prettier-ignore
  const positions = new Float32Array([
    // +X
    halfWidth, -halfHeight, -halfDepth,  halfWidth, halfHeight, -halfDepth,
    halfWidth, halfHeight, halfDepth,  halfWidth, -halfHeight, halfDepth,
    // -X
    -halfWidth, -halfHeight, halfDepth,  -halfWidth, halfHeight, halfDepth,
    -halfWidth, halfHeight, -halfDepth,  -halfWidth, -halfHeight, -halfDepth,
    // +Y
    -halfWidth, halfHeight, -halfDepth,  -halfWidth, halfHeight, halfDepth,
    halfWidth, halfHeight, halfDepth,  halfWidth, halfHeight, -halfDepth,
    // -Y
    -halfWidth, -halfHeight, halfDepth,  -halfWidth, -halfHeight, -halfDepth,
    halfWidth, -halfHeight, -halfDepth,  halfWidth, -halfHeight, halfDepth,
    // +Z
    -halfWidth, -halfHeight, halfDepth,  halfWidth, -halfHeight, halfDepth,
    halfWidth, halfHeight, halfDepth,  -halfWidth, halfHeight, halfDepth,
    // -Z
    halfWidth, -halfHeight, -halfDepth,  -halfWidth, -halfHeight, -halfDepth,
    -halfWidth, halfHeight, -halfDepth,  halfWidth, halfHeight, -halfDepth,
  ]);

  const faceNormals = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  const normals = new Float32Array(24 * 3);
  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    const [nx, ny, nz] = faceNormals[faceIndex]!;
    for (let vertexIndex = 0; vertexIndex < 4; vertexIndex++) {
      normals.set([nx!, ny!, nz!], (faceIndex * 4 + vertexIndex) * 3);
    }
  }

  const indices = new Uint16Array(36);
  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    const offset = faceIndex * 4;
    indices.set([offset, offset + 1, offset + 2, offset, offset + 2, offset + 3], faceIndex * 6);
  }

  return new Geometry(positions, normals, indices);
}

/** Flat plane in the XZ plane facing +Y, centered at the origin. */
export function createPlaneGeometry(width = 1, depth = 1): Geometry {
  const halfWidth = width / 2, halfDepth = depth / 2;
  const positions = new Float32Array([
    -halfWidth, 0, -halfDepth, -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth, halfWidth, 0, -halfDepth,
  ]);
  const normals = new Float32Array([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  return new Geometry(positions, normals, indices);
}
