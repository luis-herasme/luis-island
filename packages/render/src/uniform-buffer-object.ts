import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import type { Renderer } from "./renderer";

export class UniformBufferObject {
  readonly gl: WebGL2RenderingContext;
  readonly buffer: BufferGPU;
  bindingPoint: number | null = null;

  constructor(renderer: Renderer, bufferCPU: Uint8Array) {
    this.gl = renderer.gl;
    this.buffer = new BufferGPU(BufferKind.UniformBuffer, BufferUsage.DynamicDraw, bufferCPU.slice());
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
