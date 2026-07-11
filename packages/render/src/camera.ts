import { Matrix4x4, Transform3D } from "@game/math";

type PerspectiveCameraOptions = {
  /** Vertical field of view, radians. */
  fieldOfView?: number;
  aspect?: number;
  near?: number;
  far?: number;
};

const DEFAULT_FIELD_OF_VIEW = (45 * Math.PI) / 180;

export class PerspectiveCamera {
  fieldOfView: number;
  aspect: number;
  near: number;
  far: number;

  transform = new Transform3D();
  projectionMatrix = new Matrix4x4();

  constructor(options: PerspectiveCameraOptions = {}) {
    this.fieldOfView = options.fieldOfView ?? DEFAULT_FIELD_OF_VIEW;
    this.aspect = options.aspect ?? 1;
    this.near = options.near ?? 0.1;
    this.far = options.far ?? 100;
    this.updateProjectionMatrix();
  }

  /** A camera whose aspect ratio matches the browser window. */
  static withWindowAspect(): PerspectiveCamera {
    return new PerspectiveCamera({ aspect: window.innerWidth / window.innerHeight });
  }

  updateProjectionMatrix(): void {
    this.projectionMatrix.perspective(this.fieldOfView, this.aspect, this.near, this.far);
  }
}
