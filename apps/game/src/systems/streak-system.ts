import type { Entity } from "@game/ecs";
import { Vector3 } from "@game/math";
import type { Mesh } from "@game/render";
import { MagnificationFilter, MinificationFilter, Texture } from "@game/render";
import { context } from "../game-context";
import { createWindSpritesMesh } from "../rendering/wind-sprites-mesh";

const SPRITE_TEXTURE_URL = "/whitePuff00.png";

type StreakState = {
  offsets: Vector3[];
  speeds: number[];
  /** Null while the sprite texture is loading. */
  mesh: Mesh | null;
};

/** Streak particles are this system's private memory, keyed by entity. */
const states = new Map<Entity, StreakState>();

/**
 * Owns the puff particles of a wind column. The `windStreaks` description
 * says where the column is; this system creates the billboarded sprite mesh
 * once the texture loads (registering it in the scene), raises each puff
 * every frame wrapping it back to the base, and releases everything when
 * the entity goes.
 */
export const streakSystem = context.ecs.createSystem({
  requiredComponents: ["windStreaks"],

  onEntityAdded(entity, ecs) {
    const { center, radius, bottom, top, count } = ecs.get(entity, "windStreaks");
    const [centerX, centerZ] = center;

    const offsets: Vector3[] = [];
    const speeds: number[] = [];
    for (let streakIndex = 0; streakIndex < count; streakIndex++) {
      offsets.push(
        new Vector3(
          centerX + (Math.random() - 0.5) * 2 * radius,
          bottom + Math.random() * (top - bottom),
          centerZ + (Math.random() - 0.5) * 2 * radius,
        ),
      );
      speeds.push(3.5 + Math.random() * 3);
    }

    states.set(entity, { offsets, speeds, mesh: null });

    void (async () => {
      const texture = await Texture.fromImageUrl(SPRITE_TEXTURE_URL);

      // The entity may have been removed while the texture was in flight.
      const state = states.get(entity);
      if (!state) return;

      texture.minificationFilter = MinificationFilter.Linear;
      texture.magnificationFilter = MagnificationFilter.Linear;

      state.mesh = createWindSpritesMesh({ offsets, texture });
      context.sceneMeshes.add(state.mesh);
    })();
  },

  onEntityRemoved(entity) {
    const state = states.get(entity);
    if (!state) return;

    states.delete(entity);
    if (state.mesh) context.sceneMeshes.delete(state.mesh);
  },

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const state = states.get(entity);
      if (!state?.mesh) continue; // still loading

      const { bottom, top } = components.get(entity, "windStreaks");
      const offsetBuffer = state.mesh.geometry.getVertexBuffer("offset");
      if (!offsetBuffer) continue;

      for (let streakIndex = 0; streakIndex < state.offsets.length; streakIndex++) {
        const offset = state.offsets[streakIndex]!;
        offset.y += state.speeds[streakIndex]! * deltaTime;
        if (offset.y > top) offset.y = bottom;

        offsetBuffer.setVertex(streakIndex, [offset.x, offset.y, offset.z]);
      }
    }
  },
});
