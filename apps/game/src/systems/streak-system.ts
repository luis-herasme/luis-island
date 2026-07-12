import { Vector3 } from "@game/math";
import type { Entity } from "@game/ecs";
import type { GameContext } from "../game-context";
import { createWindStreaksMesh } from "../rendering/wind-streaks-mesh";

type StreakState = {
  offsets: Vector3[];
  speeds: number[];
};

/**
 * Materializes and animates the streak particles of a wind column. The
 * `windStreaks` description says where the column is; this system creates
 * the instanced mesh and per-streak state when the entity appears, raises
 * each streak every frame (wrapping it back to the base), and drops its
 * state when the entity goes.
 */
export function createStreakSystem(context: GameContext) {
  const states = new Map<Entity, StreakState>();

  return context.ecs.createSystem({
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

      states.set(entity, { offsets, speeds });
      ecs.addComponent(entity, "mesh", createWindStreaksMesh(offsets));
    },

    onEntityRemoved(entity, ecs) {
      states.delete(entity);
      if (ecs.hasComponent(entity, "mesh")) ecs.removeComponent(entity, "mesh");
    },

    update({ entities, components, deltaTime, ecs }) {
      for (const entity of entities) {
        const state = states.get(entity);
        if (!state) continue;

        const { bottom, top } = components.get(entity, "windStreaks");
        // The mesh is this system's own materialization, but it is not a
        // required component — read it through the unproven accessor.
        const mesh = ecs.get(entity, "mesh");
        const offsetBuffer = mesh?.geometry.getVertexBuffer("offset");
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
}
