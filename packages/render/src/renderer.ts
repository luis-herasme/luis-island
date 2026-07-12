import type { PerspectiveCamera } from "./camera";
import type { Mesh } from "./mesh";
import { Uniform } from "./uniforms";

type RenderSceneOptions = {
  scene: Mesh[];
  camera: PerspectiveCamera;
};

export class Renderer {
  /** The WebGL2 context. `gl` is the domain-standard name for it, kept as-is. */
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;

  private readonly opaqueMeshes: Mesh[] = [];
  private readonly transparentMeshes: Mesh[] = [];

  constructor() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const gl = this.canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 is not supported in this browser");
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
  }

  clear(): void {
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  handleWindowResize(camera: PerspectiveCamera): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width !== this.canvas.width || height !== this.canvas.height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      this.canvas.width = width;
      this.canvas.height = height;

      this.gl.viewport(0, 0, width, height);
    }
  }

  renderScene(options: RenderSceneOptions): void {
    const { scene, camera } = options;

    this.clear();
    this.handleWindowResize(camera);

    // Opaque meshes draw first; transparent ones after, back-to-front, so
    // everything behind them is already in the framebuffer to blend against.
    this.opaqueMeshes.length = 0;
    this.transparentMeshes.length = 0;
    for (const mesh of scene) {
      (mesh.material.transparent ? this.transparentMeshes : this.opaqueMeshes).push(mesh);
    }

    if (this.transparentMeshes.length > 1) {
      const cameraPosition = camera.transform.translation;
      this.transparentMeshes.sort(
        (first, second) =>
          second.transform.translation.distanceTo(cameraPosition) -
          first.transform.translation.distanceTo(cameraPosition),
      );
    }

    // Each mesh's material keeps a reference to the uniform value, so every
    // mesh gets its own copy instead of a view into a shared scratch matrix.
    const cameraInverseMatrix = camera.transform.toMatrix4x4().invert();

    for (const meshes of [this.opaqueMeshes, this.transparentMeshes]) {
      for (const mesh of meshes) {
        mesh.material.setUniform("transform", Uniform.matrix4(mesh.transform.toArray()));
        mesh.material.setUniform("projection_matrix", Uniform.fromMatrix4x4(camera.projectionMatrix));
        mesh.material.setUniform("camera_inverse_matrix", Uniform.fromMatrix4x4(cameraInverseMatrix));

        this.render(mesh);
      }
    }
  }

  render(mesh: Mesh): void {
    const gl = this.gl;

    for (const vertexBuffer of mesh.geometry.vertexBuffers) {
      vertexBuffer.buffer.onBeforeRender(gl);
    }

    for (const interleavedVertexBuffer of mesh.geometry.interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.onBeforeRender(gl);
    }

    mesh.material.onBeforeRender(gl);

    gl.bindVertexArray(mesh.getOrCreateVertexArrayObject(gl));

    // Transparent meshes blend over what is already drawn and keep the depth
    // buffer read-only: they must not occlude each other or later fragments.
    const { transparent } = mesh.material;
    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    }

    const indices = mesh.geometry.indices;

    if (indices) {
      indices.buffer.onBeforeRender(gl);
      indices.buffer.bind(gl);

      if (mesh.geometry.instanceCount !== null) {
        gl.drawElementsInstanced(mesh.renderPrimitive, indices.count, indices.kind, indices.offset, mesh.geometry.instanceCount);
      } else {
        gl.drawElements(mesh.renderPrimitive, indices.count, indices.kind, indices.offset);
      }
    } else {
      gl.drawArrays(mesh.renderPrimitive, 0, mesh.geometry.vertexCount);
    }

    if (transparent) {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
  }
}
