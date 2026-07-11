import { Matrix3, Vector3 } from "@game/math";
import type { Scene } from "./scene";
import type { PerspectiveCamera } from "./camera";
import { Mesh } from "./mesh";
import type { Geometry } from "./geometry";
import type { MaterialType } from "./material";
import { AmbientLight, DirectionalLight } from "./lights";
import {
  BASIC_FRAGMENT_SHADER,
  BASIC_VERTEX_SHADER,
  LAMBERT_FRAGMENT_SHADER,
  LAMBERT_VERTEX_SHADER,
  NORMAL_ATTRIBUTE_LOCATION,
  POSITION_ATTRIBUTE_LOCATION,
} from "./shaders";

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
}

interface GpuGeometry {
  vertexArray: WebGLVertexArrayObject;
  indexCount: number;
}

export class Renderer {
  /** The WebGL2 context. `gl` is the domain-standard name for it, kept as-is. */
  readonly gl: WebGL2RenderingContext;

  private programs = new Map<MaterialType, ProgramInfo>();
  private geometries = new WeakMap<Geometry, GpuGeometry>();
  private normalMatrix = new Matrix3();
  private lightDirection = new Vector3();

  constructor(public readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true });
    if (!gl) throw new Error("WebGL2 is not supported in this browser");
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  setSize(width: number, height: number, pixelRatio = 1): void {
    this.canvas.width = Math.floor(width * pixelRatio);
    this.canvas.height = Math.floor(height * pixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    const gl = this.gl;

    scene.updateWorldMatrix();
    if (!camera.parent) camera.updateWorldMatrix();
    camera.viewMatrix.copy(camera.worldMatrix).invert();

    const meshes: Mesh[] = [];
    const directionalLights: DirectionalLight[] = [];
    const ambientLights: AmbientLight[] = [];
    scene.traverse((node) => {
      if (!node.visible) return;
      if (node instanceof Mesh) meshes.push(node);
      else if (node instanceof DirectionalLight) directionalLights.push(node);
      else if (node instanceof AmbientLight) ambientLights.push(node);
    });
    // v1 lighting model: one directional + one ambient
    const directionalLight = directionalLights[0];
    const ambientLight = ambientLights[0];

    const background = scene.background;
    gl.clearColor(background.r, background.g, background.b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const mesh of meshes) {
      const { program, uniforms } = this.getProgram(mesh.material.type);
      const gpuGeometry = this.getGpuGeometry(mesh.geometry);

      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.get("uProjection")!, false, camera.projectionMatrix.elements);
      gl.uniformMatrix4fv(uniforms.get("uView")!, false, camera.viewMatrix.elements);
      gl.uniformMatrix4fv(uniforms.get("uWorld")!, false, mesh.worldMatrix.elements);

      const color = mesh.material.color;
      gl.uniform3f(uniforms.get("uColor")!, color.r, color.g, color.b);

      if (mesh.material.type === "lambert") {
        this.normalMatrix.normalFromMatrix4(mesh.worldMatrix);
        gl.uniformMatrix3fv(uniforms.get("uNormalMatrix")!, false, this.normalMatrix.elements);

        if (directionalLight) {
          const direction = this.lightDirection.copy(directionalLight.direction).normalize();
          const lightColor = directionalLight.color;
          const lightIntensity = directionalLight.intensity;
          gl.uniform3f(uniforms.get("uLightDirection")!, direction.x, direction.y, direction.z);
          gl.uniform3f(
            uniforms.get("uLightColor")!,
            lightColor.r * lightIntensity,
            lightColor.g * lightIntensity,
            lightColor.b * lightIntensity,
          );
        } else {
          gl.uniform3f(uniforms.get("uLightDirection")!, 0, -1, 0);
          gl.uniform3f(uniforms.get("uLightColor")!, 0, 0, 0);
        }

        if (ambientLight) {
          const ambientColor = ambientLight.color;
          const ambientIntensity = ambientLight.intensity;
          gl.uniform3f(
            uniforms.get("uAmbientColor")!,
            ambientColor.r * ambientIntensity,
            ambientColor.g * ambientIntensity,
            ambientColor.b * ambientIntensity,
          );
        } else {
          gl.uniform3f(uniforms.get("uAmbientColor")!, 0, 0, 0);
        }
      }

      gl.bindVertexArray(gpuGeometry.vertexArray);
      gl.drawElements(gl.TRIANGLES, gpuGeometry.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);
  }

  private getProgram(type: MaterialType): ProgramInfo {
    let programInfo = this.programs.get(type);
    if (!programInfo) {
      const [vertexSource, fragmentSource] =
        type === "lambert"
          ? [LAMBERT_VERTEX_SHADER, LAMBERT_FRAGMENT_SHADER]
          : [BASIC_VERTEX_SHADER, BASIC_FRAGMENT_SHADER];
      programInfo = this.compileProgram(vertexSource, fragmentSource);
      this.programs.set(type, programInfo);
    }
    return programInfo;
  }

  private compileProgram(vertexSource: string, fragmentSource: string): ProgramInfo {
    const gl = this.gl;

    const compile = (stage: number, source: string): WebGLShader => {
      const shader = gl.createShader(stage)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const infoLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compile failed: ${infoLog}\n${source}`);
      }
      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const infoLog = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${infoLog}`);
    }

    const uniforms = new Map<string, WebGLUniformLocation>();
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let uniformIndex = 0; uniformIndex < uniformCount; uniformIndex++) {
      const activeUniform = gl.getActiveUniform(program, uniformIndex);
      if (!activeUniform) continue;
      const location = gl.getUniformLocation(program, activeUniform.name);
      if (location) uniforms.set(activeUniform.name, location);
    }

    return { program, uniforms };
  }

  private getGpuGeometry(geometry: Geometry): GpuGeometry {
    let gpuGeometry = this.geometries.get(geometry);
    if (gpuGeometry) return gpuGeometry;

    const gl = this.gl;
    const vertexArray = gl.createVertexArray()!;
    gl.bindVertexArray(vertexArray);

    const upload = (location: number, data: Float32Array) => {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    };
    upload(POSITION_ATTRIBUTE_LOCATION, geometry.positions);
    upload(NORMAL_ATTRIBUTE_LOCATION, geometry.normals);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    gpuGeometry = { vertexArray, indexCount: geometry.indices.length };
    this.geometries.set(geometry, gpuGeometry);
    return gpuGeometry;
  }
}
