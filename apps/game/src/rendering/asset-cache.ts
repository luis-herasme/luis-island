import { Geometry, MagnificationFilter, MinificationFilter, Texture, fetchText, parseOBJ } from "@game/render";

/**
 * Shared render assets, loaded once and reused. Meshes stay per-entity (they
 * carry the transform), but the geometry buffers and textures underneath are
 * shared: every box entity draws the same GPU buffers, and a model url or
 * texture url is only ever fetched once. Caching the promise (not the value)
 * means concurrent requests for the same url share one in-flight load.
 */

const objGeometries = new Map<string, Promise<Geometry>>();

export function loadObjGeometry(url: string): Promise<Geometry> {
  let geometry = objGeometries.get(url);
  if (!geometry) {
    geometry = fetchText(url).then((objText) => Geometry.fromOBJ(parseOBJ(objText)));
    objGeometries.set(url, geometry);
  }
  return geometry;
}

const textures = new Map<string, Promise<Texture>>();

export function loadTexture(url: string): Promise<Texture> {
  let texture = textures.get(url);
  if (!texture) {
    texture = Texture.fromImageUrl(url).then((loadedTexture) => {
      // Trilinear filtering: without mipmaps, distant textures alias badly.
      loadedTexture.minificationFilter = MinificationFilter.LinearMipmapLinear;
      loadedTexture.magnificationFilter = MagnificationFilter.Linear;
      return loadedTexture;
    });
    textures.set(url, texture);
  }
  return texture;
}
