export type Entity = number;

declare const hasComponentsBrand: unique symbol;

/**
 * An entity the type system has proof about: it is known to have the Required
 * components. The brand exists only at compile time — at runtime these are
 * plain numbers. Proof comes from iterating a system's entities set or from
 * a hasComponent() check.
 */
export type EntityWith<Components, Required extends keyof Components> = Entity & {
  readonly [hasComponentsBrand]: { [Name in Required]: true };
};

/**
 * Internal: entities handed to stored systems, branded as having every
 * component. Each stored system's real requirement is narrower, and membership
 * bookkeeping guarantees the narrow claim, so the wide cast is safe here.
 */
type ProvenEntity<Components> = EntityWith<Components, keyof Components>;

/** Read access to the components a system declared in requiredComponents. */
export type ComponentAccessor<Components, Required extends keyof Components> = {
  /**
   * Returns the entity's component, without `| undefined`. Only accepts
   * entities proven to have the component: taken from a system's entities set,
   * or narrowed through a hasComponent() check.
   */
  get<Name extends Required>(entity: EntityWith<Components, Name>, name: Name): Components[Name];
};

/** Everything a system receives on each update tick. */
export type SystemContext<Components, Required extends keyof Components> = {
  entities: ReadonlySet<EntityWith<Components, Required>>;
  components: ComponentAccessor<Components, Required>;
  deltaTime: number;
  ecs: ECS<Components>;
};

export type System<Components, Required extends keyof Components = keyof Components> = {
  readonly requiredComponents: readonly Required[];
  update?(context: SystemContext<Components, Required>): void;
  onEntityAdded?(entity: EntityWith<Components, Required>, ecs: ECS<Components>): void;
  onEntityRemoved?(entity: EntityWith<Components, Required>, ecs: ECS<Components>): void;
};

export class ECS<Components> {
  private systems = new Map<System<Components, keyof Components>, Set<ProvenEntity<Components>>>();
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

  /** Doubles as a type guard: a true result proves the entity for typed access. */
  hasComponent<Name extends keyof Components>(
    entity: Entity,
    name: Name,
  ): entity is EntityWith<Components, Name> {
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
    const provenEntity = entity as ProvenEntity<Components>;
    for (const [system, systemEntities] of this.systems) {
      const components = this.entities.get(entity)!;
      const hasEntity = systemEntities.has(provenEntity);
      const hasRequiredComponents = system.requiredComponents.every((name) =>
        components.has(name),
      );

      if (hasRequiredComponents && !hasEntity) {
        systemEntities.add(provenEntity);
        system.onEntityAdded?.(provenEntity, this);
      } else if (!hasRequiredComponents && hasEntity) {
        systemEntities.delete(provenEntity);
        system.onEntityRemoved?.(provenEntity, this);
      }
    }
  }

  private destroyEntities(): void {
    for (const entity of this.entitiesToDestroy) {
      const provenEntity = entity as ProvenEntity<Components>;
      for (const [system, systemEntities] of this.systems) {
        if (systemEntities.has(provenEntity)) {
          systemEntities.delete(provenEntity);
          system.onEntityRemoved?.(provenEntity, this);
        }
      }
      this.entities.delete(entity);
    }

    this.entitiesToDestroy = [];
  }
}
