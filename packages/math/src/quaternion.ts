import type { Vector3 } from "./vector3";
import type { Matrix4 } from "./matrix4";

export class Quaternion {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  copy(quaternion: Quaternion): this {
    return this.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  identity(): this {
    return this.set(0, 0, 0, 1);
  }

  setFromAxisAngle(axis: Vector3, angle: number): this {
    // axis must be normalized
    const halfAngle = angle / 2;
    const sinHalfAngle = Math.sin(halfAngle);
    return this.set(
      axis.x * sinHalfAngle,
      axis.y * sinHalfAngle,
      axis.z * sinHalfAngle,
      Math.cos(halfAngle),
    );
  }

  /** Intrinsic XYZ euler angles, radians. */
  setFromEuler(x: number, y: number, z: number): this {
    const cosX = Math.cos(x / 2), sinX = Math.sin(x / 2);
    const cosY = Math.cos(y / 2), sinY = Math.sin(y / 2);
    const cosZ = Math.cos(z / 2), sinZ = Math.sin(z / 2);
    return this.set(
      sinX * cosY * cosZ + cosX * sinY * sinZ,
      cosX * sinY * cosZ - sinX * cosY * sinZ,
      cosX * cosY * sinZ + sinX * sinY * cosZ,
      cosX * cosY * cosZ - sinX * sinY * sinZ,
    );
  }

  /** Extract rotation from a matrix whose upper 3x3 is a pure rotation (no scale). */
  setFromRotationMatrix(matrix: Matrix4): this {
    const elements = matrix.elements;
    const m00 = elements[0]!, m01 = elements[4]!, m02 = elements[8]!;
    const m10 = elements[1]!, m11 = elements[5]!, m12 = elements[9]!;
    const m20 = elements[2]!, m21 = elements[6]!, m22 = elements[10]!;
    const trace = m00 + m11 + m22;

    if (trace > 0) {
      const factor = 0.5 / Math.sqrt(trace + 1);
      return this.set(
        (m21 - m12) * factor,
        (m02 - m20) * factor,
        (m10 - m01) * factor,
        0.25 / factor,
      );
    }
    if (m00 > m11 && m00 > m22) {
      const factor = 2 * Math.sqrt(1 + m00 - m11 - m22);
      return this.set(
        0.25 * factor,
        (m01 + m10) / factor,
        (m02 + m20) / factor,
        (m21 - m12) / factor,
      );
    }
    if (m11 > m22) {
      const factor = 2 * Math.sqrt(1 + m11 - m00 - m22);
      return this.set(
        (m01 + m10) / factor,
        0.25 * factor,
        (m12 + m21) / factor,
        (m02 - m20) / factor,
      );
    }
    const factor = 2 * Math.sqrt(1 + m22 - m00 - m11);
    return this.set(
      (m02 + m20) / factor,
      (m12 + m21) / factor,
      0.25 * factor,
      (m10 - m01) / factor,
    );
  }

  multiplyQuaternions(left: Quaternion, right: Quaternion): this {
    const ax = left.x, ay = left.y, az = left.z, aw = left.w;
    const bx = right.x, by = right.y, bz = right.z, bw = right.w;
    return this.set(
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz,
    );
  }

  multiply(quaternion: Quaternion): this {
    return this.multiplyQuaternions(this, quaternion);
  }

  premultiply(quaternion: Quaternion): this {
    return this.multiplyQuaternions(quaternion, this);
  }

  conjugate(): this {
    return this.set(-this.x, -this.y, -this.z, this.w);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  normalize(): this {
    const magnitude = Math.sqrt(this.lengthSquared());
    if (magnitude === 0) return this.identity();
    const inverseMagnitude = 1 / magnitude;
    return this.set(
      this.x * inverseMagnitude,
      this.y * inverseMagnitude,
      this.z * inverseMagnitude,
      this.w * inverseMagnitude,
    );
  }

  slerp(target: Quaternion, alpha: number): this {
    if (alpha === 0) return this;
    if (alpha === 1) return this.copy(target);

    let cosHalfTheta =
      this.x * target.x + this.y * target.y + this.z * target.z + this.w * target.w;
    let qx = target.x, qy = target.y, qz = target.z, qw = target.w;
    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      qx = -qx; qy = -qy; qz = -qz; qw = -qw;
    }
    if (cosHalfTheta >= 1) return this;

    const sinHalfThetaSquared = 1 - cosHalfTheta * cosHalfTheta;
    if (sinHalfThetaSquared <= Number.EPSILON) {
      // quaternions are nearly parallel: lerp and normalize
      this.x += (qx - this.x) * alpha;
      this.y += (qy - this.y) * alpha;
      this.z += (qz - this.z) * alpha;
      this.w += (qw - this.w) * alpha;
      return this.normalize();
    }

    const sinHalfTheta = Math.sqrt(sinHalfThetaSquared);
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
    const ratioA = Math.sin((1 - alpha) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(alpha * halfTheta) / sinHalfTheta;
    return this.set(
      this.x * ratioA + qx * ratioB,
      this.y * ratioA + qy * ratioB,
      this.z * ratioA + qz * ratioB,
      this.w * ratioA + qw * ratioB,
    );
  }
}
