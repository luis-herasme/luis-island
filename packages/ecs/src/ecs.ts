export type Entity = number;

export interface System<Components> {
  readonly requiredComponents: (keyof Components)[];
  update?(entities: Set<Entity>, ecs: ECS<Components>): void;
  onEntityAdded?(entity: Entity, ecs: ECS<Components>): void;
  onEntityRemoved?(entity: Entity, ecs: ECS<Components>): void;
}

export class ECS<Components> {
  private systems = new Map<System<Components>, Set<Entity>>();
  private entities = new Map<Entity, Map<keyof Components, Components[keyof Components]>>();

  private nextEntityId = 0;
  private entitiesToDestroy: Entity[] = [];

  // Entities
  addEntity(): Entity {
    const entity = this.nextEntityId++;
    this.entities.set(entity, new Map());
    return entity;
  }

  /** Queues the entity for destruction at the end of the current update(). */
  destroyEntity(entity: Entity): void {
    this.entitiesToDestroy.push(entity);
  }

  // Components
  getComponent<Name extends keyof Components>(
    entity: Entity,
    name: Name,
  ): Components[Name] | undefined {
    return this.entities.get(entity)?.get(name) as Components[Name] | undefined;
  }

  hasComponent(entity: Entity, name: keyof Components): boolean {
    return this.entities.get(entity)?.has(name) ?? false;
  }

  addComponent<Name extends keyof Components>(
    entity: Entity,
    name: Name,
    data: Components[Name],
  ): void {
    this.entities.get(entity)!.set(name, data);
    this.updateEntitySystems(entity);
  }

  removeComponent(entity: Entity, name: keyof Components): void {
    this.entities.get(entity)!.delete(name);
    this.updateEntitySystems(entity);
  }

  // Systems
  createSystem<CreatedSystem extends System<Components>>(system: CreatedSystem): CreatedSystem {
    return system;
  }

  addSystem(system: System<Components>): void {
    this.systems.set(system, new Set());

    for (const entity of this.entities.keys()) {
      this.updateEntitySystems(entity);
    }
  }

  deleteSystem(system: System<Components>): void {
    if (system.onEntityRemoved) {
      for (const entity of this.systems.get(system)!) {
        system.onEntityRemoved(entity, this);
      }
    }

    this.systems.delete(system);
  }

  // Main loop
  update(): void {
    for (const [system, entities] of this.systems.entries()) {
      system.update?.(entities, this);
    }

    this.destroyEntities();
  }

  // Internals
  private updateEntitySystems(entity: Entity): void {
    for (const [system, systemEntities] of this.systems) {
      const components = this.entities.get(entity)!;
      const hasEntity = systemEntities.has(entity);
      const hasRequiredComponents = system.requiredComponents.every((name) =>
        components.has(name),
      );

      if (hasRequiredComponents && !hasEntity) {
        systemEntities.add(entity);
        system.onEntityAdded?.(entity, this);
      } else if (!hasRequiredComponents && hasEntity) {
        systemEntities.delete(entity);
        system.onEntityRemoved?.(entity, this);
      }
    }
  }

  private destroyEntities(): void {
    for (const entity of this.entitiesToDestroy) {
      for (const [system, systemEntities] of this.systems) {
        if (systemEntities.has(entity)) {
          systemEntities.delete(entity);
          system.onEntityRemoved?.(entity, this);
        }
      }
      this.entities.delete(entity);
    }

    this.entitiesToDestroy = [];
  }
}
