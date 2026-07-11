import { BufferUsage } from "./buffer-gpu";
import { IndexBuffer } from "./index-buffer";
import type { OBJ } from "./obj-parser";
import { Transform2D } from "@game/math";
import { Data, InterleavedVertexBuffer, VertexBuffer, VertexData } from "./vertex-buffer";

// prettier-ignore
const QUAD_POSITIONS: [number, number][] = [
  [0.5, 0.5],   // Top right
  [0.5, -0.5],  // Bottom right
  [-0.5, -0.5], // Bottom left
  [-0.5, 0.5],  // Top left
];

// prettier-ignore
const QUAD_COLORS: [number, number, number][] = [
  [255, 0, 0], // Top right
  [0, 255, 0], // Bottom right
  [0, 0, 255], // Bottom left
  [0, 255, 0], // Top left
];

// prettier-ignore
const QUAD_UVS: [number, number][] = [
  [1, 1], // Top right
  [1, 0], // Bottom right
  [0, 0], // Bottom left
  [0, 1], // Top left
];

// prettier-ignore
const QUAD_INDICES: number[] = [
  0, 1, 2, // Triangle #1
  2, 3, 0, // Triangle #2
];

/**
 * The vertex data of a mesh: any number of single-attribute and interleaved
 * buffers, optional indices, and an optional instance count.
 */
export class Geometry {
  instanceCount: number | null;
  vertexCount: number;
  indices: IndexBuffer | null;
  vertexBuffers: VertexBuffer[];
  interleavedVertexBuffers: InterleavedVertexBuffer[];

  constructor(options: {
    vertexCount: number;
    instanceCount?: number | null;
    indices?: IndexBuffer | null;
    vertexBuffers?: VertexBuffer[];
    interleavedVertexBuffers?: InterleavedVertexBuffer[];
  }) {
    this.vertexCount = options.vertexCount;
    this.instanceCount = options.instanceCount ?? null;
    this.indices = options.indices ?? null;
    this.vertexBuffers = options.vertexBuffers ?? [];
    this.interleavedVertexBuffers = options.interleavedVertexBuffers ?? [];
  }

  getVertexBuffer(name: string): VertexBuffer | null {
    return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.layout.name === name) ?? null;
  }

  /**
   * Returns the InterleavedVertexBuffer that contains the specified vertex
   * attribute, if any. A single interleaved buffer can store multiple
   * attributes, so mutating it directly may affect other attributes.
   */
  getInterleavedVertexBuffer(name: string): InterleavedVertexBuffer | null {
    return (
      this.interleavedVertexBuffers.find((interleavedVertexBuffer) =>
        interleavedVertexBuffer.layouts.some((layout) => layout.name === name),
      ) ?? null
    );
  }

  static fromVertexBuffer(vertexBuffer: VertexBuffer): Geometry {
    return new Geometry({
      vertexCount: vertexBuffer.vertexCount,
      vertexBuffers: [vertexBuffer],
    });
  }

  static fromInterleavedVertexBuffer(interleavedVertexBuffer: InterleavedVertexBuffer): Geometry {
    return new Geometry({
      vertexCount: interleavedVertexBuffer.vertexCount,
      interleavedVertexBuffers: [interleavedVertexBuffer],
    });
  }

  /** Builds an interleaved position/normal/uv geometry from a parsed OBJ. */
  static fromOBJ(obj: OBJ): Geometry {
    const positions: [number, number, number][] = [];
    const normals: [number, number, number][] = [];
    const uvs: [number, number][] = [];

    for (const face of obj.faces) {
      const positionIndex = face[0] - 1;
      const uvIndex = face[1] - 1;
      const normalIndex = face[2] - 1;

      positions.push(obj.positions[positionIndex]!);
      normals.push(obj.normals[normalIndex]!);
      uvs.push(obj.uvs[uvIndex]!);
    }

    return Geometry.fromInterleavedVertexBuffer(
      new InterleavedVertexBuffer([
        new VertexData("position", Data.vector3(positions)),
        new VertexData("normal", Data.vector3(normals)),
        new VertexData("uv", Data.vector2(uvs)),
      ]),
    );
  }

  static box(): Geometry {
    // prettier-ignore
    const positions: [number, number, number][] = [
      // Front face (z = 0.5)
      [0.5, 0.5, 0.5],   // 0: Top-right
      [0.5, -0.5, 0.5],  // 1: Bottom-right
      [-0.5, -0.5, 0.5], // 2: Bottom-left
      [-0.5, 0.5, 0.5],  // 3: Top-left
      // Back face (z = -0.5)
      [0.5, 0.5, -0.5],   // 4: Top-right
      [-0.5, 0.5, -0.5],  // 5: Top-left
      [-0.5, -0.5, -0.5], // 6: Bottom-left
      [0.5, -0.5, -0.5],  // 7: Bottom-right
      // Top face (y = 0.5)
      [0.5, 0.5, -0.5],  // 8: Back-right
      [0.5, 0.5, 0.5],   // 9: Front-right
      [-0.5, 0.5, 0.5],  // 10: Front-left
      [-0.5, 0.5, -0.5], // 11: Back-left
      // Bottom face (y = -0.5)
      [0.5, -0.5, 0.5],   // 12: Front-right
      [0.5, -0.5, -0.5],  // 13: Back-right
      [-0.5, -0.5, -0.5], // 14: Back-left
      [-0.5, -0.5, 0.5],  // 15: Front-left
      // Right face (x = 0.5)
      [0.5, 0.5, -0.5],  // 16: Top-back
      [0.5, -0.5, -0.5], // 17: Bottom-back
      [0.5, -0.5, 0.5],  // 18: Bottom-front
      [0.5, 0.5, 0.5],   // 19: Top-front
      // Left face (x = -0.5)
      [-0.5, 0.5, 0.5],   // 20: Top-front
      [-0.5, -0.5, 0.5],  // 21: Bottom-front
      [-0.5, -0.5, -0.5], // 22: Bottom-back
      [-0.5, 0.5, -0.5],  // 23: Top-back
    ];

    // prettier-ignore
    const normals: [number, number, number][] = [
      // Front face
      [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
      // Back face
      [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
      // Top face
      [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
      // Bottom face
      [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0],
      // Right face
      [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
      // Left face
      [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
    ];

    // prettier-ignore
    const uvs: [number, number][] = [
      // Front face
      [1, 1], [1, 0], [0, 0], [0, 1],
      // Back face
      [0, 1], [1, 1], [1, 0], [0, 0],
      // Top face
      [1, 1], [1, 0], [0, 0], [0, 1],
      // Bottom face
      [1, 0], [1, 1], [0, 1], [0, 0],
      // Right face
      [0, 1], [0, 0], [1, 0], [1, 1],
      // Left face
      [1, 1], [1, 0], [0, 0], [0, 1],
    ];

    // prettier-ignore
    const indices = [
      0, 1, 2, 2, 3, 0,       // Front face
      4, 5, 6, 6, 7, 4,       // Back face
      8, 9, 10, 10, 11, 8,    // Top face
      12, 13, 14, 14, 15, 12, // Bottom face
      16, 17, 18, 18, 19, 16, // Right face
      20, 21, 22, 22, 23, 20, // Left face
    ];

    return new Geometry({
      vertexCount: 24,
      indices: IndexBuffer.fromUint8(indices),
      vertexBuffers: [
        new VertexBuffer(new VertexData("position", Data.vector3(positions))),
        new VertexBuffer(new VertexData("normal", Data.vector3(normals))),
        new VertexBuffer(new VertexData("uv", Data.vector2(uvs))),
      ],
    });
  }

  static quad(): Geometry {
    const [position, color, uvs] = quadData();

    return new Geometry({
      vertexCount: 4,
      indices: IndexBuffer.fromUint8(QUAD_INDICES),
      vertexBuffers: [new VertexBuffer(position), new VertexBuffer(color), new VertexBuffer(uvs)],
    });
  }

  static quadInterleaved(): Geometry {
    const [position, color, uvs] = quadData();

    return new Geometry({
      vertexCount: 4,
      indices: IndexBuffer.fromUint8(QUAD_INDICES),
      interleavedVertexBuffers: [new InterleavedVertexBuffer([position, color, uvs])],
    });
  }

  static quadInstanced(count: number): Geometry {
    const [position, color, uvs] = quadData();

    return new Geometry({
      vertexCount: 4,
      instanceCount: count,
      indices: IndexBuffer.fromUint8(QUAD_INDICES),
      vertexBuffers: [
        new VertexBuffer(color),
        new VertexBuffer(position),
        new VertexBuffer(uvs),
        new VertexBuffer(identityTransforms(count), BufferUsage.DynamicDraw),
      ],
    });
  }

  static quadInstancedAndInterleaved(count: number): Geometry {
    const [position, color, uvs] = quadData();

    return new Geometry({
      vertexCount: 4,
      instanceCount: count,
      indices: IndexBuffer.fromUint8(QUAD_INDICES),
      interleavedVertexBuffers: [new InterleavedVertexBuffer([position, color, uvs])],
      vertexBuffers: [new VertexBuffer(identityTransforms(count))],
    });
  }
}

function quadData(): [VertexData, VertexData, VertexData] {
  return [
    new VertexData("position", Data.vector2(QUAD_POSITIONS)),
    new VertexData("color", Data.unsignedByteVector3(QUAD_COLORS), { normalize: true }),
    new VertexData("uv", Data.vector2(QUAD_UVS)),
  ];
}

/** One identity 3x3 transform per instance, advanced once per instance (divisor 1). */
function identityTransforms(count: number): VertexData {
  const transforms: number[][] = [];
  for (let instance = 0; instance < count; instance++) {
    transforms.push(new Transform2D().toArray());
  }

  return new VertexData("transform", Data.matrix3(transforms), { divisor: 1 });
}
