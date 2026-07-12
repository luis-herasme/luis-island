import type { Entity } from "@game/ecs";
import { GEOMETRY_BOX, Material, Mesh, Uniform } from "@game/render";
import type { Geometry } from "@game/render";
import type { Components } from "../components";
import { context } from "../game-context";
import { loadObjGeometry, loadTexture } from "../rendering/asset-cache";
import {
  BASIC_FRAGMENT_SHADER_SOURCE,
  BASIC_TEXTURED_FRAGMENT_SHADER_SOURCE,
  BASIC_TEXTURED_VERTEX_SHADER_SOURCE,
  BASIC_VERTEX_SHADER_SOURCE,
} from "../rendering/basic-shader";
import {
  LIT_FRAGMENT_SHADER_SOURCE,
  LIT_TEXTURED_FRAGMENT_SHADER_SOURCE,
  LIT_TEXTURED_VERTEX_SHADER_SOURCE,
  LIT_VERTEX_SHADER_SOURCE,
} from "../rendering/lit-shader";

/** Materialized meshes are render memory, private to this system (null while loading). */
const meshes = new Map<Entity, Mesh | null>();

const frameMeshes: Mesh[] = [];

/**
 * Owns the visual side of every `renderable` entity: the description is
 * materialized into a mesh (through the asset cache, so geometries and
 * textures are shared) when the entity appears, kept in sync with the
 * transform every frame, and dropped when the entity goes. Materializing is
 * asynchronous — a box resolves within a microtask, an OBJ url when its
 * fetch lands — and the mesh joins the scene once ready, unless the entity
 * died while loading.
 *
 * The frame is drawn from context.sceneMeshes, which also carries meshes
 * other systems own and registered themselves, like the avatar's body parts
 * and the wind puffs.
 */
export const renderSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "renderable"],

  onEntityAdded(entity, ecs) {
    const renderable = ecs.get(entity, "renderable");
    meshes.set(entity, null); // loading

    void (async () => {
      const mesh = await materializeMesh(renderable);

      // The entity may have been removed while the assets were in flight.
      if (!meshes.has(entity)) return;

      meshes.set(entity, mesh);
      context.sceneMeshes.add(mesh);
    })();
  },

  onEntityRemoved(entity) {
    const mesh = meshes.get(entity);
    meshes.delete(entity);
    if (mesh) context.sceneMeshes.delete(mesh);
  },

  update({ entities, components }) {
    for (const entity of entities) {
      const mesh = meshes.get(entity);
      if (!mesh) continue; // still loading

      const transform = components.get(entity, "transform");
      const { geometry } = components.get(entity, "renderable");

      mesh.transform.translation.copy(transform.translation);
      if (geometry.kind === "obj" && geometry.offset) {
        mesh.transform.translation.add(geometry.offset);
      }

      mesh.transform.rotation.copy(transform.rotation);
      mesh.transform.scale.copy(transform.scale);
    }

    frameMeshes.length = 0;
    for (const mesh of context.sceneMeshes) {
      frameMeshes.push(mesh);
    }

    context.renderer.renderScene({ scene: frameMeshes, camera: context.camera });
  },
});

const WHITE: [number, number, number] = [1, 1, 1];

// Shader sources by material kind and texture presence.
const SHADER_VARIANTS = {
  lit: {
    plain: { vertex: LIT_VERTEX_SHADER_SOURCE, fragment: LIT_FRAGMENT_SHADER_SOURCE },
    textured: { vertex: LIT_TEXTURED_VERTEX_SHADER_SOURCE, fragment: LIT_TEXTURED_FRAGMENT_SHADER_SOURCE },
  },
  basic: {
    plain: { vertex: BASIC_VERTEX_SHADER_SOURCE, fragment: BASIC_FRAGMENT_SHADER_SOURCE },
    textured: { vertex: BASIC_TEXTURED_VERTEX_SHADER_SOURCE, fragment: BASIC_TEXTURED_FRAGMENT_SHADER_SOURCE },
  },
} as const;

/**
 * Turns a description into a mesh. The geometry comes from the asset cache;
 * the material is built per entity, since it carries per-entity uniforms.
 * Each material kind has two shader variants of the same look, picked by
 * whether the description carries a texture map.
 */
async function materializeMesh(renderable: Components["renderable"]): Promise<Mesh> {
  // Meshes only read their geometry, so every box shares the template
  // directly — copy() is for callers that customize their copy.
  let geometry: Geometry;
  if (renderable.geometry.kind === "box") {
    geometry = GEOMETRY_BOX;
  } else {
    geometry = await loadObjGeometry(renderable.geometry.url);
  }

  const { kind, color, textureUrl } = renderable.material;

  let variant: "plain" | "textured" = "plain";
  if (textureUrl) variant = "textured";
  const shaders = SHADER_VARIANTS[kind][variant];

  let baseColor = color;
  if (baseColor === undefined) baseColor = WHITE;

  const material = new Material({ vertexShaderSource: shaders.vertex, fragmentShaderSource: shaders.fragment });
  material.setUniform("base_color", Uniform.vector3(baseColor));
  if (textureUrl) material.setUniform("texture_sampler", Uniform.texture(await loadTexture(textureUrl)));

  return new Mesh({ geometry, material });
}
