import { Transform3D } from "@game/math";
import type { Entity } from "@game/ecs";
import { context } from "../game-context";

type SpawnBoxOptions = {
  color: [number, number, number];
  position: [number, number, number];
  scale?: [number, number, number];
  /** Omit for a purely visual box with no physics body. */
  body?: {
    type: "dynamic" | "static";
    restitution?: number;
    damping?: number;
    stepHeight?: number;
  };
};

/**
 * The box prefab: nothing but description components. The mesh and the
 * rigid body are materialized by their systems the moment the components
 * land on the entity.
 */
export function spawnBox(options: SpawnBoxOptions): Entity {
  const { ecs } = context;

  const transform = new Transform3D();
  transform.translation.set(...options.position);
  if (options.scale) transform.scale.set(...options.scale);

  const entity = ecs.addEntity();
  ecs.addComponent(entity, "transform", transform);
  ecs.addComponent(entity, "renderable", {
    geometry: { kind: "box" },
    material: { kind: "lit", color: options.color },
  });

  if (options.body) {
    ecs.addComponent(entity, "physicsBody", {
      type: options.body.type,
      restitution: options.body.restitution ?? 0,
      damping: options.body.damping ?? 0,
      stepHeight: options.body.stepHeight ?? 0,
    });
  }

  return entity;
}
