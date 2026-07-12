import { GEOMETRY_BOX, Material, Mesh, Uniform } from "@game/render";
import type { GameContext } from "../game-context";
import { BOX_FRAGMENT_SHADER_SOURCE, BOX_VERTEX_SHADER_SOURCE } from "../rendering/box-shader";

/**
 * Rendering owns the mesh lifecycle, in two systems because creation and
 * drawing watch different components: meshes are created from `visual`
 * descriptions, while drawing iterates everything that has a `mesh`
 * (including ones other systems materialize, like the wind streaks).
 */

/**
 * Creates the mesh when an entity with a `visual` appears — the hook fires
 * once both transform and visual are present, whichever lands last — and
 * removes it when the visual goes away or the entity is destroyed.
 */
export function createMeshLifecycleSystem(context: GameContext) {
  return context.ecs.createSystem({
    requiredComponents: ["transform", "visual"],

    onEntityAdded(entity, ecs) {
      const { color } = ecs.get(entity, "visual");

      const material = new Material({
        vertexShaderSource: BOX_VERTEX_SHADER_SOURCE,
        fragmentShaderSource: BOX_FRAGMENT_SHADER_SOURCE,
      });
      material.setUniform("base_color", Uniform.vector3(color));

      ecs.addComponent(entity, "mesh", new Mesh({ geometry: GEOMETRY_BOX.copy(), material }));
    },

    onEntityRemoved(entity, ecs) {
      if (ecs.hasComponent(entity, "mesh")) ecs.removeComponent(entity, "mesh");
    },
  });
}

/** Copies each entity's transform component into its mesh and draws the frame. */
export function createRenderSystem(context: GameContext) {
  const meshes: Mesh[] = [];

  return context.ecs.createSystem({
    requiredComponents: ["transform", "mesh"],

    update({ entities, components }) {
      meshes.length = 0;

      for (const entity of entities) {
        const transform = components.get(entity, "transform");
        const mesh = components.get(entity, "mesh");

        mesh.transform.translation.copy(transform.translation);
        mesh.transform.rotation.copy(transform.rotation);
        mesh.transform.scale.copy(transform.scale);

        meshes.push(mesh);
      }

      context.renderer.renderScene({ scene: meshes, camera: context.camera });
    },
  });
}
