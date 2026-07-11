import { describe, expect, it, vi } from "vitest";
import { ECS, type Entity, type System } from "./index";

interface TestComponents {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  health: number;
}

const createWorld = () => new ECS<TestComponents>();

describe("entities and components", () => {
  it("stores and retrieves components", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();

    ecs.addComponent(entity, "position", { x: 1, y: 2 });
    expect(ecs.getComponent(entity, "position")).toEqual({ x: 1, y: 2 });
    expect(ecs.hasComponent(entity, "position")).toBe(true);

    expect(ecs.getComponent(entity, "velocity")).toBeUndefined();
    expect(ecs.hasComponent(entity, "velocity")).toBe(false);
  });

  it("removes components", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();

    ecs.addComponent(entity, "health", 100);
    ecs.removeComponent(entity, "health");
    expect(ecs.getComponent(entity, "health")).toBeUndefined();
  });

  it("reports missing components on unknown entities without throwing", () => {
    const ecs = createWorld();
    expect(ecs.getComponent(999, "position")).toBeUndefined();
    expect(ecs.hasComponent(999, "position")).toBe(false);
  });
});

describe("system membership", () => {
  const createMovementSystem = () => {
    const seen: Entity[][] = [];
    const system: System<TestComponents> = {
      requiredComponents: ["position", "velocity"],
      update(entities) {
        seen.push([...entities]);
      },
      onEntityAdded: vi.fn(),
      onEntityRemoved: vi.fn(),
    };
    return { system, seen };
  };

  it("tracks only entities with all required components", () => {
    const ecs = createWorld();
    const { system, seen } = createMovementSystem();
    ecs.addSystem(system);

    const moving = ecs.addEntity();
    ecs.addComponent(moving, "position", { x: 0, y: 0 });
    ecs.addComponent(moving, "velocity", { x: 1, y: 0 });

    const still = ecs.addEntity();
    ecs.addComponent(still, "position", { x: 5, y: 5 });

    ecs.update();
    expect(seen[0]).toEqual([moving]);
  });

  it("fires onEntityAdded when an entity gains the required components", () => {
    const ecs = createWorld();
    const { system } = createMovementSystem();
    ecs.addSystem(system);

    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    expect(system.onEntityAdded).not.toHaveBeenCalled();

    ecs.addComponent(entity, "velocity", { x: 1, y: 1 });
    expect(system.onEntityAdded).toHaveBeenCalledWith(entity, ecs);
  });

  it("fires onEntityRemoved when a required component is removed", () => {
    const ecs = createWorld();
    const { system } = createMovementSystem();
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

    const { system, seen } = createMovementSystem();
    ecs.addSystem(system);
    expect(system.onEntityAdded).toHaveBeenCalledWith(entity, ecs);

    ecs.update();
    expect(seen[0]).toEqual([entity]);
  });

  it("notifies a deleted system about all of its entities", () => {
    const ecs = createWorld();
    const { system, seen } = createMovementSystem();
    ecs.addSystem(system);

    const entity = ecs.addEntity();
    ecs.addComponent(entity, "position", { x: 0, y: 0 });
    ecs.addComponent(entity, "velocity", { x: 1, y: 1 });

    ecs.deleteSystem(system);
    expect(system.onEntityRemoved).toHaveBeenCalledWith(entity, ecs);

    ecs.update();
    expect(seen).toEqual([]);
  });
});

describe("deferred destruction", () => {
  it("keeps a destroyed entity alive until the end of update()", () => {
    const ecs = createWorld();
    const entity = ecs.addEntity();
    ecs.addComponent(entity, "health", 50);

    ecs.destroyEntity(entity);
    expect(ecs.getComponent(entity, "health")).toBe(50);

    ecs.update();
    expect(ecs.getComponent(entity, "health")).toBeUndefined();
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

    ecs.update();
    expect(onEntityRemoved).toHaveBeenCalledWith(entity, ecs);
  });

  it("destroys entities queued from inside a system update", () => {
    const ecs = createWorld();
    ecs.addSystem({
      requiredComponents: ["health"],
      update(entities, world) {
        for (const entity of entities) {
          if (world.getComponent(entity, "health")! <= 0) world.destroyEntity(entity);
        }
      },
    });

    const dead = ecs.addEntity();
    ecs.addComponent(dead, "health", 0);
    const alive = ecs.addEntity();
    ecs.addComponent(alive, "health", 100);

    ecs.update();
    expect(ecs.hasComponent(dead, "health")).toBe(false);
    expect(ecs.hasComponent(alive, "health")).toBe(true);
  });
});
