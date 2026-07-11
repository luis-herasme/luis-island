import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import type { Renderer } from "./renderer";

type UniformBufferObjectOptions = {
  renderer: Renderer;
  bufferCPU: Uint8Array;
};

export class UniformBufferObject {
  readonly gl: WebGL2RenderingContext;
  readonly buffer: BufferGPU;
  bindingPoint: number | null = null;

  constructor(options: UniformBufferObjectOptions) {
    this.gl = options.renderer.gl;
    this.buffer = new BufferGPU({
      kind: BufferKind.UniformBuffer,
      usage: BufferUsage.DynamicDraw,
      bufferCPU: options.bufferCPU.slice(),
    });
    this.buffer.onBeforeRender(this.gl);
  }

  setBindingPoint(bindingPoint: number): void {
    this.bindingPoint = bindingPoint;
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, bindingPoint, this.buffer.getBufferGPU(this.gl));
  }

  setBytes(byteOffset: number, bytes: Uint8Array): void {
    this.buffer.setBytes(byteOffset, bytes);
    this.buffer.onBeforeRender(this.gl);
  }
}
