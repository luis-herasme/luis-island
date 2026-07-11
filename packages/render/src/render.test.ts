import { describe, expect, it } from "vitest";
import { Matrix4, Quaternion, Vector3 } from "@game/math";
import { parseOBJ } from "./objParser";
import { Transform2D, Transform3D } from "./transform";
import {
  Data,
  InterleavedVertexBuffer,
  VertexBuffer,
  VertexComponentType,
  VertexData,
  vertexLayoutsFromVertexDataArray,
} from "./vertexBuffer";

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
    const vertexBuffer = new VertexBuffer(
      new VertexData("position", Data.vector2([[0, 0], [1, 0], [1, 1]])),
    );

    expect(vertexBuffer.layout.offset).toBe(0);
    expect(vertexBuffer.layout.stride).toBe(8);
    expect(vertexBuffer.vertexCount).toBe(3);
  });

  it("aligns interleaved attribute offsets to their component size", () => {
    const layouts = vertexLayoutsFromVertexDataArray([
      new VertexData("color", Data.unsignedByteVector3([[255, 0, 0]]), { normalize: true }),
      new VertexData("position", Data.vector2([[0, 0]])),
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
    const interleaved = new InterleavedVertexBuffer([
      new VertexData("scalar", Data.unsignedByte([1, 2])),
      new VertexData("pair", Data.unsignedShortVector2([[3, 4], [5, 6]])),
    ]);

    expect(interleaved.stride).toBe(6);
    expect(interleaved.vertexCount).toBe(2);

    expect(interleaved.getVertexByteOffset("scalar", 1)).toBe(6);
    expect(interleaved.getVertexByteOffset("pair", 1)).toBe(8);
    expect(interleaved.getVertexByteOffset("missing", 0)).toBeNull();
  });

  it("updates a single vertex attribute in an interleaved buffer", () => {
    const interleaved = new InterleavedVertexBuffer([
      new VertexData("scalar", Data.unsignedByte([1, 2])),
      new VertexData("pair", Data.unsignedShortVector2([[3, 4], [5, 6]])),
    ]);

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

describe("Transform2D", () => {
  it("builds a column-major scale/rotation/translation matrix", () => {
    const transform = new Transform2D();
    transform.scale.set(2, 3);
    transform.rotation = Math.PI / 2;
    transform.translation.set(4, 5);

    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = transform.toArray();

    expect(m00).toBeCloseTo(0);
    expect(m01).toBeCloseTo(2);
    expect(m02).toBe(0);
    expect(m10).toBeCloseTo(-3);
    expect(m11).toBeCloseTo(0);
    expect(m12).toBe(0);
    expect(m20).toBe(4);
    expect(m21).toBe(5);
    expect(m22).toBe(1);
  });
});

describe("Transform3D", () => {
  it("round-trips through a matrix", () => {
    const transform = new Transform3D();
    transform.translation.set(1, 2, 3);
    transform.scale.set(2, 2, 2);
    transform.rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 3);

    const recovered = Transform3D.fromMatrix4(transform.toMatrix4());

    expect(recovered.translation.x).toBeCloseTo(1);
    expect(recovered.translation.y).toBeCloseTo(2);
    expect(recovered.translation.z).toBeCloseTo(3);
    expect(recovered.scale.x).toBeCloseTo(2);
    expect(recovered.scale.y).toBeCloseTo(2);
    expect(recovered.scale.z).toBeCloseTo(2);

    // q and -q are the same rotation, so compare via |dot| instead of components.
    const expected = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 3);
    expect(Math.abs(quaternionDot(recovered.rotation, expected))).toBeCloseTo(1);
  });

  it("writes the transform into a provided matrix", () => {
    const transform = new Transform3D();
    transform.translation.set(7, 8, 9);

    const target = new Matrix4();
    const result = transform.toMatrix4(target);

    expect(result).toBe(target);
    expect(target.elements[12]).toBe(7);
    expect(target.elements[13]).toBe(8);
    expect(target.elements[14]).toBe(9);
  });
});

function quaternionDot(left: Quaternion, right: Quaternion): number {
  return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
}
