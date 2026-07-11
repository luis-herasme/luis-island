import { describe, expect, it } from "vitest";
import { Matrix3, Matrix4, Quaternion, Vector3 } from "./index";

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
