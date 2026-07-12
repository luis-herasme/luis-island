import { Vector3 } from "@game/math";
import { DynamicBody, StaticBody } from "@game/physics";
import type { RigidBody } from "@game/physics";
import { context } from "../game-context";

/**
 * Materializes physics bodies: an entity described by `physicsBody` gets its
 * RigidBody built from the description and the transform (size is the
 * transform's scale), registered with the world while the entity lives, and
 * removed from the world when the entity goes.
 */
export const bodySystem = context.ecs.createSystem({
  requiredComponents: ["transform", "physicsBody"],

  onEntityAdded(entity, ecs) {
    const transform = ecs.get(entity, "transform");
    const description = ecs.get(entity, "physicsBody");

    const size = description.size ? new Vector3(...description.size) : transform.scale.clone();
    const translation = transform.translation.clone();

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
    ecs.addComponent(entity, "body", body);
  },

  onEntityRemoved(entity, ecs) {
    const body = ecs.get(entity, "body");
    if (body) context.physicsWorld.removeBody(body);
  },
});
