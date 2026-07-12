/** Anything with numeric x/y fields — see Vector3Like. */
export type Vector2Like = { x: number; y: number };

export class Vector2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(vector: Vector2Like): this {
    return this.set(vector.x, vector.y);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  add(vector: Vector2Like): this {
    this.x += vector.x;
    this.y += vector.y;
    return this;
  }

  sub(vector: Vector2Like): this {
    this.x -= vector.x;
    this.y -= vector.y;
    return this;
  }

  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  addScaledVector(vector: Vector2Like, scalar: number): this {
    this.x += vector.x * scalar;
    this.y += vector.y * scalar;
    return this;
  }

  dot(vector: Vector2Like): number {
    return this.x * vector.x + this.y * vector.y;
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const length = this.length();
    if (length === 0) return this;
    return this.multiplyScalar(1 / length);
  }

  distanceTo(vector: Vector2Like): number {
    return Math.hypot(this.x - vector.x, this.y - vector.y);
  }

  lerp(target: Vector2Like, alpha: number): this {
    this.x += (target.x - this.x) * alpha;
    this.y += (target.y - this.y) * alpha;
    return this;
  }

  toArray(array: number[] | Float32Array = [], offset = 0): typeof array {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    return array;
  }

  fromArray(array: ArrayLike<number>, offset = 0): this {
    this.x = array[offset]!;
    this.y = array[offset + 1]!;
    return this;
  }
}
