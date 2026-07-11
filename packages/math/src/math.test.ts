import { describe, expect, it } from "vitest";
import { Matrix3, Matrix4, Quaternion, Transform2D, Transform3D, Vector3 } from "./index";

const closeTo = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 5);

describe("Vector3", () => {
  it("normalizes to unit length", () => {
    const vector = new Vector3(3, 4, 0).normalize();
    closeTo(vector.length(), 1);
    closeTo(vector.x, 0.6);
  });

  it("cross product follows right-hand rule", () => {
    const vector = new Vector3().crossVectors(new Vector3(1, 0, 0), new Vector3(0, 1, 0));
    closeTo(vector.z, 1);
  });
});

describe("Quaternion", () => {
  it("rotating (1,0,0) by 90° around Z gives (0,1,0)", () => {
    const quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const vector = new Vector3(1, 0, 0).applyQuaternion(quaternion);
    closeTo(vector.x, 0);
    closeTo(vector.y, 1);
    closeTo(vector.z, 0);
  });

  it("quaternion rotation matches matrix rotation", () => {
    const quaternion = new Quaternion().setFromEuler(0.4, -1.1, 2.3);
    const matrix = new Matrix4().compose(new Vector3(), quaternion, new Vector3(1, 1, 1));
    const rotatedByQuaternion = new Vector3(1, 2, 3).applyQuaternion(quaternion);
    const rotatedByMatrix = new Vector3(1, 2, 3).applyMatrix4(matrix);
    closeTo(rotatedByQuaternion.x, rotatedByMatrix.x);
    closeTo(rotatedByQuaternion.y, rotatedByMatrix.y);
    closeTo(rotatedByQuaternion.z, rotatedByMatrix.z);
  });
});

describe("Matrix4", () => {
  it("multiplying by inverse gives identity", () => {
    const quaternion = new Quaternion().setFromEuler(0.5, 0.3, -0.7);
    const matrix = new Matrix4().compose(new Vector3(1, 2, 3), quaternion, new Vector3(2, 3, 4));
    const product = new Matrix4().multiplyMatrices(matrix, matrix.clone().invert());
    const identity = new Matrix4();
    for (let index = 0; index < 16; index++) {
      closeTo(product.elements[index]!, identity.elements[index]!);
    }
  });

  it("compose applies scale then rotation then translation", () => {
    const quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const matrix = new Matrix4().compose(new Vector3(10, 0, 0), quaternion, new Vector3(2, 2, 2));
    // scale → (2,0,0), rotate → (0,2,0), translate → (10,2,0)
    const vector = new Vector3(1, 0, 0).applyMatrix4(matrix);
    closeTo(vector.x, 10);
    closeTo(vector.y, 2);
    closeTo(vector.z, 0);
  });

  it("perspective maps near plane center to z = -1", () => {
    const matrix = new Matrix4().perspective(Math.PI / 2, 1, 0.1, 100);
    const vector = new Vector3(0, 0, -0.1).applyMatrix4(matrix);
    closeTo(vector.z, -1);
  });

  it("lookAt from +Z toward origin behaves like inverse translation", () => {
    const matrix = new Matrix4().lookAt(new Vector3(0, 0, 5), new Vector3(0, 0, 0), new Vector3(0, 1, 0));
    const vector = new Vector3(0, 0, 0).applyMatrix4(matrix);
    closeTo(vector.z, -5);
  });
});

describe("Transform2D", () => {
  it("builds a column-major scale/rotation/translation matrix", () => {
    const transform = new Transform2D();
    transform.scale.set(2, 3);
    transform.rotation = Math.PI / 2;
    transform.translation.set(4, 5);

    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = transform.toArray();

    closeTo(m00, 0);
    closeTo(m01, 2);
    closeTo(m02, 0);
    closeTo(m10, -3);
    closeTo(m11, 0);
    closeTo(m12, 0);
    closeTo(m20, 4);
    closeTo(m21, 5);
    closeTo(m22, 1);
  });
});

describe("Transform3D", () => {
  it("round-trips through a matrix", () => {
    const transform = new Transform3D();
    transform.translation.set(1, 2, 3);
    transform.scale.set(2, 2, 2);
    transform.rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 3);

    const recovered = Transform3D.fromMatrix4(transform.toMatrix4());

    closeTo(recovered.translation.x, 1);
    closeTo(recovered.translation.y, 2);
    closeTo(recovered.translation.z, 3);
    closeTo(recovered.scale.x, 2);
    closeTo(recovered.scale.y, 2);
    closeTo(recovered.scale.z, 2);

    // q and -q are the same rotation, so compare via |dot| instead of components.
    const expected = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 3);
    const rotation = recovered.rotation;
    const dot = rotation.x * expected.x + rotation.y * expected.y + rotation.z * expected.z + rotation.w * expected.w;
    closeTo(Math.abs(dot), 1);
  });

  it("writes the transform into a provided matrix", () => {
    const transform = new Transform3D();
    transform.translation.set(7, 8, 9);

    const target = new Matrix4();
    const result = transform.toMatrix4(target);

    expect(result).toBe(target);
    closeTo(target.elements[12]!, 7);
    closeTo(target.elements[13]!, 8);
    closeTo(target.elements[14]!, 9);
  });
});

describe("Matrix3", () => {
  it("normal matrix of a uniform-scale matrix keeps normals parallel", () => {
    const quaternion = new Quaternion().setFromEuler(0.2, 0.4, 0.6);
    const world = new Matrix4().compose(new Vector3(5, 6, 7), quaternion, new Vector3(3, 3, 3));
    const normalMatrix = new Matrix3().normalFromMatrix4(world);
    // rotate a normal both ways and compare directions
    const rotatedByQuaternion = new Vector3(0, 1, 0).applyQuaternion(quaternion);
    const elements = normalMatrix.elements;
    // second column = transformed (0,1,0)
    const nx = elements[3]!, ny = elements[4]!, nz = elements[5]!;
    const magnitude = Math.hypot(nx, ny, nz);
    closeTo(nx / magnitude, rotatedByQuaternion.x);
    closeTo(ny / magnitude, rotatedByQuaternion.y);
    closeTo(nz / magnitude, rotatedByQuaternion.z);
  });
});
