import type { Entity } from "@game/ecs";
import type { Mesh } from "@game/render";
import { Uniform } from "@game/render";
import { context } from "../game-context";
import { createWaterMesh } from "../rendering/water-mesh";

/** Water meshes are this system's private memory, keyed by entity. */
const meshes = new Map<Entity, Mesh>();

let elapsedTime = 0;

/**
 * Owns the water surface of every `water` entity: a flat plane whose
 * animation lives entirely in its shader. The system feeds the shader its
 * two per-frame uniforms — the running time that moves the waves, and the
 * camera position that drives the fresnel and the sun glints.
 */
export const waterSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "water"],

  onEntityAdded(entity) {
    const mesh = createWaterMesh();
    meshes.set(entity, mesh);
    context.sceneMeshes.add(mesh);
  },

  onEntityRemoved(entity) {
    const mesh = meshes.get(entity);
    if (!mesh) return;

    meshes.delete(entity);
    context.sceneMeshes.delete(mesh);
  },

  update({ entities, components, deltaTime }) {
    elapsedTime += deltaTime;
    const cameraPosition = context.camera.transform.translation;

    for (const entity of entities) {
      const mesh = meshes.get(entity);
      if (!mesh) continue;

      const transform = components.get(entity, "transform");
      mesh.transform.translation.copy(transform.translation);
      mesh.transform.rotation.copy(transform.rotation);
      mesh.transform.scale.copy(transform.scale);

      mesh.material.setUniform("time", Uniform.float(elapsedTime));
      mesh.material.setUniform("camera_position", Uniform.vector3([cameraPosition.x, cameraPosition.y, cameraPosition.z]));
    }
  },
});
