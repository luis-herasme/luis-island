import { Material, Mesh, GEOMETRY_BOX, Uniform } from "@game/render";
import type { GameContext } from "../game-context";
import { BOX_FRAGMENT_SHADER_SOURCE, BOX_VERTEX_SHADER_SOURCE } from "../rendering/box-shader";

/**
 * Materializes meshes: an entity described by `visual` gets its Mesh created
 * here when it appears, and dropped with the entity when it goes. Nothing
 * outside this system constructs box meshes.
 */
export function createMeshSystem(context: GameContext) {
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
  });
}
