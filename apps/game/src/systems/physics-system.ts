import { context } from "../game-context";

/** Steps the world, then hands the resulting positions to the transforms. */
export const physicsSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "physicsBody"],

  update({ entities, components, deltaTime }) {
    context.physicsWorld.step(deltaTime);

    for (const entity of entities) {
      const body = context.bodies.get(entity);
      if (!body) continue;

      const { translation } = components.get(entity, "transform");
      translation.x = body.translation.x;
      translation.y = body.translation.y;
      translation.z = body.translation.z;
    }
  },
});
