import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";

export const VertexComponentType = {
  Byte: 0x1400, // gl.BYTE
  UnsignedByte: 0x1401, // gl.UNSIGNED_BYTE
  Short: 0x1402, // gl.SHORT
  UnsignedShort: 0x1403, // gl.UNSIGNED_SHORT
  Int: 0x1404, // gl.INT
  UnsignedInt: 0x1405, // gl.UNSIGNED_INT
  Float: 0x1406, // gl.FLOAT
} as const;

export type VertexComponentType = (typeof VertexComponentType)[keyof typeof VertexComponentType];

export function componentTypeSizeInBytes(componentType: VertexComponentType): number {
  switch (componentType) {
    case VertexComponentType.Byte:
    case VertexComponentType.UnsignedByte:
      return 1;
    case VertexComponentType.Short:
    case VertexComponentType.UnsignedShort:
      return 2;
    case VertexComponentType.Int:
    case VertexComponentType.UnsignedInt:
    case VertexComponentType.Float:
      return 4;
  }
}

/** Encodes numbers as the raw bytes of the given component type. */
export function encodeComponents(componentType: VertexComponentType, values: ArrayLike<number>): Uint8Array {
  switch (componentType) {
    case VertexComponentType.Byte:
      return new Uint8Array(Int8Array.from(values).buffer);
    case VertexComponentType.UnsignedByte:
      return Uint8Array.from(values);
    case VertexComponentType.Short:
      return new Uint8Array(Int16Array.from(values).buffer);
    case VertexComponentType.UnsignedShort:
      return new Uint8Array(Uint16Array.from(values).buffer);
    case VertexComponentType.Int:
      return new Uint8Array(Int32Array.from(values).buffer);
    case VertexComponentType.UnsignedInt:
      return new Uint8Array(Uint32Array.from(values).buffer);
    case VertexComponentType.Float:
      return new Uint8Array(Float32Array.from(values).buffer);
  }
}

/**
 * Raw attribute values plus the metadata needed to describe them to the GPU:
 * component type, components per vertex, and (for matrix attributes) columns.
 *
 * Vector factories take one tuple per vertex; matrix factories take one flat
 * column-major array per vertex.
 */
export class Data {
  private constructor(
    readonly componentType: VertexComponentType,
    readonly componentCount: number,
    readonly numberOfColumns: number,
    /** Number of elements (vertices or instances), not components. */
    readonly count: number,
    readonly bytes: Uint8Array,
  ) {}

  /** Size in bytes of a single element (all its components, tightly packed). */
  get sizeInBytes(): number {
    return this.componentCount * componentTypeSizeInBytes(this.componentType);
  }

  private static fromElements(
    componentType: VertexComponentType,
    componentCount: number,
    numberOfColumns: number,
    elements: ReadonlyArray<ArrayLike<number>>,
  ): Data {
    const flattened: number[] = [];
    for (const element of elements) {
      if (element.length !== componentCount) {
        throw new Error(`Expected ${componentCount} components per element, got ${element.length}`);
      }
      for (let component = 0; component < element.length; component++) {
        flattened.push(element[component]!);
      }
    }

    return new Data(componentType, componentCount, numberOfColumns, elements.length, encodeComponents(componentType, flattened));
  }

  private static fromScalars(componentType: VertexComponentType, values: ArrayLike<number>): Data {
    return new Data(componentType, 1, 1, values.length, encodeComponents(componentType, values));
  }

  static byte(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.Byte, values);
  }

  static byteVector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Byte, 2, 1, values);
  }

  static byteVector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Byte, 3, 1, values);
  }

  static byteVector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Byte, 4, 1, values);
  }

  static unsignedByte(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.UnsignedByte, values);
  }

  static unsignedByteVector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedByte, 2, 1, values);
  }

  static unsignedByteVector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedByte, 3, 1, values);
  }

  static unsignedByteVector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedByte, 4, 1, values);
  }

  static short(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.Short, values);
  }

  static shortVector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Short, 2, 1, values);
  }

  static shortVector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Short, 3, 1, values);
  }

  static shortVector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Short, 4, 1, values);
  }

  static unsignedShort(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.UnsignedShort, values);
  }

  static unsignedShortVector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedShort, 2, 1, values);
  }

  static unsignedShortVector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedShort, 3, 1, values);
  }

  static unsignedShortVector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedShort, 4, 1, values);
  }

  static int(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.Int, values);
  }

  static intVector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Int, 2, 1, values);
  }

  static intVector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Int, 3, 1, values);
  }

  static intVector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Int, 4, 1, values);
  }

  static unsignedInt(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.UnsignedInt, values);
  }

  static unsignedIntVector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedInt, 2, 1, values);
  }

  static unsignedIntVector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedInt, 3, 1, values);
  }

  static unsignedIntVector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.UnsignedInt, 4, 1, values);
  }

  static float(values: ArrayLike<number>): Data {
    return Data.fromScalars(VertexComponentType.Float, values);
  }

  static vector2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Float, 2, 1, values);
  }

  static vector3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Float, 3, 1, values);
  }

  static vector4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Float, 4, 1, values);
  }

  static matrix2(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Float, 4, 2, values);
  }

  static matrix3(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Float, 9, 3, values);
  }

  static matrix4(values: ReadonlyArray<ArrayLike<number>>): Data {
    return Data.fromElements(VertexComponentType.Float, 16, 4, values);
  }
}

type VertexDataOptions = {
  /** Must match an `in` declaration in the vertex shader. */
  name: string;
  data: Data;
  /** 0 advances per vertex (default); 1 advances per instance. */
  divisor?: number;
  /** Map integer data to [0, 1] / [-1, 1] in the shader. */
  normalize?: boolean;
};

/**
 * A single attribute's raw data before it's processed into a VertexBuffer
 * or an InterleavedVertexBuffer.
 */
export class VertexData {
  readonly name: string;
  readonly data: Data;
  divisor: number;
  normalize: boolean;

  constructor(options: VertexDataOptions) {
    this.name = options.name;
    this.data = options.data;
    this.divisor = options.divisor ?? 0;
    this.normalize = options.normalize ?? false;
  }
}

/** How one attribute is laid out inside a GPU buffer. */
export type VertexLayout = {
  name: string;
  componentCount: number;
  componentType: VertexComponentType;
  normalize: boolean;
  stride: number;
  offset: number;
  divisor: number;
  numberOfColumns: number;
};

export function vertexLayoutFromVertexData(vertex: VertexData): VertexLayout {
  return {
    name: vertex.name,
    componentCount: vertex.data.componentCount,
    componentType: vertex.data.componentType,
    normalize: vertex.normalize,
    stride: vertex.data.sizeInBytes,
    offset: 0,
    divisor: vertex.divisor,
    numberOfColumns: vertex.data.numberOfColumns,
  };
}

export function vertexLayoutsFromVertexDataArray(vertexArray: readonly VertexData[]): VertexLayout[] {
  const vertexLayouts: VertexLayout[] = [];

  let maxAlignment = 0;
  let currentOffset = 0;

  for (const vertex of vertexArray) {
    const alignment = componentTypeSizeInBytes(vertex.data.componentType);

    maxAlignment = Math.max(maxAlignment, alignment);
    currentOffset = alignTo(currentOffset, alignment);

    vertexLayouts.push({
      name: vertex.name,
      componentCount: vertex.data.componentCount,
      componentType: vertex.data.componentType,
      normalize: vertex.normalize,
      offset: currentOffset,
      stride: 0, // Will be populated after the loop
      divisor: vertex.divisor,
      numberOfColumns: vertex.data.numberOfColumns,
    });

    currentOffset += vertex.data.sizeInBytes;
  }

  // The stride must be aligned to a value that is valid for all attributes.
  // Since possible alignment values for attributes are powers of two,
  // aligning to the maximum alignment ensures it is a multiple of all smaller alignments.
  const stride = alignTo(currentOffset, maxAlignment);

  for (const vertexLayout of vertexLayouts) {
    vertexLayout.stride = stride;
  }

  return vertexLayouts;
}

/**
 * Aligns a value to the specified alignment boundary, so data lands on
 * addresses that are multiples of the alignment the GPU expects.
 *
 * alignTo(5, 4) === 8; alignTo(8, 4) === 8.
 */
function alignTo(value: number, alignment: number): number {
  if (alignment === 0) return value;

  const remainder = value % alignment;
  if (remainder === 0) return value;

  return value + (alignment - remainder);
}

type VertexBufferOptions = {
  vertexData: VertexData;
  usage?: BufferUsage;
};

/** Prepared internal state, used by copy(). */
type VertexBufferState = {
  layout: VertexLayout;
  buffer: BufferGPU;
};

/**
 * A buffer holding a single vertex attribute, with the layout describing
 * how the GPU should interpret it.
 */
export class VertexBuffer {
  readonly layout: VertexLayout;
  readonly buffer: BufferGPU;

  constructor(options: VertexBufferOptions | VertexBufferState) {
    if ("vertexData" in options) {
      this.layout = vertexLayoutFromVertexData(options.vertexData);
      this.buffer = new BufferGPU({
        kind: BufferKind.ArrayBuffer,
        usage: options.usage ?? BufferUsage.StaticDraw,
        bufferCPU: options.vertexData.data.bytes,
      });
    } else {
      this.layout = options.layout;
      this.buffer = options.buffer;
    }
  }

  /** A fresh, independent buffer with the same layout and current bytes. */
  copy(): VertexBuffer {
    return new VertexBuffer({ layout: { ...this.layout }, buffer: this.buffer.copy() });
  }

  get vertexCount(): number {
    return this.buffer.size / this.layout.stride;
  }

  setVertex(vertexIndex: number, values: ArrayLike<number>): void {
    this.buffer.setBytes(vertexIndex * this.layout.stride, encodeComponents(this.layout.componentType, values));
  }
}

type InterleavedVertexBufferOptions = {
  attributes: readonly VertexData[];
  usage?: BufferUsage;
};

/** Prepared internal state, used by copy(). */
type InterleavedVertexBufferState = {
  layouts: VertexLayout[];
  buffer: BufferGPU;
};

/** A single buffer holding several vertex attributes interleaved per vertex. */
export class InterleavedVertexBuffer {
  readonly buffer: BufferGPU;
  readonly layouts: VertexLayout[];

  constructor(options: InterleavedVertexBufferOptions | InterleavedVertexBufferState) {
    if ("attributes" in options) {
      const { attributes } = options;
      if (attributes.length === 0) throw new Error("Vertex buffer cannot be empty");

      this.layouts = vertexLayoutsFromVertexDataArray(attributes);
      this.buffer = new BufferGPU({
        kind: BufferKind.ArrayBuffer,
        usage: options.usage ?? BufferUsage.StaticDraw,
        bufferCPU: interleave(attributes, this.layouts),
      });
    } else {
      this.layouts = options.layouts;
      this.buffer = options.buffer;
    }
  }

  /** A fresh, independent buffer with the same layouts and current bytes. */
  copy(): InterleavedVertexBuffer {
    return new InterleavedVertexBuffer({
      layouts: this.layouts.map((layout) => ({ ...layout })),
      buffer: this.buffer.copy(),
    });
  }

  get vertexCount(): number {
    return this.buffer.size / this.stride;
  }

  get stride(): number {
    return this.layouts[0]!.stride;
  }

  /**
   * Updates a specific vertex attribute for a given vertex index.
   * Returns false if the attribute name was not found in the layout.
   */
  updateVertex(name: string, vertexIndex: number, values: ArrayLike<number>): boolean {
    const layout = this.layouts.find((candidate) => candidate.name === name);
    if (!layout) return false;

    this.buffer.setBytes(vertexIndex * layout.stride + layout.offset, encodeComponents(layout.componentType, values));
    return true;
  }

  /** Byte offset of one vertex's attribute inside the interleaved buffer. */
  getVertexByteOffset(attributeName: string, vertexIndex: number): number | null {
    const layout = this.layouts.find((candidate) => candidate.name === attributeName);
    if (!layout) return null;

    return vertexIndex * layout.stride + layout.offset;
  }
}

function interleave(vertexDataArray: readonly VertexData[], layouts: readonly VertexLayout[]): Uint8Array {
  const vertexCount = vertexDataArray[0]!.data.count;
  const stride = layouts[0]!.stride;

  const interleavedBuffer = new Uint8Array(stride * vertexCount);

  for (let attributeIndex = 0; attributeIndex < vertexDataArray.length; attributeIndex++) {
    const { data } = vertexDataArray[attributeIndex]!;
    const { offset } = layouts[attributeIndex]!;
    const elementSizeInBytes = data.sizeInBytes;

    for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
      const sourceStart = vertexIndex * elementSizeInBytes;
      const element = data.bytes.subarray(sourceStart, sourceStart + elementSizeInBytes);
      interleavedBuffer.set(element, vertexIndex * stride + offset);
    }
  }

  return interleavedBuffer;
}
