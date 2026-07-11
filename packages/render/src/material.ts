import type { Uniform } from "./uniforms";
import type { VertexLayout } from "./vertex-buffer";
import { componentTypeSizeInBytes } from "./vertex-buffer";

type MaterialOptions = {
  vertexShaderSource: string;
  fragmentShaderSource: string;
};

/** User-written GLSL plus the uniform values to feed it. */
export class Material {
  readonly vertexShaderSource: string;
  readonly fragmentShaderSource: string;
  readonly uniforms = new Map<string, Uniform>();

  // WebGL resources, created lazily on first render
  resources: MaterialResources | null = null;

  constructor(options: MaterialOptions) {
    this.vertexShaderSource = options.vertexShaderSource;
    this.fragmentShaderSource = options.fragmentShaderSource;
  }

  setUniform(uniformName: string, uniform: Uniform): void {
    this.uniforms.set(uniformName, uniform);
  }

  onBeforeRender(gl: WebGL2RenderingContext): void {
    if (!this.resources) this.resources = new MaterialResources({ gl, material: this });

    gl.useProgram(this.resources.program);

    let currentTextureUnit = 0;
    for (const [name, uniform] of this.uniforms) {
      this.resources.setUniform(name, uniform, currentTextureUnit);

      if (uniform.kind === "texture") {
        gl.bindTexture(gl.TEXTURE_2D, uniform.texture.getWebGLTexture(gl));
        currentTextureUnit += 1;
      }
    }
  }
}

type MaterialResourcesOptions = {
  gl: WebGL2RenderingContext;
  material: Material;
};

/** The compiled program and the uniform/attribute locations discovered in it. */
export class MaterialResources {
  readonly program: WebGLProgram;

  private readonly gl: WebGL2RenderingContext;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation>();
  private readonly attributeLocations = new Map<string, number>();
  private readonly uniformBlockLocations = new Map<string, number>();

  constructor(options: MaterialResourcesOptions) {
    const { gl, material } = options;
    this.gl = gl;

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program");

    const vertexShader = compileShader(gl, material.vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, material.fragmentShaderSource, gl.FRAGMENT_SHADER);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program linking failed: ${gl.getProgramInfoLog(program) ?? "unknown error"}`);
    }

    this.program = program;
    this.collectUniformLocations();
    this.collectAttributeLocations();
    this.collectUniformBlockLocations();
  }

  /**
   * Sets a uniform's value. Uniforms the program does not use are skipped —
   * GLSL compilers drop unused declarations, so only active uniforms have
   * locations.
   */
  setUniform(uniformName: string, uniform: Uniform, currentTextureUnit: number): void {
    const gl = this.gl;
    const location = this.uniformLocations.get(uniformName);
    if (!location) return;

    switch (uniform.kind) {
      case "float":
        gl.uniform1f(location, uniform.value);
        break;
      case "vector2":
        gl.uniform2fv(location, uniform.value);
        break;
      case "vector3":
        gl.uniform3fv(location, uniform.value);
        break;
      case "vector4":
        gl.uniform4fv(location, uniform.value);
        break;

      case "int":
        gl.uniform1i(location, uniform.value);
        break;
      case "intVector2":
        gl.uniform2iv(location, uniform.value);
        break;
      case "intVector3":
        gl.uniform3iv(location, uniform.value);
        break;
      case "intVector4":
        gl.uniform4iv(location, uniform.value);
        break;

      case "unsignedInt":
        gl.uniform1ui(location, uniform.value);
        break;
      case "unsignedIntVector2":
        gl.uniform2uiv(location, uniform.value);
        break;
      case "unsignedIntVector3":
        gl.uniform3uiv(location, uniform.value);
        break;
      case "unsignedIntVector4":
        gl.uniform4uiv(location, uniform.value);
        break;

      case "matrix2":
        gl.uniformMatrix2fv(location, false, uniform.value);
        break;
      case "matrix3":
        gl.uniformMatrix3fv(location, false, uniform.value);
        break;
      case "matrix4":
        gl.uniformMatrix4fv(location, false, uniform.value);
        break;

      case "texture":
        gl.uniform1i(location, currentTextureUnit);
        gl.activeTexture(gl.TEXTURE0 + currentTextureUnit);
        break;
    }
  }

  /** Points an attribute at the currently bound ARRAY_BUFFER, per its layout. */
  setAttributeBuffer(vertexLayout: VertexLayout): void {
    const gl = this.gl;
    const location = this.attributeLocations.get(vertexLayout.name);
    if (location === undefined) return;

    if (vertexLayout.numberOfColumns === 1) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        vertexLayout.componentCount,
        vertexLayout.componentType,
        vertexLayout.normalize,
        vertexLayout.stride,
        vertexLayout.offset,
      );

      if (vertexLayout.divisor !== 0) {
        gl.vertexAttribDivisor(location, vertexLayout.divisor);
      }

      return;
    }

    // Only matrices have more than one column; each column takes one attribute location.
    const componentsPerColumn = vertexLayout.componentCount / vertexLayout.numberOfColumns;

    for (let column = 0; column < vertexLayout.numberOfColumns; column++) {
      const columnLocation = location + column;
      const offset = vertexLayout.offset + column * componentsPerColumn * componentTypeSizeInBytes(vertexLayout.componentType);

      gl.enableVertexAttribArray(columnLocation);
      gl.vertexAttribPointer(
        columnLocation,
        componentsPerColumn,
        vertexLayout.componentType,
        vertexLayout.normalize,
        vertexLayout.stride,
        offset,
      );

      if (vertexLayout.divisor !== 0) {
        gl.vertexAttribDivisor(columnLocation, vertexLayout.divisor);
      }
    }
  }

  /** Binds a named uniform block to a UBO binding point. */
  setUniformBlock(name: string, uniformBufferBindingPoint: number): void {
    const blockLocation = this.uniformBlockLocations.get(name);
    if (blockLocation === undefined) return;

    this.gl.uniformBlockBinding(this.program, blockLocation, uniformBufferBindingPoint);
  }

  private collectUniformLocations(): void {
    const gl = this.gl;
    const numberOfUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS) as number;

    for (let uniformIndex = 0; uniformIndex < numberOfUniforms; uniformIndex++) {
      const uniform = gl.getActiveUniform(this.program, uniformIndex);
      if (!uniform) continue;

      // Uniforms inside uniform blocks do not have locations
      const location = gl.getUniformLocation(this.program, uniform.name);
      if (location) this.uniformLocations.set(uniform.name, location);
    }
  }

  private collectAttributeLocations(): void {
    const gl = this.gl;
    const numberOfAttributes = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES) as number;

    for (let attributeIndex = 0; attributeIndex < numberOfAttributes; attributeIndex++) {
      const attribute = gl.getActiveAttrib(this.program, attributeIndex);
      if (!attribute) continue;

      this.attributeLocations.set(attribute.name, gl.getAttribLocation(this.program, attribute.name));
    }
  }

  private collectUniformBlockLocations(): void {
    const gl = this.gl;
    const numberOfUniformBlocks = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORM_BLOCKS) as number;

    for (let blockLocation = 0; blockLocation < numberOfUniformBlocks; blockLocation++) {
      const name = gl.getActiveUniformBlockName(this.program, blockLocation);
      if (name) this.uniformBlockLocations.set(name, blockLocation);
    }
  }
}

function compileShader(gl: WebGL2RenderingContext, shaderSource: string, shaderType: number): WebGLShader {
  const shader = gl.createShader(shaderType);
  if (!shader) throw new Error("Failed to create WebGL shader");

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compilation failed: ${gl.getShaderInfoLog(shader) ?? "unknown error"}\n${shaderSource}`);
  }

  return shader;
}
