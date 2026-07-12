import type { Entity } from "@game/ecs";
import { Vector3 } from "@game/math";
import type { Mesh } from "@game/render";
import { context } from "../game-context";
import { getTexture } from "../rendering/asset-cache";
import { createParticleSpritesMesh } from "../rendering/particle-sprites-mesh";

type ParticleState = {
  offsets: Vector3[];
  speeds: number[];
  mesh: Mesh;
};

/** Particles are this system's private memory, keyed by emitter entity. */
const states = new Map<Entity, ParticleState>();

/**
 * Owns the particles of every `particleEmitter` entity. The description
 * says where the emitter is and what it emits; this system creates the
 * billboarded sprite mesh when the entity appears (the texture was
 * preloaded before the world spawned), raises each particle every frame
 * wrapping it back to the base, and releases everything when the entity
 * goes.
 */
export const particleSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "particleEmitter"],

  onEntityAdded(entity, ecs) {
    const transform = ecs.get(entity, "transform");
    const emitter = ecs.get(entity, "particleEmitter");
    if (!transform || !emitter) return;

    const base = transform.translation;

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

    const mesh = createParticleSpritesMesh({
      offsets,
      texture: getTexture(emitter.textureUrl),
      bottom: base.y,
      top: base.y + emitter.height,
    });

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

      const baseY = components.get(entity, "transform").translation.y;
      const { height } = components.get(entity, "particleEmitter");
      const offsetBuffer = state.mesh.geometry.getVertexBuffer("offset");
      if (!offsetBuffer) continue;

      for (let particleIndex = 0; particleIndex < state.offsets.length; particleIndex++) {
        const offset = state.offsets[particleIndex]!;
        offset.y += state.speeds[particleIndex]! * deltaTime;
        if (offset.y > baseY + height) offset.y = baseY;

        offsetBuffer.setVertex(particleIndex, [offset.x, offset.y, offset.z]);
      }
    }
  },
});
