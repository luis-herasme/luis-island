import type { Vector3 } from "./vector3";
import type { Quaternion } from "./quaternion";

/** 4x4 matrix, column-major storage (WebGL convention). */
export class Matrix4x4 {
  elements = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  identity(): this {
    this.elements.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return this;
  }

  copy(matrix: Matrix4x4): this {
    this.elements.set(matrix.elements);
    return this;
  }

  clone(): Matrix4x4 {
    return new Matrix4x4().copy(this);
  }

  multiplyMatrices(left: Matrix4x4, right: Matrix4x4): this {
    const leftElements = left.elements;
    const rightElements = right.elements;
    const elements = this.elements;
    for (let column = 0; column < 4; column++) {
      const right0 = rightElements[column * 4]!;
      const right1 = rightElements[column * 4 + 1]!;
      const right2 = rightElements[column * 4 + 2]!;
      const right3 = rightElements[column * 4 + 3]!;
      elements[column * 4] =
        leftElements[0]! * right0 + leftElements[4]! * right1 +
        leftElements[8]! * right2 + leftElements[12]! * right3;
      elements[column * 4 + 1] =
        leftElements[1]! * right0 + leftElements[5]! * right1 +
        leftElements[9]! * right2 + leftElements[13]! * right3;
      elements[column * 4 + 2] =
        leftElements[2]! * right0 + leftElements[6]! * right1 +
        leftElements[10]! * right2 + leftElements[14]! * right3;
      elements[column * 4 + 3] =
        leftElements[3]! * right0 + leftElements[7]! * right1 +
        leftElements[11]! * right2 + leftElements[15]! * right3;
    }
    return this;
  }

  multiply(matrix: Matrix4x4): this {
    return this.multiplyMatrices(this, matrix);
  }

  /** Build from position, rotation and scale (TRS). */
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const elements = this.elements;
    const { x, y, z, w } = quaternion;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const scaleX = scale.x, scaleY = scale.y, scaleZ = scale.z;

    elements[0] = (1 - (yy + zz)) * scaleX;
    elements[1] = (xy + wz) * scaleX;
    elements[2] = (xz - wy) * scaleX;
    elements[3] = 0;

    elements[4] = (xy - wz) * scaleY;
    elements[5] = (1 - (xx + zz)) * scaleY;
    elements[6] = (yz + wx) * scaleY;
    elements[7] = 0;

    elements[8] = (xz + wy) * scaleZ;
    elements[9] = (yz - wx) * scaleZ;
    elements[10] = (1 - (xx + yy)) * scaleZ;
    elements[11] = 0;

    elements[12] = position.x;
    elements[13] = position.y;
    elements[14] = position.z;
    elements[15] = 1;
    return this;
  }

  /** Split into position, rotation and scale (TRS). Inverse of compose. */
  decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this {
    const elements = this.elements;

    let scaleX = Math.hypot(elements[0]!, elements[1]!, elements[2]!);
    const scaleY = Math.hypot(elements[4]!, elements[5]!, elements[6]!);
    const scaleZ = Math.hypot(elements[8]!, elements[9]!, elements[10]!);

    // A negative determinant means the basis is mirrored; fold the flip into one axis.
    const determinant =
      elements[0]! * (elements[5]! * elements[10]! - elements[6]! * elements[9]!) -
      elements[4]! * (elements[1]! * elements[10]! - elements[2]! * elements[9]!) +
      elements[8]! * (elements[1]! * elements[6]! - elements[2]! * elements[5]!);
    if (determinant < 0) scaleX = -scaleX;

    position.set(elements[12]!, elements[13]!, elements[14]!);
    scale.set(scaleX, scaleY, scaleZ);

    const rotation = sharedDecomposeMatrix.copy(this);
    const rotationElements = rotation.elements;
    const inverseScaleX = 1 / scaleX;
    const inverseScaleY = 1 / scaleY;
    const inverseScaleZ = 1 / scaleZ;
    rotationElements[0] = rotationElements[0]! * inverseScaleX;
    rotationElements[1] = rotationElements[1]! * inverseScaleX;
    rotationElements[2] = rotationElements[2]! * inverseScaleX;
    rotationElements[4] = rotationElements[4]! * inverseScaleY;
    rotationElements[5] = rotationElements[5]! * inverseScaleY;
    rotationElements[6] = rotationElements[6]! * inverseScaleY;
    rotationElements[8] = rotationElements[8]! * inverseScaleZ;
    rotationElements[9] = rotationElements[9]! * inverseScaleZ;
    rotationElements[10] = rotationElements[10]! * inverseScaleZ;
    quaternion.setFromRotationMatrix(rotation);

    return this;
  }

  invert(): this {
    // general 4x4 inverse via cofactors (gl-matrix derivation);
    // a## are matrix entries, b## are 2x2 sub-determinants
    const elements = this.elements;
    const a00 = elements[0]!, a01 = elements[1]!, a02 = elements[2]!, a03 = elements[3]!;
    const a10 = elements[4]!, a11 = elements[5]!, a12 = elements[6]!, a13 = elements[7]!;
    const a20 = elements[8]!, a21 = elements[9]!, a22 = elements[10]!, a23 = elements[11]!;
    const a30 = elements[12]!, a31 = elements[13]!, a32 = elements[14]!, a33 = elements[15]!;

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let determinant =
      b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (determinant === 0) {
      this.elements.fill(0);
      return this;
    }
    determinant = 1 / determinant;

    elements[0] = (a11 * b11 - a12 * b10 + a13 * b09) * determinant;
    elements[1] = (a02 * b10 - a01 * b11 - a03 * b09) * determinant;
    elements[2] = (a31 * b05 - a32 * b04 + a33 * b03) * determinant;
    elements[3] = (a22 * b04 - a21 * b05 - a23 * b03) * determinant;
    elements[4] = (a12 * b08 - a10 * b11 - a13 * b07) * determinant;
    elements[5] = (a00 * b11 - a02 * b08 + a03 * b07) * determinant;
    elements[6] = (a32 * b02 - a30 * b05 - a33 * b01) * determinant;
    elements[7] = (a20 * b05 - a22 * b02 + a23 * b01) * determinant;
    elements[8] = (a10 * b10 - a11 * b08 + a13 * b06) * determinant;
    elements[9] = (a01 * b08 - a00 * b10 - a03 * b06) * determinant;
    elements[10] = (a30 * b04 - a31 * b02 + a33 * b00) * determinant;
    elements[11] = (a21 * b02 - a20 * b04 - a23 * b00) * determinant;
    elements[12] = (a11 * b07 - a10 * b09 - a12 * b06) * determinant;
    elements[13] = (a00 * b09 - a01 * b07 + a02 * b06) * determinant;
    elements[14] = (a31 * b01 - a30 * b03 - a32 * b00) * determinant;
    elements[15] = (a20 * b03 - a21 * b01 + a22 * b00) * determinant;
    return this;
  }

  transpose(): this {
    const elements = this.elements;
    let swap;
    swap = elements[1]!; elements[1] = elements[4]!; elements[4] = swap;
    swap = elements[2]!; elements[2] = elements[8]!; elements[8] = swap;
    swap = elements[6]!; elements[6] = elements[9]!; elements[9] = swap;
    swap = elements[3]!; elements[3] = elements[12]!; elements[12] = swap;
    swap = elements[7]!; elements[7] = elements[13]!; elements[13] = swap;
    swap = elements[11]!; elements[11] = elements[14]!; elements[14] = swap;
    return this;
  }

  /**
   * Right-handed perspective projection, depth range [-1, 1].
   * fieldOfView is vertical, in radians.
   */
  perspective(fieldOfView: number, aspect: number, near: number, far: number): this {
    const focal = 1 / Math.tan(fieldOfView / 2);
    const inverseRange = 1 / (near - far);
    this.elements.set([
      focal / aspect, 0, 0, 0,
      0, focal, 0, 0,
      0, 0, (far + near) * inverseRange, -1,
      0, 0, 2 * far * near * inverseRange, 0,
    ]);
    return this;
  }

  /**
   * World transform positioned at eye, rotated so -Z faces target (gl-matrix "targetTo").
   * The rotation counterpart of lookAt: lookAt maps world→camera, targetTo maps camera→world.
   */
  targetTo(eye: Vector3, target: Vector3, up: Vector3): this {
    let zx = eye.x - target.x, zy = eye.y - target.y, zz = eye.z - target.z;
    let magnitude = Math.hypot(zx, zy, zz);
    if (magnitude === 0) { zz = 1; magnitude = 1; }
    zx /= magnitude; zy /= magnitude; zz /= magnitude;

    let xx = up.y * zz - up.z * zy;
    let xy = up.z * zx - up.x * zz;
    let xz = up.x * zy - up.y * zx;
    magnitude = Math.hypot(xx, xy, xz);
    if (magnitude === 0) { xx = 1; magnitude = 1; }
    xx /= magnitude; xy /= magnitude; xz /= magnitude;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    this.elements.set([
      xx, xy, xz, 0,
      yx, yy, yz, 0,
      zx, zy, zz, 0,
      eye.x, eye.y, eye.z, 1,
    ]);
    return this;
  }

  /** Right-handed view matrix looking from eye toward target. */
  lookAt(eye: Vector3, target: Vector3, up: Vector3): this {
    let zx = eye.x - target.x, zy = eye.y - target.y, zz = eye.z - target.z;
    let magnitude = Math.hypot(zx, zy, zz);
    if (magnitude === 0) { zz = 1; magnitude = 1; }
    zx /= magnitude; zy /= magnitude; zz /= magnitude;

    let xx = up.y * zz - up.z * zy;
    let xy = up.z * zx - up.x * zz;
    let xz = up.x * zy - up.y * zx;
    magnitude = Math.hypot(xx, xy, xz);
    if (magnitude === 0) { xx = 1; magnitude = 1; }
    xx /= magnitude; xy /= magnitude; xz /= magnitude;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    this.elements.set([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye.x + xy * eye.y + xz * eye.z),
      -(yx * eye.x + yy * eye.y + yz * eye.z),
      -(zx * eye.x + zy * eye.y + zz * eye.z),
      1,
    ]);
    return this;
  }
}

/** Scratch matrix for decompose(), so extracting the rotation allocates nothing. */
const sharedDecomposeMatrix = new Matrix4x4();
