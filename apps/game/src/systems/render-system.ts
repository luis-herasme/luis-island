import type { Entity } from "@game/ecs";
import { Material, Mesh, Uniform } from "@game/render";
import type { Components } from "../components";
import { context } from "../game-context";
import { getBoxGeometry, loadObjGeometry, loadTexture } from "../rendering/asset-cache";
import { BOX_FRAGMENT_SHADER_SOURCE, BOX_VERTEX_SHADER_SOURCE } from "../rendering/box-shader";
import { MODEL_FRAGMENT_SHADER_SOURCE, MODEL_VERTEX_SHADER_SOURCE } from "../rendering/model-shader";

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
        mesh.transform.translation.x += geometry.offset[0];
        mesh.transform.translation.y += geometry.offset[1];
        mesh.transform.translation.z += geometry.offset[2];
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

/**
 * Turns a description into a mesh. The geometry comes from the asset cache;
 * the material is built per entity, since it carries per-entity uniforms.
 */
async function materializeMesh(renderable: Components["renderable"]): Promise<Mesh> {
  const geometry = renderable.geometry.kind === "box" ? getBoxGeometry() : await loadObjGeometry(renderable.geometry.url);

  let material: Material;
  if (renderable.material.kind === "color") {
    material = new Material({
      vertexShaderSource: BOX_VERTEX_SHADER_SOURCE,
      fragmentShaderSource: BOX_FRAGMENT_SHADER_SOURCE,
    });
    material.setUniform("base_color", Uniform.vector3(renderable.material.color));
  } else {
    const texture = await loadTexture(renderable.material.textureUrl);
    material = new Material({
      vertexShaderSource: MODEL_VERTEX_SHADER_SOURCE,
      fragmentShaderSource: MODEL_FRAGMENT_SHADER_SOURCE,
    });
    material.setUniform("texture_sampler", Uniform.texture(texture));
  }

  return new Mesh({ geometry, material });
}
