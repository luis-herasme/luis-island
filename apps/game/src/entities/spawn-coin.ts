import type { Entity } from "@game/ecs";
import { context } from "../game-context";

const COIN_SCALE = 0.6;
const COIN_SPIN_SPEED = 2;
const COIN_VALUE = 1;

type SpawnCoinOptions = {
  position: [number, number, number];
};

/**
 * The coin prefab: a spinning Dominican peso the player can collect. The
 * mesh is a generated OBJ (scripts/generate-peso-obj.mjs) with the scans'
 * front and back in one atlas, drawn unlit because the scans carry their
 * own baked-in lighting. No physics body — pickup is the coin system's
 * distance check, so coins can also float in reach of a jump or the wind.
 */
export function spawnCoin(options: SpawnCoinOptions): Entity {
  const { ecs } = context;

  const coin = ecs.addEntity();
  ecs.addComponent(coin, "transform", {
    translation: options.position,
    rotation: [0, 0, 0, 1],
    scale: [COIN_SCALE, COIN_SCALE, COIN_SCALE],
  });
  ecs.addComponent(coin, "renderable", {
    geometry: { kind: "obj", url: "/peso.obj" },
    material: { kind: "basic", textureUrl: "/peso.jpg" },
  });
  ecs.addComponent(coin, "spin", { speed: COIN_SPIN_SPEED });
  ecs.addComponent(coin, "coin", { value: COIN_VALUE });

  return coin;
}
