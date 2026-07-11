export const BufferKind = {
  ArrayBuffer: 0x8892, // gl.ARRAY_BUFFER
  UniformBuffer: 0x8a11, // gl.UNIFORM_BUFFER
  ElementArrayBuffer: 0x8893, // gl.ELEMENT_ARRAY_BUFFER
} as const;

export type BufferKind = (typeof BufferKind)[keyof typeof BufferKind];

export const BufferUsage = {
  StaticDraw: 0x88e4, // gl.STATIC_DRAW
  DynamicDraw: 0x88e8, // gl.DYNAMIC_DRAW
} as const;

export type BufferUsage = (typeof BufferUsage)[keyof typeof BufferUsage];

/**
 * A buffer that lives on the CPU and, lazily, on the GPU. Writes go to the
 * CPU copy and are flushed to the GPU on the next onBeforeRender call.
 */
export class BufferGPU {
  private bufferGPU: WebGLBuffer | null = null;
  private needsUpdate = false;

  constructor(
    readonly kind: BufferKind,
    readonly usage: BufferUsage,
    private readonly bufferCPU: Uint8Array,
  ) {}

  get size(): number {
    return this.bufferCPU.length;
  }

  getBufferGPU(gl: WebGL2RenderingContext): WebGLBuffer {
    if (!this.bufferGPU) this.createBufferGPU(gl);
    return this.bufferGPU!;
  }

  setBytes(byteOffset: number, bytes: Uint8Array): void {
    this.bufferCPU.set(bytes, byteOffset);
    this.needsUpdate = true;
  }

  onBeforeRender(gl: WebGL2RenderingContext): void {
    if (!this.bufferGPU) this.createBufferGPU(gl);
    if (!this.needsUpdate) return;

    gl.bindBuffer(this.kind, this.bufferGPU);
    gl.bufferSubData(this.kind, 0, this.bufferCPU);
    this.needsUpdate = false;
  }

  bind(gl: WebGL2RenderingContext): void {
    gl.bindBuffer(this.kind, this.bufferGPU);
  }

  private createBufferGPU(gl: WebGL2RenderingContext): void {
    const webglBuffer = gl.createBuffer();
    if (!webglBuffer) throw new Error("Failed to create WebGL buffer");

    gl.bindBuffer(this.kind, webglBuffer);
    gl.bufferData(this.kind, this.bufferCPU, this.usage);
    this.bufferGPU = webglBuffer;
  }
}
