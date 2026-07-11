import { Vector2 } from "./vector2";

/**
 * Scale, rotation and translation in the plane — the 2D analog of
 * Transform3D, producing a column-major 3x3 matrix.
 */
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
