import type { Entity } from "@game/ecs";
import type { Components } from "./components";
import { context } from "./game-context";

/**
 * Instantiates a plain JSON entity definition: the entity gets exactly the
 * components the definition lists, and the systems materialize everything
 * else (meshes, bodies, particles) through their lifecycle hooks as the
 * components land. The player definition also registers itself as
 * `context.playerEntity`.
 */
export function spawnEntity(definition: Partial<Components>): Entity {
  const { ecs } = context;
  const entity = ecs.addEntity();

  for (const componentName of Object.keys(definition) as (keyof Components)[]) {
    const component = definition[componentName];
    if (component !== undefined) ecs.addComponent(entity, componentName, component);
  }

  if (definition.player) context.playerEntity = entity;

  return entity;
}
