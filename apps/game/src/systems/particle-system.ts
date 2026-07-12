import type { Entity } from "@game/ecs";
import { Vector3 } from "@game/math";
import type { Mesh } from "@game/render";
import { context } from "../game-context";
import { loadTexture } from "../rendering/asset-cache";
import { createParticleSpritesMesh } from "../rendering/particle-sprites-mesh";

type ParticleState = {
  offsets: Vector3[];
  speeds: number[];
  /** Null while the sprite texture is loading. */
  mesh: Mesh | null;
};

/** Particles are this system's private memory, keyed by emitter entity. */
const states = new Map<Entity, ParticleState>();

/**
 * Owns the particles of every `particleEmitter` entity. The description
 * says where the emitter is and what it emits; this system creates the
 * billboarded sprite mesh once the texture loads (registering it in the
 * scene), raises each particle every frame wrapping it back to the base,
 * and releases everything when the entity goes.
 */
export const particleSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "particleEmitter"],

  onEntityAdded(entity, ecs) {
    const base = ecs.get(entity, "transform").translation;
    const emitter = ecs.get(entity, "particleEmitter");

    const offsets: Vector3[] = [];
    const speeds: number[] = [];
    for (let particleIndex = 0; particleIndex < emitter.count; particleIndex++) {
      offsets.push(
        new Vector3(
          base.x + (Math.random() - 0.5) * 2 * emitter.radius,
          base.y + Math.random() * emitter.height,
          base.z + (Math.random() - 0.5) * 2 * emitter.radius,
        ),
      );
      speeds.push(emitter.minimumSpeed + Math.random() * (emitter.maximumSpeed - emitter.minimumSpeed));
    }

    states.set(entity, { offsets, speeds, mesh: null });

    void (async () => {
      const texture = await loadTexture(emitter.textureUrl);

      // The entity may have been removed while the texture was in flight.
      const state = states.get(entity);
      if (!state) return;

      state.mesh = createParticleSpritesMesh({ offsets, texture, bottom: base.y, top: base.y + emitter.height });
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

      const base = components.get(entity, "transform").translation;
      const { height } = components.get(entity, "particleEmitter");
      const offsetBuffer = state.mesh.geometry.getVertexBuffer("offset");
      if (!offsetBuffer) continue;

      for (let particleIndex = 0; particleIndex < state.offsets.length; particleIndex++) {
        const offset = state.offsets[particleIndex]!;
        offset.y += state.speeds[particleIndex]! * deltaTime;
        if (offset.y > base.y + height) offset.y = base.y;

        offsetBuffer.setVertex(particleIndex, [offset.x, offset.y, offset.z]);
      }
    }
  },
});
