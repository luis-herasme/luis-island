import { Matrix4 } from "./matrix4";
import { Quaternion } from "./quaternion";
import { Vector3 } from "./vector3";

/**
 * Scale, rotation and translation — the TRS parameterization of an affine
 * transformation. A plain value type: hierarchy and propagation are world
 * structure and live with the ECS, not here.
 */
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
