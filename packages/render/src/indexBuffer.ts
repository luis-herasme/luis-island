import { BufferGPU, BufferKind, BufferUsage } from "./bufferGPU";

/** Element indices for indexed drawing (gl.drawElements). */
export class IndexBuffer {
  offset = 0;

  private constructor(
    /** The GL type of each index (gl.UNSIGNED_BYTE / _SHORT / _INT). */
    readonly kind: number,
    readonly count: number,
    readonly buffer: BufferGPU,
  ) {}

  static fromUint8(values: Uint8Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const bytes = values instanceof Uint8Array ? values : Uint8Array.from(values);
    return new IndexBuffer(0x1401 /* gl.UNSIGNED_BYTE */, bytes.length, new BufferGPU(BufferKind.ElementArrayBuffer, usage, bytes));
  }

  static fromUint16(values: Uint16Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const indices = values instanceof Uint16Array ? values : Uint16Array.from(values);
    const bytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
    return new IndexBuffer(0x1403 /* gl.UNSIGNED_SHORT */, indices.length, new BufferGPU(BufferKind.ElementArrayBuffer, usage, bytes));
  }

  static fromUint32(values: Uint32Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const indices = values instanceof Uint32Array ? values : Uint32Array.from(values);
    const bytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
    return new IndexBuffer(0x1405 /* gl.UNSIGNED_INT */, indices.length, new BufferGPU(BufferKind.ElementArrayBuffer, usage, bytes));
  }
}
