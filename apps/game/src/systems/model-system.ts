import type { Entity } from "@game/ecs";
import type { Mesh } from "@game/render";
import {
  Geometry,
  Material,
  MagnificationFilter,
  MinificationFilter,
  Mesh as RenderMesh,
  Texture,
  Uniform,
  fetchText,
  parseOBJ,
} from "@game/render";
import { context } from "../game-context";
import { MODEL_FRAGMENT_SHADER_SOURCE, MODEL_VERTEX_SHADER_SOURCE } from "../rendering/model-shader";

/** Loaded model meshes are render memory, private to this system (null while loading). */
const meshes = new Map<Entity, Mesh | null>();

/**
 * Owns textured OBJ models. Loading is asynchronous: when an entity with a
 * `model` description appears, the OBJ and its texture are fetched and the
 * mesh joins the scene once ready — unless the entity died while loading.
 */
export const modelSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "model"],

  onEntityAdded(entity, ecs) {
    const { objUrl, textureUrl } = ecs.get(entity, "model");
    meshes.set(entity, null); // loading

    void (async () => {
      const [objText, texture] = await Promise.all([fetchText(objUrl), Texture.fromImageUrl(textureUrl)]);

      // The entity may have been removed while the fetches were in flight.
      if (!meshes.has(entity)) return;

      texture.minificationFilter = MinificationFilter.Linear;
      texture.magnificationFilter = MagnificationFilter.Linear;

      const material = new Material({
        vertexShaderSource: MODEL_VERTEX_SHADER_SOURCE,
        fragmentShaderSource: MODEL_FRAGMENT_SHADER_SOURCE,
      });
      material.setUniform("texture_sampler", Uniform.texture(texture));

      const mesh = new RenderMesh({ geometry: Geometry.fromOBJ(parseOBJ(objText)), material });
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
      const { offset } = components.get(entity, "model");

      mesh.transform.translation.copy(transform.translation);
      if (offset) {
        mesh.transform.translation.x += offset[0];
        mesh.transform.translation.y += offset[1];
        mesh.transform.translation.z += offset[2];
      }

      mesh.transform.rotation.copy(transform.rotation);
      mesh.transform.scale.copy(transform.scale);
    }
  },
});
