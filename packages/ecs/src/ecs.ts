export type Entity = number;

/** Read access to the components a system declared in requiredComponents. */
export type ComponentAccessor<Components, Required extends keyof Components> = {
  /**
   * Returns the entity's component, without `| undefined`: membership in the
   * system's entity set guarantees presence. Throws if the component is
   * missing, which is only possible for entities from somewhere else.
   */
  get<Name extends Required>(entity: Entity, name: Name): Components[Name];
};

/** Everything a system receives on each update tick. */
export type SystemContext<Components, Required extends keyof Components> = {
  entities: ReadonlySet<Entity>;
  components: ComponentAccessor<Components, Required>;
  deltaTime: number;
  ecs: ECS<Components>;
};

export type System<Components, Required extends keyof Components = keyof Components> = {
  readonly requiredComponents: readonly Required[];
  update?(context: SystemContext<Components, Required>): void;
  onEntityAdded?(entity: Entity, ecs: ECS<Components>): void;
  onEntityRemoved?(entity: Entity, ecs: ECS<Components>): void;
};

export class ECS<Components> {
  private systems = new Map<System<Components, keyof Components>, Set<Entity>>();
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

  /**
   * Returns the component, throwing if it is absent. Inside a system prefer
   * context.components.get, which restricts names to the declared requirements.
   */
  get<Name extends keyof Components>(entity: Entity, name: Name): Components[Name] {
    const component = this.entities.get(entity)?.get(name);
    if (component === undefined) {
      throw new Error(`Entity ${entity} has no "${String(name)}" component`);
    }
    return component as Components[Name];
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
  /**
   * Identity helper that exists for type inference: Components flows from the
   * ECS instance and the requiredComponents literal narrows Required, so the
   * system's context.components only accepts declared names.
   */
  createSystem<const Required extends keyof Components>(
    system: System<Components, Required>,
  ): System<Components, Required> {
    return system;
  }

  addSystem<const Required extends keyof Components>(system: System<Components, Required>): void {
    this.systems.set(system as System<Components, keyof Components>, new Set());

    for (const entity of this.entities.keys()) {
      this.updateEntitySystems(entity);
    }
  }

  deleteSystem<Required extends keyof Components>(system: System<Components, Required>): void {
    const storedSystem = system as System<Components, keyof Components>;
    if (storedSystem.onEntityRemoved) {
      for (const entity of this.systems.get(storedSystem)!) {
        storedSystem.onEntityRemoved(entity, this);
      }
    }

    this.systems.delete(storedSystem);
  }

  // Main loop
  update(deltaTime: number): void {
    for (const [system, entities] of this.systems.entries()) {
      system.update?.({ entities, components: this, deltaTime, ecs: this });
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
