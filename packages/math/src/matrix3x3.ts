import type { Matrix4x4 } from "./matrix4x4";

/** 3x3 matrix, column-major storage. Mainly used as a normal matrix. */
export class Matrix3x3 {
  elements = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  identity(): this {
    this.elements.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    return this;
  }

  /** Upper-left 3x3 of a Matrix4x4. */
  fromMatrix4x4(matrix: Matrix4x4): this {
    const source = matrix.elements;
    const elements = this.elements;
    elements[0] = source[0]!; elements[1] = source[1]!; elements[2] = source[2]!;
    elements[3] = source[4]!; elements[4] = source[5]!; elements[5] = source[6]!;
    elements[6] = source[8]!; elements[7] = source[9]!; elements[8] = source[10]!;
    return this;
  }

  invert(): this {
    // a## are matrix entries, b## are cofactors
    const elements = this.elements;
    const a00 = elements[0]!, a01 = elements[1]!, a02 = elements[2]!;
    const a10 = elements[3]!, a11 = elements[4]!, a12 = elements[5]!;
    const a20 = elements[6]!, a21 = elements[7]!, a22 = elements[8]!;

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let determinant = a00 * b01 + a01 * b11 + a02 * b21;
    if (determinant === 0) {
      this.elements.fill(0);
      return this;
    }
    determinant = 1 / determinant;

    elements[0] = b01 * determinant;
    elements[1] = (-a22 * a01 + a02 * a21) * determinant;
    elements[2] = (a12 * a01 - a02 * a11) * determinant;
    elements[3] = b11 * determinant;
    elements[4] = (a22 * a00 - a02 * a20) * determinant;
    elements[5] = (-a12 * a00 + a02 * a10) * determinant;
    elements[6] = b21 * determinant;
    elements[7] = (-a21 * a00 + a01 * a20) * determinant;
    elements[8] = (a11 * a00 - a01 * a10) * determinant;
    return this;
  }

  transpose(): this {
    const elements = this.elements;
    let swap;
    swap = elements[1]!; elements[1] = elements[3]!; elements[3] = swap;
    swap = elements[2]!; elements[2] = elements[6]!; elements[6] = swap;
    swap = elements[5]!; elements[5] = elements[7]!; elements[7] = swap;
    return this;
  }

  /** transpose(inverse(upper3x3(m))) — correct normal transform under non-uniform scale. */
  normalFromMatrix4x4(matrix: Matrix4x4): this {
    return this.fromMatrix4x4(matrix).invert().transpose();
  }
}
