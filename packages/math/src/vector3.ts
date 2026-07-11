import type { Quaternion } from "./quaternion";
import type { Matrix4x4 } from "./matrix4x4";

export class Vector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(vector: Vector3): this {
    return this.set(vector.x, vector.y, vector.z);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(vector: Vector3): this {
    this.x += vector.x;
    this.y += vector.y;
    this.z += vector.z;
    return this;
  }

  sub(vector: Vector3): this {
    this.x -= vector.x;
    this.y -= vector.y;
    this.z -= vector.z;
    return this;
  }

  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  addScaledVector(vector: Vector3, scalar: number): this {
    this.x += vector.x * scalar;
    this.y += vector.y * scalar;
    this.z += vector.z * scalar;
    return this;
  }

  dot(vector: Vector3): number {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  crossVectors(left: Vector3, right: Vector3): this {
    const ax = left.x, ay = left.y, az = left.z;
    const bx = right.x, by = right.y, bz = right.z;
    return this.set(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  }

  cross(vector: Vector3): this {
    return this.crossVectors(this, vector);
  }

  lengthSquared(): number {
    return this.dot(this);
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const magnitude = this.length();
    return magnitude > 0 ? this.multiplyScalar(1 / magnitude) : this;
  }

  distanceTo(vector: Vector3): number {
    const dx = this.x - vector.x, dy = this.y - vector.y, dz = this.z - vector.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  lerp(target: Vector3, alpha: number): this {
    this.x += (target.x - this.x) * alpha;
    this.y += (target.y - this.y) * alpha;
    this.z += (target.z - this.z) * alpha;
    return this;
  }

  applyQuaternion(quaternion: Quaternion): this {
    // v' = v + 2w(qv × v) + 2(qv × (qv × v)), with qv = (q.x, q.y, q.z)
    const { x, y, z } = this;
    const qx = quaternion.x, qy = quaternion.y, qz = quaternion.z, qw = quaternion.w;

    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);

    this.x = x + qw * tx + qy * tz - qz * ty;
    this.y = y + qw * ty + qz * tx - qx * tz;
    this.z = z + qw * tz + qx * ty - qy * tx;
    return this;
  }

  applyMatrix4x4(matrix: Matrix4x4): this {
    const { x, y, z } = this;
    const elements = matrix.elements;
    const w = elements[3]! * x + elements[7]! * y + elements[11]! * z + elements[15]!;
    const inverseW = w !== 0 ? 1 / w : 1;
    this.x = (elements[0]! * x + elements[4]! * y + elements[8]! * z + elements[12]!) * inverseW;
    this.y = (elements[1]! * x + elements[5]! * y + elements[9]! * z + elements[13]!) * inverseW;
    this.z = (elements[2]! * x + elements[6]! * y + elements[10]! * z + elements[14]!) * inverseW;
    return this;
  }

  toArray(array: number[] | Float32Array = [], offset = 0): typeof array {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  }

  fromArray(array: ArrayLike<number>, offset = 0): this {
    return this.set(array[offset]!, array[offset + 1]!, array[offset + 2]!);
  }
}

// The world axes as shared read-only constants. They are frozen, so calling a
// mutating method on one throws instead of silently corrupting every user of
// the constant — clone() one when you need a vector to write to.
export const AXIS_X = Object.freeze(new Vector3(1, 0, 0));
export const AXIS_Y = Object.freeze(new Vector3(0, 1, 0));
export const AXIS_Z = Object.freeze(new Vector3(0, 0, 1));
