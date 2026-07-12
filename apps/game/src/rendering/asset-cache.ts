import type { Components } from "../components";
import { Geometry, MagnificationFilter, MinificationFilter, Texture, fetchText, parseOBJ } from "@game/render";

/**
 * Shared render assets, loaded once up front and read synchronously ever
 * after. The world definition doubles as the asset manifest: preloadAssets
 * walks it, fetches every referenced url, and from then on the systems
 * materialize resources without a single async step — load failures are
 * loud startup errors instead of silent mid-game holes.
 *
 * Anything spawned at runtime must use assets the world already declares
 * (or preload them explicitly first).
 */

const objGeometries = new Map<string, Geometry>();
const textures = new Map<string, Texture>();

export async function preloadAssets(definitions: Partial<Components>[]): Promise<void> {
  const objUrls = new Set<string>();
  const textureUrls = new Set<string>();

  for (const definition of definitions) {
    if (definition.renderable) {
      const { geometry, material } = definition.renderable;
      if (geometry.kind === "obj") objUrls.add(geometry.url);
      if (material.textureUrl) textureUrls.add(material.textureUrl);
    }
    if (definition.particleEmitter) {
      textureUrls.add(definition.particleEmitter.textureUrl);
    }
    if (definition.jukebox) {
      textureUrls.add(definition.jukebox.textureUrl);
    }
  }

  await Promise.all([
    ...[...objUrls].map(async (url) => {
      const objText = await fetchText(url);
      objGeometries.set(url, Geometry.fromOBJ(parseOBJ(objText)));
    }),
    ...[...textureUrls].map(async (url) => {
      const texture = await Texture.fromImageUrl(url);
      // Trilinear filtering: without mipmaps, distant textures alias badly.
      texture.minificationFilter = MinificationFilter.LinearMipmapLinear;
      texture.magnificationFilter = MagnificationFilter.Linear;
      textures.set(url, texture);
    }),
  ]);
}

export function getObjGeometry(url: string): Geometry {
  const geometry = objGeometries.get(url);
  if (!geometry) throw new Error(`OBJ geometry was not preloaded: ${url}`);
  return geometry;
}

export function getTexture(url: string): Texture {
  const texture = textures.get(url);
  if (!texture) throw new Error(`Texture was not preloaded: ${url}`);
  return texture;
}
