import { Matrix4 } from "@game/math";
import { Node } from "./node";

export class PerspectiveCamera extends Node {
  projectionMatrix = new Matrix4();
  /** World-to-camera transform, recomputed by the renderer each frame. */
  viewMatrix = new Matrix4();

  constructor(
    /** Vertical field of view, radians. */
    public fieldOfView = Math.PI / 3,
    public aspect = 1,
    public near = 0.1,
    public far = 1000,
  ) {
    super();
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix(): void {
    this.projectionMatrix.perspective(this.fieldOfView, this.aspect, this.near, this.far);
  }
}
