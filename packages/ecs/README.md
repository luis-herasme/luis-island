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

## The type system tells the truth

The nicest property of this package: `components.get` returns components
**without `| undefined` and without `!`** — and the compiler, not convention,
makes that honest. Two guarantees combine:

**You can only ask for components you declared.** `createSystem` captures the
`requiredComponents` array as a literal type, so the accessor only accepts
those names:

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

**The result type depends on what you can prove about the entity.** `get` has
two overloads. For an entity *proven* to have the component — the type
`EntityWith<Components, Name>`, a compile-time-only brand over the plain
number — it returns the component directly. For a bare `Entity`, it returns
`Components[Name] | undefined`, because the honest answer is "maybe it's
gone". Nothing throws; strict mode makes you handle the `undefined` before
using the value.

Proof comes from two places:

- **A system's `entities` set.** Membership means "has all required
  components", so entities you iterate are pre-proven.
- **A `hasComponent` check.** It is a type guard: a true result narrows the
  entity to proven, for that component.

```ts
for (const entity of entities) {
  components.get(entity, "position");        // { x, y, z } — proven, no undefined
}

components.get(123, "position");             // { x, y, z } | undefined — handle it

// an entity id stored in a component — its target may be destroyed by now:
const targetPosition = components.get(homing.target, "position");
if (targetPosition === undefined) { /* target is gone */ }

// or narrow the entity instead of checking the value:
if (ecs.hasComponent(homing.target, "position")) {
  components.get(homing.target, "position"); // proven — no undefined
}
```

This is exactly the discipline a networked game needs: entity references that
cross frames, components, or the network are unproven by construction, so the
compiler forces the "does it still exist?" question at every such boundary —
as an `undefined` you must handle, at zero runtime cost.

Both guarantees ride on type inference, so **define systems through
`ecs.createSystem({...})`**. A system written as a plain object annotated
`System<Components>` still works at runtime, but the compiler falls back to
allowing every component name.

Outside of systems the same two methods cover everything: `ecs.get(entity,
name)` with the overloads above, and `hasComponent(entity, name)` when you
want the proof itself.

## End-to-end example

[`src/example.ts`](./src/example.ts) is a commented tour of the whole API —
spawning, a movement system, a homing-missile system that proves a stored
target reference before using it, lifecycle hooks, and the update loop. It
typechecks as part of `pnpm check`, so it cannot drift from the real API.

## The update context

`update` receives one object — destructure what you need:

| Field | What it is |
| --- | --- |
| `entities` | The entities currently matching `requiredComponents`, proven (`ReadonlySet<EntityWith<…>>`) |
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
