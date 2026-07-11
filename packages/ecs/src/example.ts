/**
 * An end-to-end tour of @game/ecs, written to show how the type system
 * carries you. This file typechecks with the repo (`pnpm check`), so it
 * cannot drift from the real API.
 */
import { ECS, type Entity } from "./index";

// 1. Describe every component of your game in one type. Components are plain
//    data — that is what will make entities serializable for the game
//    server's snapshots.
type Components = {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  health: number;
  // A component may reference another entity. Note the field's type is
  // Entity — a plain number. It carries no proof the target still exists,
  // and the type system will hold us to that below.
  homing: { target: Entity; speed: number };
};

const ecs = new ECS<Components>();

// 2. Spawning: an entity is just an id; components attach to it.
//    Component names and value shapes are checked against the type above.
const player = ecs.addEntity();
ecs.addComponent(player, "position", { x: 0, y: 0 });
ecs.addComponent(player, "velocity", { x: 1, y: 0 });
ecs.addComponent(player, "health", 100);

const missile = ecs.addEntity();
ecs.addComponent(missile, "position", { x: 10, y: 10 });
ecs.addComponent(missile, "homing", { target: player, speed: 2 });

// 3. A system declares what it needs; the world keeps it fed with exactly
//    the entities that currently have all of it.
const movementSystem = ecs.createSystem({
  requiredComponents: ["position", "velocity"],

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      // Entities from the set are PROVEN to have position and velocity, so
      // get() returns them directly — no `| undefined`, no `!`.
      const position = components.get(entity, "position");
      const velocity = components.get(entity, "velocity");
      position.x += velocity.x * deltaTime;
      position.y += velocity.y * deltaTime;

      // Both of these are compile errors, not runtime surprises:
      //   components.get(entity, "health"); // "health" was not declared above
      //   components.get(123, "position");  // a bare number proves nothing
    }
  },
});

// 4. Stored entity references are where the proof system earns its keep.
//    The missile's target may have been destroyed since last frame — so the
//    compiler refuses `components.get(homing.target, ...)` until we check.
const homingSystem = ecs.createSystem({
  requiredComponents: ["position", "homing"],

  update({ entities, components, deltaTime, ecs }) {
    for (const entity of entities) {
      const homing = components.get(entity, "homing");

      // hasComponent() is a type guard: a true result IS the proof.
      if (!ecs.hasComponent(homing.target, "position")) {
        ecs.destroyEntity(entity); // target is gone — retire the missile
        continue;
      }

      // Inside this branch homing.target is proven, so typed access works.
      const targetPosition = components.get(homing.target, "position");
      const position = components.get(entity, "position");
      position.x += Math.sign(targetPosition.x - position.x) * homing.speed * deltaTime;
      position.y += Math.sign(targetPosition.y - position.y) * homing.speed * deltaTime;
    }
  },
});

// 5. Lifecycle hooks fire when an entity starts or stops matching — the place
//    to acquire and release per-entity resources (the render adapter will
//    create and remove scene-graph nodes here). The entity argument is proven
//    too: ecs.get() cannot miss for declared components.
const healthMonitorSystem = ecs.createSystem({
  requiredComponents: ["health"],

  onEntityAdded(entity, ecs) {
    console.log(`entity ${entity} entered with ${ecs.get(entity, "health")} health`);
  },
  onEntityRemoved(entity) {
    console.log(`entity ${entity} left (destroyed, or lost its health component)`);
  },
});

// 6. Systems run in the order they were added, once per update(). Destruction
//    is deferred to the end of update(), so destroying mid-iteration (as the
//    homing system does) is always safe.
ecs.addSystem(movementSystem);
ecs.addSystem(homingSystem);
ecs.addSystem(healthMonitorSystem);

const fixedTimeStep = 1 / 60;
ecs.update(fixedTimeStep);
