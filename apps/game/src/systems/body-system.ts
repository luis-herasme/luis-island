import { Vector3 } from "@game/math";
import { DynamicBody, StaticBody } from "@game/physics";
import type { RigidBody } from "@game/physics";
import { context } from "../game-context";

/**
 * Materializes physics bodies: an entity described by `physicsBody` gets its
 * RigidBody built from the description and the transform (size is the
 * transform's scale), registered with the world and in `context.bodies`
 * while the entity lives, and removed when the entity goes. The body is a
 * class — runtime simulation state — so it is a registry entry, never a
 * component.
 */
export const bodySystem = context.ecs.createSystem({
  requiredComponents: ["transform", "physicsBody"],

  onEntityAdded(entity, ecs) {
    const transform = ecs.get(entity, "transform");
    const description = ecs.get(entity, "physicsBody");
    if (!transform || !description) return;

    let sizeSource = description.size;
    if (sizeSource === undefined) sizeSource = transform.scale;
    const size = new Vector3().copy(sizeSource);
    const translation = new Vector3().copy(transform.translation);

    const body: RigidBody =
      description.type === "dynamic"
        ? new DynamicBody({
            size,
            translation,
            velocity: new Vector3(),
            mass: 1,
            restitution: description.restitution,
            damping: description.damping,
            stepHeight: description.stepHeight,
          })
        : new StaticBody({ size, translation, restitution: description.restitution });

    context.physicsWorld.addBody(body);
    context.bodies.set(entity, body);
  },

  onEntityRemoved(entity) {
    const body = context.bodies.get(entity);
    if (!body) return;

    context.bodies.delete(entity);
    context.physicsWorld.removeBody(body);
  },
});
