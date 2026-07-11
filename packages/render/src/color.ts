export class Color {
  constructor(
    public r = 1,
    public g = 1,
    public b = 1,
  ) {}

  set(r: number, g: number, b: number): this {
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }

  setHex(hex: number): this {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }

  copy(color: Color): this {
    return this.set(color.r, color.g, color.b);
  }

  multiplyScalar(scalar: number): this {
    return this.set(this.r * scalar, this.g * scalar, this.b * scalar);
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b);
  }
}
