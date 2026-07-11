import { Matrix4, Quaternion, Vector2, Vector3 } from "@game/math";

export class Transform3D {
  scale = new Vector3(1, 1, 1);
  rotation = new Quaternion();
  translation = new Vector3();

  toMatrix4(target = new Matrix4()): Matrix4 {
    return target.compose(this.translation, this.rotation, this.scale);
  }

  /** Column-major 4x4 matrix elements, ready for a mat4 uniform or attribute. */
  toArray(): Float32Array {
    return this.toMatrix4().elements;
  }

  static fromMatrix4(matrix: Matrix4): Transform3D {
    const transform = new Transform3D();
    matrix.decompose(transform.translation, transform.rotation, transform.scale);
    return transform;
  }
}

export class Transform2D {
  scale = new Vector2(1, 1);
  /** Radians. */
  rotation = 0;
  translation = new Vector2();

  /** Column-major 3x3 matrix elements, ready for a mat3 uniform or attribute. */
  toArray(): [number, number, number, number, number, number, number, number, number] {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // prettier-ignore
    return [
      cos * this.scale.x, sin * this.scale.x, 0,
      -sin * this.scale.y, cos * this.scale.y, 0,
      this.translation.x, this.translation.y, 1,
    ];
  }
}
