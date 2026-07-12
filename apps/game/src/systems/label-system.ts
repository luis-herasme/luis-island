import type { Entity } from "@game/ecs";
import type { Mesh } from "@game/render";
import { context } from "../game-context";
import { createTextSpriteMesh } from "../rendering/text-sprite-mesh";

/** World-unit height of every label. */
const LABEL_HEIGHT = 0.32;

type LabelState = {
  /** Null while the label's text is empty — nothing to show. */
  mesh: Mesh | null;
  /** The text the mesh was generated from, to detect changes. */
  text: string;
};

/** Label meshes are this system's private memory, keyed by entity. */
const states = new Map<Entity, LabelState>();

/**
 * Owns every floating text label: a billboarded quad textured with
 * canvas-rendered text, hovering offsetY above the entity's transform.
 * Text is data — when a component's text changes (a jukebox switching
 * messages), the mesh is regenerated; empty text shows nothing.
 */
export const labelSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "label"],

  onEntityAdded(entity) {
    states.set(entity, { mesh: null, text: "" });
  },

  onEntityRemoved(entity) {
    const state = states.get(entity);
    if (!state) return;

    states.delete(entity);
    if (state.mesh) context.sceneMeshes.delete(state.mesh);
  },

  update({ entities, components }) {
    for (const entity of entities) {
      const state = states.get(entity);
      if (!state) continue;

      const { text, offsetY } = components.get(entity, "label");

      if (text !== state.text) {
        if (state.mesh) context.sceneMeshes.delete(state.mesh);
        state.mesh = null;
        state.text = text;

        if (text !== "") {
          state.mesh = createTextSpriteMesh({ text, height: LABEL_HEIGHT });
          context.sceneMeshes.add(state.mesh);
        }
      }

      if (state.mesh) {
        const { translation } = components.get(entity, "transform");
        state.mesh.transform.translation.copy(translation);
        state.mesh.transform.translation.y += offsetY;
      }
    }
  },
});
