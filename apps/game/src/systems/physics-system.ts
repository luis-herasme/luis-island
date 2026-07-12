import { context } from "../game-context";

/** Steps the world, then hands the resulting positions to the transforms. */
export const physicsSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "body"],

  update({ entities, components, deltaTime }) {
    context.physicsWorld.step(deltaTime);

    for (const entity of entities) {
      const transform = components.get(entity, "transform");
      const body = components.get(entity, "body");
      transform.translation.copy(body.translation);
    }
  },
});
