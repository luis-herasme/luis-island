import { Matrix4x4, Transform3D } from "@game/math";

type PerspectiveCameraOptions = {
  /** Vertical field of view, radians. */
  fieldOfView?: number;
  aspect?: number;
  near?: number;
  far?: number;
};

const DEFAULT_PERSPECTIVE_CAMERA_OPTIONS = {
  /** 45 degrees, in radians. */
  fieldOfView: (45 * Math.PI) / 180,
  aspect: 1,
  near: 0.1,
  far: 100,
};

export class PerspectiveCamera {
  fieldOfView: number;
  aspect: number;
  near: number;
  far: number;

  transform = new Transform3D();
  projectionMatrix = new Matrix4x4();

  constructor(options: PerspectiveCameraOptions = {}) {
    const resolved = { ...DEFAULT_PERSPECTIVE_CAMERA_OPTIONS, ...options };
    this.fieldOfView = resolved.fieldOfView;
    this.aspect = resolved.aspect;
    this.near = resolved.near;
    this.far = resolved.far;
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix(): void {
    this.projectionMatrix.perspective(this.fieldOfView, this.aspect, this.near, this.far);
  }
}
