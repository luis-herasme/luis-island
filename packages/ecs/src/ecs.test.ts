import { describe, expect, it, vi } from "vitest";
import { ECS, type Entity } from "./index";

type TestComponents = {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  health: number;
};

const createWorld = () => new ECS<TestComponents>();

describe("entities and components", () => {
  it("stores and retrieves components", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();

    ecs.addComponent(entity, "position", { x: 1, y: 2 });
    expect(ecs.get(entity, "position")).toEqual({ x: 1, y: 2 });
    expect(ecs.hasComponent(entity, "position")).toBe(true);

    expect(ecs.get(entity, "velocity")).toBeUndefined();
    expect(ecs.hasComponent(entity, "velocity")).toBe(false);
  });

  it("removes components", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();

    ecs.addComponent(entity, "health", 100);
    ecs.removeComponent(entity, "health");
    expect(ecs.get(entity, "health")).toBeUndefined();
  });

  it("reports missing components on unknown entities without throwing", () => {
    const ecs = createWorld();
    expect(ecs.get(999, "position")).toBeUndefined();
    expect(ecs.hasComponent(999, "position")).toBe(false);
  });

  it("get() types the result by proof", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "health", 42);

    // unproven entity: the optional overload applies
    const maybeHealth = ecs.get(entity, "health");
    expect(maybeHealth).toBe(42);
    // @ts-expect-error unproven access is optional and cannot be assumed present
    const assumedHealth: number = ecs.get(entity, "health");
    expect(assumedHealth).toBe(42);

    // proven through the type guard: no undefined in the result type
    if (ecs.hasComponent(entity, "health")) {
      const provenHealth: number = ecs.get(entity, "health");
      expect(provenHealth).toBe(42);
    }

    // absent component: undefined, never a throw
    expect(ecs.get(entity, "velocity")).toBeUndefined();
  });
});

describe("system membership", () => {
  const createMovementSystem = (ecs: ECS<TestComponents>) => {
    const seen: Entity[][] = [];
    const system = ecs.createSystem({
      requiredComponents: ["position", "velocity"],
      update({ entities }) {
        seen.push([...entities]);
      },
      onEntityAdded: vi.fn(),
      onEntityRemoved: vi.fn(),
    });
    return { system, seen };
  };

  it("tracks only entities with all required components", () => {
    const ecs = createWorld();
    const { system, seen } = createMovementSystem(ecs);
    ecs.addSystem(system);

    const moving = ecs.addEntity();
    ecs.addComponent(moving, "position", { x: 0, y: 0 });
    ecs.addComponent(moving, "velocity", { x: 1, y: 0 });

    const still = ecs.addEntity();
    ecs.addComponent(still, "position", { x: 5, y: 5 });

    ecs.update(0);
    expect(seen[0]).toEqual([moving]);
  });

  it("fires onEntityAdded when an entity gains the required components", () => {
    const ecs = createWorld();
    const { system } = createMovementSystem(ecs);
    ecs.addSystem(system);

    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    expect(system.onEntityAdded).not.toHaveBeenCalled();

    ecs.addComponent(entity, "velocity", { x: 1, y: 1 });
    expect(system.onEntityAdded).toHaveBeenCalledWith(entity, ecs);
  });

  it("fires onEntityRemoved when a required component is removed", () => {
    const ecs = createWorld();
    const { system } = createMovementSystem(ecs);
    ecs.addSystem(system);

    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    ecs.addComponent(entity, "velocity", { x: 1, y: 1 });

    ecs.removeComponent(entity, "velocity");
    expect(system.onEntityRemoved).toHaveBeenCalledWith(entity, ecs);
  });

  it("picks up entities that existed before the system was added", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    ecs.addComponent(entity, "velocity", { x: 1, y: 1 });

    const { system, seen } = createMovementSystem(ecs);
    ecs.addSystem(system);
    expect(system.onEntityAdded).toHaveBeenCalledWith(entity, ecs);

    ecs.update(0);
    expect(seen[0]).toEqual([entity]);
  });

  it("notifies a deleted system about all of its entities", () => {
    const ecs = createWorld();
    const { system, seen } = createMovementSystem(ecs);
    ecs.addSystem(system);

    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    ecs.addComponent(entity, "velocity", { x: 1, y: 1 });

    ecs.deleteSystem(system);
    expect(system.onEntityRemoved).toHaveBeenCalledWith(entity, ecs);

    ecs.update(0);
    expect(seen).toEqual([]);
  });
});

describe("system update context", () => {
  it("passes deltaTime through to systems", () => {
    const ecs = createWorld();
    const receivedDeltas: number[] = [];
    ecs.addSystem({
      requiredComponents: [],
      update({ deltaTime }) {
        receivedDeltas.push(deltaTime);
      },
    });

    ecs.update(1 / 60);
    ecs.update(0.25);
    expect(receivedDeltas).toEqual([1 / 60, 0.25]);
  });

  it("gives systems non-optional access to their required components", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    ecs.addComponent(entity, "velocity", { x: 3, y: 4 });

    ecs.addSystem(
      ecs.createSystem({
        requiredComponents: ["position", "velocity"],
        update({ entities, components, deltaTime }) {
          for (const movingEntity of entities) {
            const position = components.get(movingEntity, "position");
            const velocity = components.get(movingEntity, "velocity");
            position.x += velocity.x * deltaTime;
            position.y += velocity.y * deltaTime;
          }
        },
      }),
    );

    ecs.update(2);
    expect(ecs.get(entity, "position")).toEqual({ x: 6, y: 8 });
  });

  it("types unproven entities as optional inside systems", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 1, y: 1 });
    const rawEntity: number = entity;

    let maybePosition: { x: number; y: number } | undefined;
    ecs.addSystem(
      ecs.createSystem({
        requiredComponents: ["position"],
        update({ components }) {
          maybePosition = components.get(rawEntity, "position");
          // @ts-expect-error unproven access is optional and cannot be assumed present
          const assumedPosition: { x: number; y: number } = components.get(rawEntity, "position");
          expect(assumedPosition).toBeDefined();
        },
      }),
    );

    ecs.update(0);
    expect(maybePosition).toEqual({ x: 1, y: 1 });
  });

  it("hasComponent proves an entity for typed access", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 7, y: 8 });
    const unproven: number = entity;

    let observed: { x: number; y: number } | undefined;
    ecs.addSystem(
      ecs.createSystem({
        requiredComponents: ["position"],
        update({ components }) {
          if (ecs.hasComponent(unproven, "position")) {
            observed = components.get(unproven, "position");
          }
        },
      }),
    );

    ecs.update(0);
    expect(observed).toEqual({ x: 7, y: 8 });
  });

  it("rejects undeclared component names at compile time", () => {
    const ecs = createWorld();
    // never added to the world; this test is a compile-time assertion
    ecs.createSystem({
      requiredComponents: ["position"],
      update({ entities, components }) {
        for (const entity of entities) {
          // @ts-expect-error "velocity" is not in requiredComponents
          components.get(entity, "velocity");
        }
      },
    });
    expect(true).toBe(true);
  });

  it("exposes the world so systems can mutate entities", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "health", 1);

    ecs.addSystem({
      requiredComponents: ["health"],
      update({ entities, ecs: world }) {
        for (const damagedEntity of entities) {
          world.addComponent(damagedEntity, "position", { x: 0, y: 0 });
        }
      },
    });

    ecs.update(0);
    expect(ecs.get(entity, "position")).toEqual({ x: 0, y: 0 });
  });
});

describe("deferred destruction", () => {
  it("keeps a destroyed entity alive until the end of update()", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "health", 50);

    ecs.destroyEntity(entity);
    expect(ecs.get(entity, "health")).toBe(50);

    ecs.update(0);
    expect(ecs.get(entity, "health")).toBeUndefined();
    expect(ecs.hasComponent(entity, "health")).toBe(false);
  });

  it("notifies systems when a destroyed entity is flushed", () => {
    const ecs = createWorld();
    const onEntityRemoved = vi.fn();
    ecs.addSystem({ requiredComponents: ["health"], onEntityRemoved });

    const entity = ecs.addEntity();
    ecs.addComponent(entity, "health", 10);

    ecs.destroyEntity(entity);
    expect(onEntityRemoved).not.toHaveBeenCalled();

    ecs.update(0);
    expect(onEntityRemoved).toHaveBeenCalledWith(entity, ecs);
  });

  it("destroys entities queued from inside a system update", () => {
    const ecs = createWorld();
    ecs.addSystem(
      ecs.createSystem({
        requiredComponents: ["health"],
        update({ entities, components, ecs: world }) {
          for (const entity of entities) {
            if (components.get(entity, "health") <= 0) world.destroyEntity(entity);
          }
        },
      }),
    );

    const dead = ecs.addEntity();
    ecs.addComponent(dead, "health", 0);
    const alive = ecs.addEntity();
    ecs.addComponent(alive, "health", 100);

    ecs.update(0);
    expect(ecs.hasComponent(dead, "health")).toBe(false);
    expect(ecs.hasComponent(alive, "health")).toBe(true);
  });
});
