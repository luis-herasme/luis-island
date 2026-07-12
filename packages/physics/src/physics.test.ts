import { describe, expect, it } from "vitest";
import { Vector3 } from "@game/math";
import { DynamicBody, PhysicsWorld, StaticBody, contactBetween } from "./index";

const FIXED_DELTA_TIME = 1 / 60;

function dynamicBox(options: { position?: [number, number, number]; restitution?: number; damping?: number; stepHeight?: number } = {}): DynamicBody {
  return new DynamicBody({
    size: new Vector3(1, 1, 1),
    translation: new Vector3(...(options.position ?? [0, 0, 0])),
    velocity: new Vector3(),
    mass: 1,
    restitution: options.restitution ?? 0,
    damping: options.damping ?? 0,
    stepHeight: options.stepHeight ?? 0,
  });
}

function staticBox(options: { position: [number, number, number]; size: [number, number, number] }): StaticBody {
  return new StaticBody({
    size: new Vector3(...options.size),
    translation: new Vector3(...options.position),
    restitution: 0,
  });
}

describe("contactBetween", () => {
  it("returns null for separated boxes", () => {
    expect(contactBetween(dynamicBox(), dynamicBox({ position: [3, 0, 0] }))).toBeNull();
  });

  it("returns null for boxes that exactly touch", () => {
    expect(contactBetween(dynamicBox(), dynamicBox({ position: [1, 0, 0] }))).toBeNull();
  });

  it("separates along the axis of least overlap, first toward second", () => {
    // Mostly overlapping, offset a bit on x — x is the cheapest way out.
    const contact = contactBetween(dynamicBox(), dynamicBox({ position: [0.8, 0.1, 0.2] }))!;

    expect(contact.normal.x).toBe(1);
    expect(contact.normal.y).toBe(0);
    expect(contact.normal.z).toBe(0);
    expect(contact.penetration).toBeCloseTo(0.2, 5);
  });

  it("flips the normal when second is on the other side", () => {
    const contact = contactBetween(dynamicBox(), dynamicBox({ position: [-0.8, 0, 0] }))!;
    expect(contact.normal.x).toBe(-1);
  });
});

describe("PhysicsWorld", () => {
  it("integrates gravity into velocity and translation", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, -10, 0) });
    const body = dynamicBox({ position: [0, 10, 0] });
    world.addBody(body);

    world.step(0.1);

    expect(body.velocity.y).toBeCloseTo(-1, 5);
    expect(body.translation.y).toBeCloseTo(10 - 0.1, 5);
  });

  it("applyForce accelerates by force over mass", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const light = dynamicBox();
    const heavy = dynamicBox({ position: [5, 0, 0] });
    heavy.mass = 10;
    world.addBody(light);
    world.addBody(heavy);

    light.applyForce(new Vector3(10, 0, 0));
    heavy.applyForce(new Vector3(10, 0, 0));
    world.step(0.1);

    expect(light.velocity.x).toBeCloseTo(1, 5); // a = 10 / 1
    expect(heavy.velocity.x).toBeCloseTo(0.1, 5); // a = 10 / 10
  });

  it("a force lasts exactly the step it was applied in", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const body = dynamicBox();
    world.addBody(body);

    body.applyForce(new Vector3(10, 0, 0));
    world.step(0.1);
    const velocityAfterFirstStep = body.velocity.x;
    world.step(0.1);

    expect(body.velocity.x).toBe(velocityAfterFirstStep); // no lingering push
  });

  it("applyImpulse changes velocity immediately, scaled by mass", () => {
    const light = dynamicBox();
    const heavy = dynamicBox();
    heavy.mass = 10;

    light.applyImpulse(new Vector3(2, 0, 0));
    heavy.applyImpulse(new Vector3(2, 0, 0));

    expect(light.velocity.x).toBeCloseTo(2, 5);
    expect(heavy.velocity.x).toBeCloseTo(0.2, 5);
  });

  it("damping decelerates a coasting body", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const body = dynamicBox({ damping: 5 });
    body.velocity.set(10, 0, 0);
    world.addBody(body);

    for (let stepIndex = 0; stepIndex < 60; stepIndex++) world.step(FIXED_DELTA_TIME);

    expect(Math.abs(body.velocity.x)).toBeLessThan(1);
    expect(body.velocity.x).toBeGreaterThan(0); // decays, never reverses
  });

  it("a falling box comes to rest on a static ground", () => {
    const world = new PhysicsWorld();
    const ground = staticBox({ position: [0, -0.6, 0], size: [20, 0.2, 20] });
    const box = dynamicBox({ position: [0, 2, 0] });
    world.addBody(ground);
    world.addBody(box);

    for (let stepIndex = 0; stepIndex < 300; stepIndex++) world.step(FIXED_DELTA_TIME);

    // Ground top is at -0.5; a unit box resting on it has its center at 0.
    expect(box.translation.y).toBeCloseTo(0, 1);
    expect(Math.abs(box.velocity.y)).toBeLessThan(0.2);
    // The static ground never moved.
    expect(ground.translation.y).toBe(-0.6);
  });

  it("restitution bounces a falling box back up", () => {
    const world = new PhysicsWorld();
    const ground = staticBox({ position: [0, -0.6, 0], size: [20, 0.2, 20] });
    const box = dynamicBox({ position: [0, 2, 0], restitution: 0.8 });
    world.addBody(ground);
    world.addBody(box);

    let bounced = false;
    for (let stepIndex = 0; stepIndex < 300 && !bounced; stepIndex++) {
      world.step(FIXED_DELTA_TIME);
      if (box.velocity.y > 1) bounced = true;
    }

    expect(bounced).toBe(true);
  });

  it("a dynamic box cannot be pushed through a static one", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const wall = staticBox({ position: [2, 0, 0], size: [1, 1, 1] });
    const mover = dynamicBox();
    world.addBody(wall);
    world.addBody(mover);

    for (let stepIndex = 0; stepIndex < 240; stepIndex++) {
      mover.velocity.set(5, 0, 0); // driven into the wall every step
      world.step(FIXED_DELTA_TIME);
    }

    // Blocked at the wall's face (centers one full extent apart). A body
    // driven into a wall every frame holds a small residual penetration —
    // the correction removes 80% per step while the drive re-adds intrusion.
    expect(mover.translation.x).toBeLessThanOrEqual(1.05);
    expect(mover.translation.x).toBeGreaterThan(0.9);
    expect(wall.translation.x).toBe(2);
  });

  it("splits response between two dynamic bodies by mass", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const light = dynamicBox({ position: [0, 0, 0] });
    const heavy = dynamicBox({ position: [0.9, 0, 0] });
    heavy.mass = 10;
    light.velocity.set(5, 0, 0);
    world.addBody(light);
    world.addBody(heavy);

    world.step(FIXED_DELTA_TIME);

    // Momentum went from the light body into the heavy one, unevenly.
    expect(heavy.velocity.x).toBeGreaterThan(0);
    expect(light.velocity.x).toBeLessThan(5);
    expect(light.velocity.x - heavy.velocity.x).toBeLessThanOrEqual(0.0001); // no longer approaching
  });

  it("a stepping body climbs a ledge within its stepHeight", () => {
    const world = new PhysicsWorld();
    const ground = staticBox({ position: [0, -0.6, 0], size: [20, 0.2, 20] });
    // A wide raised platform starting at x = 1.5, its top at -0.1 — a 0.4
    // ledge above the walker's bottom at -0.5.
    const step = staticBox({ position: [6.5, -0.35, 0], size: [10, 0.5, 20] });
    const walker = dynamicBox({ position: [0, 0, 0], stepHeight: 0.5 });
    world.addBody(ground);
    world.addBody(step);
    world.addBody(walker);

    for (let stepIndex = 0; stepIndex < 120; stepIndex++) {
      walker.velocity.x = 3;
      world.step(FIXED_DELTA_TIME);
    }

    // It walked onto and past the ledge instead of being blocked by it.
    expect(walker.translation.x).toBeGreaterThan(1.6);
    expect(walker.translation.y).toBeCloseTo(0.4, 1); // resting on the step top at -0.1
  });

  it("a stepping body is still blocked by ledges taller than stepHeight", () => {
    const world = new PhysicsWorld();
    const ground = staticBox({ position: [0, -0.6, 0], size: [20, 0.2, 20] });
    // Wall top at +0.5: a 1.0 ledge, above the walker's 0.5 stepHeight.
    const wall = staticBox({ position: [2, 0, 0], size: [1, 1, 20] });
    const walker = dynamicBox({ position: [0, 0, 0], stepHeight: 0.5 });
    world.addBody(ground);
    world.addBody(wall);
    world.addBody(walker);

    for (let stepIndex = 0; stepIndex < 120; stepIndex++) {
      walker.velocity.x = 3;
      world.step(FIXED_DELTA_TIME);
    }

    expect(walker.translation.x).toBeLessThanOrEqual(1.05);
    expect(walker.translation.y).toBeCloseTo(0, 1);
  });

  it("stepHeight 0 keeps every ledge blocking", () => {
    const world = new PhysicsWorld();
    const ground = staticBox({ position: [0, -0.6, 0], size: [20, 0.2, 20] });
    const step = staticBox({ position: [2, -0.35, 0], size: [1, 0.5, 20] });
    const walker = dynamicBox({ position: [0, 0, 0] });
    world.addBody(ground);
    world.addBody(step);
    world.addBody(walker);

    for (let stepIndex = 0; stepIndex < 120; stepIndex++) {
      walker.velocity.x = 3;
      world.step(FIXED_DELTA_TIME);
    }

    expect(walker.translation.x).toBeLessThanOrEqual(1.05);
  });

  it("dynamic bodies are pushed, never stepped onto", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const crate = dynamicBox({ position: [2, 0, 0] });
    const walker = dynamicBox({ position: [0, 0, 0], stepHeight: 0.5 });
    world.addBody(crate);
    world.addBody(walker);

    for (let stepIndex = 0; stepIndex < 60; stepIndex++) {
      walker.velocity.set(3, 0, 0);
      world.step(FIXED_DELTA_TIME);
    }

    expect(walker.translation.y).toBeCloseTo(0, 5); // never lifted
    expect(crate.translation.x).toBeGreaterThan(2); // shoved along instead
  });

  it("keeps the latest contacts readable for game logic", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, 0, 0) });
    const first = dynamicBox();
    const second = dynamicBox({ position: [0.5, 0, 0] });
    world.addBody(first);
    world.addBody(second);

    world.step(FIXED_DELTA_TIME);

    expect(world.contacts.length).toBe(1);
    expect(world.contacts[0]!.first).toBe(first);
    expect(world.contacts[0]!.second).toBe(second);
  });
});
