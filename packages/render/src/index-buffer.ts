import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";

/** The GL type of each index, passed to gl.drawElements. */
export const IndexKind = {
  UnsignedByte: 0x1401, // gl.UNSIGNED_BYTE
  UnsignedShort: 0x1403, // gl.UNSIGNED_SHORT
  UnsignedInt: 0x1405, // gl.UNSIGNED_INT
} as const;

export type IndexKind = (typeof IndexKind)[keyof typeof IndexKind];

type IndexBufferOptions = {
  kind: IndexKind;
  count: number;
  buffer: BufferGPU;
};

/** Element indices for indexed drawing (gl.drawElements). */
export class IndexBuffer {
  readonly kind: IndexKind;
  readonly count: number;
  readonly buffer: BufferGPU;
  offset = 0;

  private constructor(options: IndexBufferOptions) {
    this.kind = options.kind;
    this.count = options.count;
    this.buffer = options.buffer;
  }

  /** A fresh, independent index buffer with the current bytes. */
  copy(): IndexBuffer {
    const copied = new IndexBuffer({ kind: this.kind, count: this.count, buffer: this.buffer.copy() });
    copied.offset = this.offset;
    return copied;
  }

  static fromUint8(values: Uint8Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const bytes = values instanceof Uint8Array ? values : Uint8Array.from(values);
    return new IndexBuffer({
      kind: IndexKind.UnsignedByte,
      count: bytes.length,
      buffer: new BufferGPU({ kind: BufferKind.ElementArrayBuffer, usage, bufferCPU: bytes }),
    });
  }

  static fromUint16(values: Uint16Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const indices = values instanceof Uint16Array ? values : Uint16Array.from(values);
    const bytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
    return new IndexBuffer({
      kind: IndexKind.UnsignedShort,
      count: indices.length,
      buffer: new BufferGPU({ kind: BufferKind.ElementArrayBuffer, usage, bufferCPU: bytes }),
    });
  }

  static fromUint32(values: Uint32Array | readonly number[], usage: BufferUsage = BufferUsage.StaticDraw): IndexBuffer {
    const indices = values instanceof Uint32Array ? values : Uint32Array.from(values);
    const bytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
    return new IndexBuffer({
      kind: IndexKind.UnsignedInt,
      count: indices.length,
      buffer: new BufferGPU({ kind: BufferKind.ElementArrayBuffer, usage, bufferCPU: bytes }),
    });
  }
}
