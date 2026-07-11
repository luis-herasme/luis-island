import { Matrix4 } from "@game/math";
import { Transform3D } from "./transform";

export class PerspectiveCamera {
  transform = new Transform3D();
  projectionMatrix = new Matrix4();

  constructor(
    /** Vertical field of view, radians. */
    public fieldOfView = (45 * Math.PI) / 180,
    public aspect = 1,
    public near = 0.1,
    public far = 100,
  ) {
    this.updateProjectionMatrix();
  }

  /** A camera whose aspect ratio matches the browser window. */
  static withWindowAspect(): PerspectiveCamera {
    return new PerspectiveCamera(undefined, window.innerWidth / window.innerHeight);
  }

  updateProjectionMatrix(): void {
    this.projectionMatrix.perspective(this.fieldOfView, this.aspect, this.near, this.far);
  }
}
