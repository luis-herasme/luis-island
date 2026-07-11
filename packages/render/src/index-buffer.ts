import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";

type IndexBufferOptions = {
  /** The GL type of each index (gl.UNSIGNED_BYTE / _SHORT / _INT). */
  kind: number;
  count: number;
  buffer: BufferGPU;
};

/** Element indices for indexed drawing (gl.drawElements). */
export class IndexBuffer {
  readonly kind: number;
  readonly count: number;
  readonly buffer: BufferGPU;
  offset = 0;

  private constructor(options: IndexBufferOptions) {
    this.kind = options.kind;
    this.count = options.count;
    this.buffer = options.buffer;
  }

  static fromUint8(values: Uint8Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const bytes = values instanceof Uint8Array ? values : Uint8Array.from(values);
    return new IndexBuffer({
      kind: 0x1401, // gl.UNSIGNED_BYTE
      count: bytes.length,
      buffer: new BufferGPU({ kind: BufferKind.ElementArrayBuffer, usage, bufferCPU: bytes }),
    });
  }

  static fromUint16(values: Uint16Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const indices = values instanceof Uint16Array ? values : Uint16Array.from(values);
    const bytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
    return new IndexBuffer({
      kind: 0x1403, // gl.UNSIGNED_SHORT
      count: indices.length,
      buffer: new BufferGPU({ kind: BufferKind.ElementArrayBuffer, usage, bufferCPU: bytes }),
    });
  }

  static fromUint32(values: Uint32Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const indices = values instanceof Uint32Array ? values : Uint32Array.from(values);
    const bytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
    return new IndexBuffer({
      kind: 0x1405, // gl.UNSIGNED_INT
      count: indices.length,
      buffer: new BufferGPU({ kind: BufferKind.ElementArrayBuffer, usage, bufferCPU: bytes }),
    });
  }
}
