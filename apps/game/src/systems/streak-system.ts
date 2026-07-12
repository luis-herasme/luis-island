import type { Entity } from "@game/ecs";
import { Vector3 } from "@game/math";
import type { Mesh } from "@game/render";
import { context } from "../game-context";
import { createWindStreaksMesh } from "../rendering/wind-streaks-mesh";

type StreakState = {
  offsets: Vector3[];
  speeds: number[];
  mesh: Mesh;
};

/** Streak particles are this system's private memory, keyed by entity. */
const states = new Map<Entity, StreakState>();

/**
 * Owns the streak particles of a wind column. The `windStreaks` description
 * says where the column is; this system creates the instanced mesh and
 * per-streak state when the entity appears (registering the mesh in the
 * scene), raises each streak every frame wrapping it back to the base, and
 * releases everything when the entity goes.
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

    const mesh = createWindStreaksMesh(offsets);
    states.set(entity, { offsets, speeds, mesh });
    context.sceneMeshes.add(mesh);
  },

  onEntityRemoved(entity) {
    const state = states.get(entity);
    if (!state) return;

    states.delete(entity);
    context.sceneMeshes.delete(state.mesh);
  },

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const state = states.get(entity);
      if (!state) continue;

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
