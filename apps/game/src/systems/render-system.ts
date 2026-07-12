import type { Mesh } from "@game/render";
import type { GameContext } from "../game-context";

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
