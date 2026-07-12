import { fetchImage } from "./utils";

export const MinificationFilter = {
  Linear: 0x2601, // gl.LINEAR
  Nearest: 0x2600, // gl.NEAREST
  NearestMipmapNearest: 0x2700, // gl.NEAREST_MIPMAP_NEAREST
  LinearMipmapNearest: 0x2701, // gl.LINEAR_MIPMAP_NEAREST
  NearestMipmapLinear: 0x2702, // gl.NEAREST_MIPMAP_LINEAR
  LinearMipmapLinear: 0x2703, // gl.LINEAR_MIPMAP_LINEAR
} as const;

export type MinificationFilter = (typeof MinificationFilter)[keyof typeof MinificationFilter];

export const MagnificationFilter = {
  Linear: 0x2601, // gl.LINEAR
  Nearest: 0x2600, // gl.NEAREST
} as const;

export type MagnificationFilter = (typeof MagnificationFilter)[keyof typeof MagnificationFilter];

export const Wrap = {
  Repeat: 0x2901, // gl.REPEAT
  ClampToEdge: 0x812f, // gl.CLAMP_TO_EDGE
  MirroredRepeat: 0x8370, // gl.MIRRORED_REPEAT
} as const;

export type Wrap = (typeof Wrap)[keyof typeof Wrap];

export const TextureFormat = {
  RGB: 0x1907, // gl.RGB
  RGBA: 0x1908, // gl.RGBA
  LuminanceAlpha: 0x190a, // gl.LUMINANCE_ALPHA
  Luminance: 0x1909, // gl.LUMINANCE
  Alpha: 0x1906, // gl.ALPHA
} as const;

export type TextureFormat = (typeof TextureFormat)[keyof typeof TextureFormat];

export const TextureDataType = {
  UnsignedByte: 0x1401, // gl.UNSIGNED_BYTE
  UnsignedShort565: 0x8363, // gl.UNSIGNED_SHORT_5_6_5
  UnsignedShort4444: 0x8033, // gl.UNSIGNED_SHORT_4_4_4_4
  UnsignedShort5551: 0x8034, // gl.UNSIGNED_SHORT_5_5_5_1
} as const;

export type TextureDataType = (typeof TextureDataType)[keyof typeof TextureDataType];

export type ImagePixelData = {
  width: number;
  height: number;
  bytes: Uint8Array;
};

export type TextureData =
  | { kind: "image"; image: HTMLImageElement }
  | { kind: "pixels"; pixels: ImagePixelData };

/**
 * Sampler settings extracted from:
 * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter#pname
 */
export class Texture {
  minificationFilter: MinificationFilter = MinificationFilter.Nearest;
  magnificationFilter: MagnificationFilter = MagnificationFilter.Nearest;
  wrapHorizontal: Wrap = Wrap.Repeat;
  wrapVertical: Wrap = Wrap.Repeat;
  dataType: TextureDataType = TextureDataType.UnsignedByte;
  format: TextureFormat = TextureFormat.RGBA;
  internalFormat: TextureFormat = TextureFormat.RGBA;
  webglTexture: WebGLTexture | null = null;

  constructor(readonly textureData: TextureData) {}

  get width(): number {
    if (this.textureData.kind === "image") return this.textureData.image.width;
    return this.textureData.pixels.width;
  }

  get height(): number {
    if (this.textureData.kind === "image") return this.textureData.image.height;
    return this.textureData.pixels.height;
  }

  static fromImage(image: HTMLImageElement): Texture {
    return new Texture({ kind: "image", image });
  }

  static fromPixels(pixels: ImagePixelData): Texture {
    return new Texture({ kind: "pixels", pixels });
  }

  static async fromImageUrl(url: string): Promise<Texture> {
    return Texture.fromImage(await fetchImage(url));
  }

  getWebGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
    if (!this.webglTexture) this.webglTexture = this.createWebGLTexture(gl);
    return this.webglTexture;
  }

  private createWebGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const webglTexture = gl.createTexture();
    if (!webglTexture) throw new Error("Failed to create WebGL texture");

    gl.bindTexture(gl.TEXTURE_2D, webglTexture);

    if (this.textureData.kind === "image") {
      gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, this.format, this.dataType, this.textureData.image);
    } else {
      const { width, height, bytes } = this.textureData.pixels;
      gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, width, height, 0, this.format, this.dataType, bytes);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minificationFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magnificationFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapHorizontal);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapVertical);

    // A mipmap minification filter samples levels that do not exist until
    // they are generated — without this the texture is incomplete (black).
    const needsMipmaps =
      this.minificationFilter !== MinificationFilter.Linear && this.minificationFilter !== MinificationFilter.Nearest;
    if (needsMipmaps) gl.generateMipmap(gl.TEXTURE_2D);

    return webglTexture;
  }
}
