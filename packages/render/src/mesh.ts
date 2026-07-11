import { Node } from "./node";
import type { Geometry } from "./geometry";
import type { Material } from "./material";

export class Mesh extends Node {
  constructor(
    public geometry: Geometry,
    public material: Material,
  ) {
    super();
  }
}
