import type { Entity } from "@game/ecs";
import type { Components } from "../components";
import { context } from "../game-context";
import { WORLD_ENTITIES } from "./world";

/**
 * Instantiates the world from its data definition: each entry becomes an
 * entity with exactly the components the definition lists. Systems
 * materialize everything else (meshes, bodies, particles) through their
 * lifecycle hooks as the components land.
 */
export function spawnWorld(): void {
  for (const definition of WORLD_ENTITIES) {
    spawnEntity(definition);
  }
}

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
