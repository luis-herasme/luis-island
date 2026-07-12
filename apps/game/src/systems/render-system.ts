import type { Entity } from "@game/ecs";
import { GEOMETRY_BOX, Material, Mesh, Uniform } from "@game/render";
import { context } from "../game-context";
import { BOX_FRAGMENT_SHADER_SOURCE, BOX_VERTEX_SHADER_SOURCE } from "../rendering/box-shader";

/** Meshes are render memory, not components: they live in this private map. */
const boxMeshes = new Map<Entity, Mesh>();

const frameMeshes: Mesh[] = [];

/**
 * Owns the visual side of every `visual` entity: the mesh is created when
 * the entity appears, kept in sync with the transform every frame, and
 * dropped when the entity (or its visual) goes. The frame is drawn from
 * context.sceneMeshes, which also carries meshes other systems own and
 * registered themselves, like the wind streaks.
 */
export const renderSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "visual"],

  onEntityAdded(entity, ecs) {
    const { color } = ecs.get(entity, "visual");

    const material = new Material({
      vertexShaderSource: BOX_VERTEX_SHADER_SOURCE,
      fragmentShaderSource: BOX_FRAGMENT_SHADER_SOURCE,
    });
    material.setUniform("base_color", Uniform.vector3(color));

    const mesh = new Mesh({ geometry: GEOMETRY_BOX.copy(), material });
    boxMeshes.set(entity, mesh);
    context.sceneMeshes.add(mesh);
  },

  onEntityRemoved(entity) {
    const mesh = boxMeshes.get(entity);
    if (!mesh) return;

    boxMeshes.delete(entity);
    context.sceneMeshes.delete(mesh);
  },

  update({ entities, components }) {
    for (const entity of entities) {
      const mesh = boxMeshes.get(entity);
      if (!mesh) continue;

      const transform = components.get(entity, "transform");
      mesh.transform.translation.copy(transform.translation);
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
