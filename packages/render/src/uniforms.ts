import type { Matrix3, Matrix4 } from "@game/math";
import type { Texture } from "./texture";
import type { Transform2D, Transform3D } from "./transform";

// Mutable arrays because the WebGL uniform setters take Float32List/Int32List/Uint32List.
type NumberList = number[] | Float32Array;
type IntegerList = number[] | Int32Array;
type UnsignedIntegerList = number[] | Uint32Array;

export type Uniform =
  | { kind: "float"; value: number }
  | { kind: "vector2"; value: NumberList }
  | { kind: "vector3"; value: NumberList }
  | { kind: "vector4"; value: NumberList }
  | { kind: "int"; value: number }
  | { kind: "intVector2"; value: IntegerList }
  | { kind: "intVector3"; value: IntegerList }
  | { kind: "intVector4"; value: IntegerList }
  | { kind: "unsignedInt"; value: number }
  | { kind: "unsignedIntVector2"; value: UnsignedIntegerList }
  | { kind: "unsignedIntVector3"; value: UnsignedIntegerList }
  | { kind: "unsignedIntVector4"; value: UnsignedIntegerList }
  | { kind: "matrix2"; value: NumberList }
  | { kind: "matrix3"; value: NumberList }
  | { kind: "matrix4"; value: NumberList }
  | { kind: "texture"; texture: Texture };

export const Uniform = {
  float: (value: number): Uniform => ({ kind: "float", value }),
  vector2: (value: NumberList): Uniform => ({ kind: "vector2", value }),
  vector3: (value: NumberList): Uniform => ({ kind: "vector3", value }),
  vector4: (value: NumberList): Uniform => ({ kind: "vector4", value }),

  int: (value: number): Uniform => ({ kind: "int", value }),
  intVector2: (value: IntegerList): Uniform => ({ kind: "intVector2", value }),
  intVector3: (value: IntegerList): Uniform => ({ kind: "intVector3", value }),
  intVector4: (value: IntegerList): Uniform => ({ kind: "intVector4", value }),

  unsignedInt: (value: number): Uniform => ({ kind: "unsignedInt", value }),
  unsignedIntVector2: (value: UnsignedIntegerList): Uniform => ({ kind: "unsignedIntVector2", value }),
  unsignedIntVector3: (value: UnsignedIntegerList): Uniform => ({ kind: "unsignedIntVector3", value }),
  unsignedIntVector4: (value: UnsignedIntegerList): Uniform => ({ kind: "unsignedIntVector4", value }),

  matrix2: (value: NumberList): Uniform => ({ kind: "matrix2", value }),
  matrix3: (value: NumberList): Uniform => ({ kind: "matrix3", value }),
  matrix4: (value: NumberList): Uniform => ({ kind: "matrix4", value }),

  texture: (texture: Texture): Uniform => ({ kind: "texture", texture }),

  fromMatrix3: (matrix: Matrix3): Uniform => ({ kind: "matrix3", value: matrix.elements }),
  fromMatrix4: (matrix: Matrix4): Uniform => ({ kind: "matrix4", value: matrix.elements }),
  fromTransform2D: (transform: Transform2D): Uniform => ({ kind: "matrix3", value: transform.toArray() }),
  fromTransform3D: (transform: Transform3D): Uniform => ({ kind: "matrix4", value: transform.toArray() }),
};
