# @game/physics

Minimal 3D rigid-body physics: collisions plus the dynamics around them —
mass, velocity, gravity, damping (deceleration), restitution. It depends only
on `@game/math` and knows nothing about rendering or the ECS; the game wires
it in through a system, the same way it wires the renderer.

Two permanent design decisions keep it small. The system is **linear-only**:
bodies never rotate, and there is no angular state anywhere — no spin, no
torque, no orientation. And every body is an **axis-aligned box** described
by its size — the only collision shape, because the game world is
made of boxes. There is no collider abstraction to dispatch on; the box is
the body's shape, directly.

## The pieces

**`StaticBody` and `DynamicBody`** — the two kinds of body, separated at the
type level because they are different concepts: a static body has no motion
state at all, so it cannot even be *described* with a mass or a velocity.
`RigidBody` is their union, discriminated by `type`. Every property is
required on purpose — each one changes behavior, so the caller decides each
one explicitly:

```ts
const wall = new StaticBody({
  size: new Vector3(1, 1, 1),
  translation: new Vector3(2, 0, 0),
  restitution: 0,               // static bodies can still be bouncy surfaces
});

const crate = new DynamicBody({
  size: new Vector3(1, 1, 1),
  translation: new Vector3(0, 2, 0),
  velocity: new Vector3(),
  mass: 1,
  restitution: 0,               // bounciness, 0..1
  damping: 0,                   // per-second linear deceleration
  stepHeight: 0,                // ledges up to this high lift instead of block
});

crate.applyImpulse(new Vector3(0, 6, 0)); // instant kick: velocity += impulse / mass
crate.applyForce(new Vector3(0, 0, -20)); // sustained push: accelerates by force / mass
```

Forces accumulate and last exactly one step — integration turns the sum
into acceleration and clears it, so a continuous push (wind, thrust) is
applied every frame. There is no stored acceleration: it is derived,
force / mass, computed during the step. Both entry points scale by mass,
which is where mass matters outside collisions — the same kick barely
moves a heavy body.

**`PhysicsWorld`** — owns the bodies and advances time:

```ts
const world = new PhysicsWorld();  // Earth-ish gravity by default
world.addBody(body);
world.step(deltaTime);
```

## What a step does

1. **Integrate.** For every dynamic body: gravity, the accumulated forces
   and damping update the velocity, the velocity updates the translation.
   Static bodies are skipped.
2. **Detect.** Every pair involving a dynamic body is tested for overlap
   (brute force — fine at this scale, a broadphase is future work). Each
   overlap produces a `Contact`: the two bodies, a normal pointing from the
   first toward the second, and the penetration depth.
3. **Resolve.** Per contact: an impulse cancels the approach velocity along
   the normal (scaled up by the pair's restitution for bounce), split between
   the bodies by inverse mass — so a static body absorbs everything and a
   heavy body barely reacts. A positional correction then pushes the bodies
   apart so resting contact does not sink, tolerating a hair of overlap to
   avoid jitter.

The contacts from the latest step stay readable on `world.contacts` for game
logic that wants to know who touched whom.

**Stairs.** A side contact between a dynamic body with a `stepHeight` and a
static box whose top edge sits within that height resolves by lifting the
body onto the ledge instead of blocking it. A staircase is then just a row of
static boxes with rises below the walker's `stepHeight` — the Minecraft-style
world stays boxes all the way down. Taller ledges block normally, so walls
stay walls.

## Wiring it into the ECS

The pattern from the demo app (`apps/game`): the body is a component, and one
system owns the step:

```ts
const physicsSystem = ecs.createSystem({
  requiredComponents: ["transform", "body"],

  update({ entities, components, deltaTime }) {
    world.step(deltaTime);

    // Physics owns positions now: copy them out for rendering.
    for (const entity of entities) {
      const transform = components.get(entity, "transform");
      const body = components.get(entity, "body");
      transform.translation.copy(body.translation);
    }
  },
});
```

Systems run input → physics → render: input writes velocities, physics
produces positions, rendering draws them.

## Current limitations (deliberate, for now)

- No broadphase: contact detection is all-pairs, O(n²) in dynamic bodies.
- No sleeping: resting bodies keep integrating every step.
- Fast, thin bodies can tunnel: detection is discrete, checked after moving,
  so something crossing a wall entirely within one step misses the contact.
- Friction is absent — damping decelerates everything uniformly instead.
