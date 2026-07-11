import { Color } from "./color";

export type MaterialType = "basic" | "lambert";

export abstract class Material {
  abstract readonly type: MaterialType;
  color = new Color();
}

/** Flat color, unaffected by lights. */
export class MeshBasicMaterial extends Material {
  readonly type = "basic";

  constructor(hex?: number) {
    super();
    if (hex !== undefined) this.color.setHex(hex);
  }
}

/** Diffuse (Lambertian) shading from one directional light plus ambient. */
export class MeshLambertMaterial extends Material {
  readonly type = "lambert";

  constructor(hex?: number) {
    super();
    if (hex !== undefined) this.color.setHex(hex);
  }
}
