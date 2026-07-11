# @game/ecs

A small, typed entity-component-system. No dependencies, no imports — it knows
nothing about rendering, physics, or networking. It runs the same in the
browser and on the server, which is what lets one simulation drive both.

## The three ideas

**Entities are just numbers.** An entity has no data and no behavior — it is an
ID that components attach to. `addEntity()` hands you the next one.

**Components are plain data.** A component is any value — an object, a number —
stored under a name. There are no component classes and no registration step.
Instead, you describe your game's components as a single TypeScript type
and give it to the world:

```ts
import { ECS } from "@game/ecs";

type Components = {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  health: number;
};

const ecs = new ECS<Components>();
```

Every API is typed against that type map: component names autocomplete, and a
component's value has the right type everywhere. Because components are plain
data, an entity's whole state can be serialized — which the game server's
snapshots will rely on.

**Systems are logic over entities that have the right components.** A system
declares which components it needs; the world keeps it fed with exactly the
entities that currently have all of them:

```ts
const movementSystem = ecs.createSystem({
  requiredComponents: ["position", "velocity"],

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const position = components.get(entity, "position");
      const velocity = components.get(entity, "velocity");
      position.x += velocity.x * deltaTime;
      position.y += velocity.y * deltaTime;
      position.z += velocity.z * deltaTime;
    }
  },
});

ecs.addSystem(movementSystem);
```

The game loop is then one call:

```ts
ecs.update(deltaTime); // runs every system, then flushes destroyed entities
```

## Why `components.get` never returns `undefined`

An entity only appears in a system's `entities` set while it has **all** of the
system's `requiredComponents` — so inside `update`, those components are
guaranteed to exist. The types encode this: `createSystem` captures the
`requiredComponents` array as a literal type, and `components.get(entity, name)`
only accepts names from that list, returning the component with no `| undefined`
and no `!`.

Asking for a component you did not declare is a compile error:

```ts
ecs.createSystem({
  requiredComponents: ["position"],
  update({ entities, components }) {
    for (const entity of entities) {
      components.get(entity, "position"); // ✔ typed { x, y, z }
      components.get(entity, "velocity"); // ✘ compile error: not declared
    }
  },
});
```

This guarantee rides on type inference, so **define systems through
`ecs.createSystem({...})`**. A system written as a plain object annotated
`System<Components>` still works at runtime, but the compiler falls back to
allowing every component name.

Outside of systems, where presence is genuinely unknown, use:

- `getComponent(entity, name)` → the component or `undefined`
- `get(entity, name)` → the component, or a descriptive throw
- `hasComponent(entity, name)` → boolean

## The update context

`update` receives one object — destructure what you need:

| Field | What it is |
| --- | --- |
| `entities` | The entities currently matching `requiredComponents` (`ReadonlySet<Entity>`) |
| `components` | The typed accessor described above |
| `deltaTime` | Whatever was passed to `ecs.update(deltaTime)` — seconds by convention |
| `ecs` | The world, for structural changes: `addComponent`, `destroyEntity`, … |

## Lifecycle and ordering rules

**Membership updates immediately on structural changes.** `addComponent` /
`removeComponent` re-evaluate the entity against every system on the spot.
When an entity starts matching a system, that system's `onEntityAdded(entity, ecs)`
fires; when it stops matching (component removed, or entity destroyed),
`onEntityRemoved(entity, ecs)` fires. These hooks are where a system acquires
and releases per-entity resources (the render adapter will create and remove
scene-graph nodes there).

**Destruction is deferred.** `destroyEntity(entity)` only queues the entity; it
stays fully usable until the end of the current `update()`, when it is flushed —
each system holding it gets `onEntityRemoved`, then its components are dropped.
This is what makes destroying entities from inside a system safe. Entity IDs
are never reused.

**Systems run in insertion order.** `update()` iterates systems in the order
they were added, every tick, deterministically. Order your `addSystem` calls the
way you want the frame to flow (input → simulation → cleanup).

**Adding a system late is fine.** `addSystem` scans existing entities, so
matching ones are adopted (and `onEntityAdded` fires) even if the system
arrived after they did.

**`deleteSystem`** fires `onEntityRemoved` for everything the system was
tracking, then forgets it.

## How it works inside

Storage is a map of maps: `entity → (component name → component)`. Each system
owns a `Set<Entity>` of current matches — an *interest set*. The interest sets
are maintained incrementally on every structural change, so `update()` never
scans or filters: each system iterates a prebuilt set. The trade is that
structural changes (`addComponent` / `removeComponent`) cost a check against
every system, while per-tick iteration is cheap — the right trade for game
loops, which iterate every frame and change structure rarely.

## Current limitations (deliberate, for now)

- `entities` is typed `ReadonlySet` but is the live internal set — structural
  changes during iteration are visible mid-loop. A snapshot/readonly fix is
  planned alongside benchmarks.
- `addComponent` / `removeComponent` on a destroyed entity throw a bare
  `TypeError`; descriptive errors are planned.
- No ad-hoc queries yet — all iteration goes through systems.
- Storage is map-of-maps; a dense sparse-set layout behind the same API is a
  planned experiment, to be judged by benchmarks.
