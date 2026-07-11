import { describe, expect, it } from "vitest";
import { Transform2D } from "@game/math";
import { parseOBJ } from "./obj-parser";
import {
  Data,
  InterleavedVertexBuffer,
  VertexBuffer,
  VertexComponentType,
  VertexData,
  vertexLayoutsFromVertexDataArray,
} from "./vertex-buffer";

describe("Data", () => {
  it("derives count, component metadata and bytes", () => {
    const data = Data.vector3([
      [1, 2, 3],
      [4, 5, 6],
    ]);

    expect(data.count).toBe(2);
    expect(data.componentCount).toBe(3);
    expect(data.numberOfColumns).toBe(1);
    expect(data.componentType).toBe(VertexComponentType.Float);
    expect(data.sizeInBytes).toBe(12);
    expect(Array.from(new Float32Array(data.bytes.buffer))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("treats each matrix as one element with multiple columns", () => {
    const data = Data.matrix3([new Transform2D().toArray()]);

    expect(data.count).toBe(1);
    expect(data.componentCount).toBe(9);
    expect(data.numberOfColumns).toBe(3);
  });

  it("rejects elements with the wrong number of components", () => {
    expect(() => Data.vector2([[1, 2, 3]])).toThrow();
  });
});

describe("vertex layouts", () => {
  it("gives a single attribute a tightly packed layout", () => {
    const vertexBuffer = new VertexBuffer({
      vertexData: new VertexData({ name: "position", data: Data.vector2([[0, 0], [1, 0], [1, 1]]) }),
    });

    expect(vertexBuffer.layout.offset).toBe(0);
    expect(vertexBuffer.layout.stride).toBe(8);
    expect(vertexBuffer.vertexCount).toBe(3);
  });

  it("aligns interleaved attribute offsets to their component size", () => {
    const layouts = vertexLayoutsFromVertexDataArray([
      new VertexData({ name: "color", data: Data.unsignedByteVector3([[255, 0, 0]]), normalize: true }),
      new VertexData({ name: "position", data: Data.vector2([[0, 0]]) }),
    ]);

    const [color, position] = layouts;

    // 3 bytes of color, then padding so the float attribute starts at a 4-byte boundary.
    expect(color!.offset).toBe(0);
    expect(position!.offset).toBe(4);

    // 4 (padded color) + 8 (position) = 12, already a multiple of the max alignment (4).
    expect(color!.stride).toBe(12);
    expect(position!.stride).toBe(12);
  });

  it("interleaves attribute bytes per vertex", () => {
    const interleaved = new InterleavedVertexBuffer({
      attributes: [
        new VertexData({ name: "scalar", data: Data.unsignedByte([1, 2]) }),
        new VertexData({ name: "pair", data: Data.unsignedShortVector2([[3, 4], [5, 6]]) }),
      ],
    });

    expect(interleaved.stride).toBe(6);
    expect(interleaved.vertexCount).toBe(2);

    expect(interleaved.getVertexByteOffset("scalar", 1)).toBe(6);
    expect(interleaved.getVertexByteOffset("pair", 1)).toBe(8);
    expect(interleaved.getVertexByteOffset("missing", 0)).toBeNull();
  });

  it("updates a single vertex attribute in an interleaved buffer", () => {
    const interleaved = new InterleavedVertexBuffer({
      attributes: [
        new VertexData({ name: "scalar", data: Data.unsignedByte([1, 2]) }),
        new VertexData({ name: "pair", data: Data.unsignedShortVector2([[3, 4], [5, 6]]) }),
      ],
    });

    expect(interleaved.updateVertex("pair", 1, [7, 8])).toBe(true);
    expect(interleaved.updateVertex("missing", 0, [0])).toBe(false);
  });
});

describe("parseOBJ", () => {
  const objSource = [
    "# a triangle",
    "v 0 0 0",
    "v 1 0 0",
    "v 0 1 0",
    "vn 0 0 1",
    "vt 0 0",
    "vt 1 0",
    "vt 0 1",
    "f 1/1/1 2/2/1 3/3/1",
  ].join("\n");

  it("parses positions, normals, uvs and faces", () => {
    const obj = parseOBJ(objSource);

    expect(obj.positions).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(obj.normals).toEqual([[0, 0, 1]]);
    expect(obj.faces).toEqual([
      [1, 1, 1],
      [2, 2, 1],
      [3, 3, 1],
    ]);
  });

  it("flips the uv y coordinate", () => {
    const obj = parseOBJ(objSource);
    expect(obj.uvs).toEqual([
      [0, 1],
      [1, 1],
      [0, 0],
    ]);
  });

  it("rejects faces that reference missing data", () => {
    expect(() => parseOBJ("v 0 0 0\nvt 0 0\nvn 0 0 1\nf 2/1/1")).toThrow(/Invalid face index/);
  });

  it("ignores unsupported commands", () => {
    expect(() => parseOBJ("o object\ns off\nusemtl material")).not.toThrow();
  });
});

