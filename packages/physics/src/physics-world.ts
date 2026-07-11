import { Vector3 } from "@game/math";
import { Contact, contactBetween } from "./collision";
import type { RigidBody } from "./rigid-body";

/** Earth-ish gravity; override per world through the constructor. */
const DEFAULT_GRAVITY = Object.freeze(new Vector3(0, -9.81, 0));

/**
 * How much of the remaining penetration one resolution pass removes. Below 1
 * so stacked corrections converge smoothly instead of jittering.
 */
const POSITIONAL_CORRECTION_FACTOR = 0.8;

/**
 * Penetration this small is tolerated instead of corrected — resting contact
 * always re-penetrates by a hair each step, and correcting it would vibrate.
 */
const PENETRATION_SLOP = 0.005;

type PhysicsWorldOptions = {
  gravity?: Vector3;
};

/**
 * The dynamics loop over a set of rigid bodies. Each step(deltaTime):
 *
 * 1. Integrate — gravity and damping update velocities, velocities update
 *    translations. Static bodies are skipped.
 * 2. Detect — every dynamic-involved pair is tested for overlap
 *    (brute force; a broadphase becomes worthwhile with many bodies).
 * 3. Resolve — an impulse cancels the approach velocity along each contact
 *    normal (plus restitution bounce), and a positional correction pushes
 *    overlapping bodies apart, weighted by inverse mass.
 *
 * The contacts from the latest step stay readable on `contacts` for game
 * logic ("did the player touch that?").
 */
export class PhysicsWorld {
  readonly gravity: Vector3;
  readonly bodies: RigidBody[] = [];
  contacts: Contact[] = [];

  constructor(options: PhysicsWorldOptions = {}) {
    this.gravity = options.gravity ?? DEFAULT_GRAVITY.clone();
  }

  addBody(body: RigidBody): void {
    this.bodies.push(body);
  }

  removeBody(body: RigidBody): void {
    const bodyIndex = this.bodies.indexOf(body);
    if (bodyIndex !== -1) this.bodies.splice(bodyIndex, 1);
  }

  step(deltaTime: number): void {
    this.integrate(deltaTime);
    this.detectContacts();

    for (const contact of this.contacts) {
      this.resolveContact(contact);
    }
  }

  private integrate(deltaTime: number): void {
    for (const body of this.bodies) {
      if (body.type === "static") continue;

      body.velocity.addScaledVector(this.gravity, deltaTime);

      const dampingFactor = Math.max(0, 1 - body.damping * deltaTime);
      body.velocity.multiplyScalar(dampingFactor);

      body.translation.addScaledVector(body.velocity, deltaTime);
    }
  }

  private detectContacts(): void {
    this.contacts = [];

    for (let firstIndex = 0; firstIndex < this.bodies.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < this.bodies.length; secondIndex++) {
        const first = this.bodies[firstIndex]!;
        const second = this.bodies[secondIndex]!;
        if (first.type === "static" && second.type === "static") continue;

        const contact = contactBetween(first, second);
        if (contact) this.contacts.push(contact);
      }
    }
  }

  private resolveContact(contact: Contact): void {
    const { first, second, normal, penetration } = contact;

    const totalInverseMass = first.inverseMass + second.inverseMass;
    if (totalInverseMass === 0) return;

    // Impulse: cancel the approach velocity along the normal, plus bounce.
    // The normal points first → second, so approaching means a negative
    // relative velocity along it.
    const relativeVelocityAlongNormal =
      (second.velocity.x - first.velocity.x) * normal.x +
      (second.velocity.y - first.velocity.y) * normal.y +
      (second.velocity.z - first.velocity.z) * normal.z;

    if (relativeVelocityAlongNormal < 0) {
      const restitution = Math.max(first.restitution, second.restitution);
      const impulseMagnitude = (-(1 + restitution) * relativeVelocityAlongNormal) / totalInverseMass;

      first.velocity.addScaledVector(normal, -impulseMagnitude * first.inverseMass);
      second.velocity.addScaledVector(normal, impulseMagnitude * second.inverseMass);
    }

    // Positional correction: push the bodies apart so resting contact does
    // not sink, leaving a slop of tolerated overlap to avoid jitter.
    const correctionMagnitude =
      (Math.max(penetration - PENETRATION_SLOP, 0) * POSITIONAL_CORRECTION_FACTOR) / totalInverseMass;

    first.translation.addScaledVector(normal, -correctionMagnitude * first.inverseMass);
    second.translation.addScaledVector(normal, correctionMagnitude * second.inverseMass);
  }
}
