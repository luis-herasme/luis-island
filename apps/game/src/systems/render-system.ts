import { GEOMETRY_BOX, Material, Mesh, Uniform } from "@game/render";
import type { GameContext } from "../game-context";
import { BOX_FRAGMENT_SHADER_SOURCE, BOX_VERTEX_SHADER_SOURCE } from "../rendering/box-shader";

/**
 * Draws the frame, and owns mesh creation: the first time it sees an entity
 * described by `visual` without a mesh yet, it materializes the box mesh.
 * (Creation is lazy rather than hook-based because components land one at a
 * time — at onEntityAdded for `transform`, the `visual` may not exist yet.)
 */
export function createRenderSystem(context: GameContext) {
  const meshes: Mesh[] = [];

  return context.ecs.createSystem({
    requiredComponents: ["transform"],

    update({ entities, components, ecs }) {
      meshes.length = 0;

      for (const entity of entities) {
        let mesh = ecs.get(entity, "mesh");

        if (!mesh) {
          const visual = ecs.get(entity, "visual");
          if (!visual) continue; // nothing to draw (e.g. a wind zone)

          const material = new Material({
            vertexShaderSource: BOX_VERTEX_SHADER_SOURCE,
            fragmentShaderSource: BOX_FRAGMENT_SHADER_SOURCE,
          });
          material.setUniform("base_color", Uniform.vector3(visual.color));

          mesh = new Mesh({ geometry: GEOMETRY_BOX.copy(), material });
          ecs.addComponent(entity, "mesh", mesh);
        }

        const transform = components.get(entity, "transform");
        mesh.transform.translation.copy(transform.translation);
        mesh.transform.rotation.copy(transform.rotation);
        mesh.transform.scale.copy(transform.scale);

        meshes.push(mesh);
      }

      context.renderer.renderScene({ scene: meshes, camera: context.camera });
    },
  });
}
