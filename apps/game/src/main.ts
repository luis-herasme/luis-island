/**
 * The demo wiring every package together: the ECS owns the world, the
 * renderer draws it, @game/math carries the transforms, @game/input feeds a
 * movement system and @game/physics makes it all solid.
 *
 * Drive the orange cube with WASD or the arrows — it falls onto the ground
 * when the page loads, the obstacle boxes block its way, the staircase is
 * walkable, the fan's wind column lifts anything that enters it, and Space
 * throws a small box in the direction you last moved.
 */
import { startAnimationLoop } from "@game/render";
import { spawnWorld } from "./entities/spawn-world";
import { createGameContext } from "./game-context";
import { createBodySystem } from "./systems/body-system";
import { createCameraFollowSystem } from "./systems/camera-follow-system";
import { createMeshSystem } from "./systems/mesh-system";
import { createPhysicsSystem } from "./systems/physics-system";
import { createPlayerMovementSystem } from "./systems/player-movement-system";
import { createRenderSystem } from "./systems/render-system";
import { createSpinSystem } from "./systems/spin-system";
import { createStreakSystem } from "./systems/streak-system";
import { createThrowSystem } from "./systems/throw-system";
import { createWindSystem } from "./systems/wind-system";

const context = createGameContext();

// The materializing systems come first, so entities spawned later get their
// meshes and bodies the moment their description components land.
context.ecs.addSystem(createMeshSystem(context));
context.ecs.addSystem(createBodySystem(context));
context.ecs.addSystem(createStreakSystem(context));

// Frame order: input → wind → visuals → physics → camera → render.
context.ecs.addSystem(createPlayerMovementSystem(context));
context.ecs.addSystem(createThrowSystem(context));
context.ecs.addSystem(createWindSystem(context));
context.ecs.addSystem(createSpinSystem(context));
context.ecs.addSystem(createPhysicsSystem(context));
context.ecs.addSystem(createCameraFollowSystem(context));
context.ecs.addSystem(createRenderSystem(context));

spawnWorld(context);

let previousTime = performance.now();

startAnimationLoop(() => {
  const currentTime = performance.now();
  // Clamped so a background tab does not produce a giant first step on return.
  const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.1);
  previousTime = currentTime;

  context.ecs.update(deltaTime);
});
