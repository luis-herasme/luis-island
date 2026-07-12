/**
 * The demo wiring every package together: the ECS owns the world, the
 * renderer draws it, @game/math carries the transforms, @game/input feeds a
 * movement system and @game/physics makes it all solid.
 *
 * Drive the little figure with WASD or the arrows — it falls onto the
 * ground when the page loads, walks with swinging arms and legs, the
 * obstacle boxes block its way, the staircase is walkable, the fan's wind
 * column lifts anything that enters it, and Space throws a small box in the
 * direction you last moved.
 */
import { startAnimationLoop } from "@game/render";
import { spawnWorld } from "./entities/spawn-world";
import { context } from "./game-context";
import { bodySystem } from "./systems/body-system";
import { cameraFollowSystem } from "./systems/camera-follow-system";
import { modelSystem } from "./systems/model-system";
import { physicsSystem } from "./systems/physics-system";
import { playerAvatarSystem } from "./systems/player-avatar-system";
import { playerMovementSystem } from "./systems/player-movement-system";
import { renderSystem } from "./systems/render-system";
import { spinSystem } from "./systems/spin-system";
import { streakSystem } from "./systems/streak-system";
import { throwSystem } from "./systems/throw-system";
import { windSystem } from "./systems/wind-system";

// Frame order: materialize → input → forces → visuals → physics → camera →
// render. The materializing systems (body, streaks, render's meshes) come
// first so entities spawned later get their resources the moment their
// description components land.
context.ecs.addSystem(bodySystem);
context.ecs.addSystem(streakSystem);
context.ecs.addSystem(playerMovementSystem);
context.ecs.addSystem(throwSystem);
context.ecs.addSystem(windSystem);
context.ecs.addSystem(spinSystem);
context.ecs.addSystem(modelSystem);
context.ecs.addSystem(physicsSystem);
// After physics (reads the settled transform), before render (writes meshes).
context.ecs.addSystem(playerAvatarSystem);
context.ecs.addSystem(cameraFollowSystem);
context.ecs.addSystem(renderSystem);

spawnWorld();

let previousTime = performance.now();

startAnimationLoop(() => {
  const currentTime = performance.now();
  // Clamped so a background tab does not produce a giant first step on return.
  const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.1);
  previousTime = currentTime;

  context.ecs.update(deltaTime);
});
