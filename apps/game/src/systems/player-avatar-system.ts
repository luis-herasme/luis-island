import type { Entity } from "@game/ecs";
import { AXIS_X, AXIS_Y, Quaternion, Transform3D } from "@game/math";
import type { HierarchyNode } from "@game/render";
import { GEOMETRY_BOX, Material, Mesh, NodeHierarchy, Uniform } from "@game/render";
import { context } from "../game-context";
import { LIT_FRAGMENT_SHADER_SOURCE, LIT_VERTEX_SHADER_SOURCE } from "../rendering/lit-shader";

/**
 * Minecraft-style proportions, in world units. The whole avatar is one unit
 * tall so it fills the player's unit-cube collider: feet at the collider's
 * bottom, crown of the head at its top.
 */
// Oversized on purpose — the cartoon big-head look. The crown pokes past
// the unit collider, which is visual only.
const HEAD_SIZE = 0.36;
const TORSO_WIDTH = 0.25;
const TORSO_HEIGHT = 0.375;
const TORSO_DEPTH = 0.125;
const LIMB_WIDTH = 0.125;
const LIMB_HEIGHT = 0.375;

// Joint heights, relative to the collider center (the entity's translation).
const FEET_Y = -0.5;
const HIP_Y = FEET_Y + LIMB_HEIGHT;
const SHOULDER_Y = HIP_Y + TORSO_HEIGHT;

const SKIN_COLOR: [number, number, number] = [0.85, 0.67, 0.53];
const SHIRT_COLOR: [number, number, number] = [1, 0.53, 0.27];
const PANTS_COLOR: [number, number, number] = [0.3, 0.35, 0.58];

/** Radians of walk-cycle phase per world unit walked. */
const STRIDE_FREQUENCY = 1.6;
const LEG_SWING_AMPLITUDE = 0.9;
const ARM_SWING_AMPLITUDE = 0.6;
/** Speeds below this are jitter, not walking — the swing eases out. */
const WALKING_SPEED_THRESHOLD = 0.1;
// Per-second rates for easing the swing in and out and turning the body.
const SWING_EASE_RATE = 10;
const TURN_EASE_RATE = 12;

type BodyPart = {
  mesh: Mesh;
  anchorIndex: number;
};

type AvatarState = {
  hierarchy: NodeHierarchy;
  rootIndex: number;
  leftArmJointIndex: number;
  rightArmJointIndex: number;
  leftLegJointIndex: number;
  rightLegJointIndex: number;
  parts: BodyPart[];
  /** Walk-cycle phase; advances with distance walked, radians. */
  phase: number;
  /** Eased 0..1 factor scaling the swing, so stops settle instead of freeze. */
  swing: number;
};

/** Avatars are this system's private memory, keyed by entity. */
const avatars = new Map<Entity, AvatarState>();

const targetRotation = new Quaternion();

/**
 * Renders the player as a Minecraft-style figure of six boxes hung on a
 * NodeHierarchy: joints (shoulders, hips) are nodes the limbs swing around,
 * and each box's mesh copies its anchor node's global transform. The walk
 * cycle is procedural — the phase advances with the distance actually
 * walked, and the limbs swing as its sine.
 */
export const playerAvatarSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "player"],

  onEntityAdded(entity) {
    const avatar = buildAvatar();
    avatars.set(entity, avatar);
    for (const part of avatar.parts) context.sceneMeshes.add(part.mesh);
  },

  onEntityRemoved(entity) {
    const avatar = avatars.get(entity);
    if (!avatar) return;

    avatars.delete(entity);
    for (const part of avatar.parts) context.sceneMeshes.delete(part.mesh);
  },

  update({ entities, components, deltaTime }) {
    for (const entity of entities) {
      const avatar = avatars.get(entity);
      if (!avatar) continue;

      const transform = components.get(entity, "transform");
      const player = components.get(entity, "player");
      const body = context.bodies.get(entity);
      const nodes = avatar.hierarchy.nodes;

      let horizontalSpeed = 0;
      if (body?.type === "dynamic") horizontalSpeed = Math.hypot(body.velocity.x, body.velocity.z);

      avatar.phase += horizontalSpeed * STRIDE_FREQUENCY * deltaTime;

      let swingTarget = 0;
      if (horizontalSpeed > WALKING_SPEED_THRESHOLD) swingTarget = 1;
      avatar.swing += (swingTarget - avatar.swing) * (1 - Math.exp(-SWING_EASE_RATE * deltaTime));

      // Opposite limbs swing in opposite phases: left leg with right arm.
      const swingAngle = Math.sin(avatar.phase) * avatar.swing;
      nodes[avatar.leftLegJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, swingAngle * LEG_SWING_AMPLITUDE);
      nodes[avatar.rightLegJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, -swingAngle * LEG_SWING_AMPLITUDE);
      nodes[avatar.leftArmJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, -swingAngle * ARM_SWING_AMPLITUDE);
      nodes[avatar.rightArmJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, swingAngle * ARM_SWING_AMPLITUDE);

      // The root carries the body: position from physics, and a smooth turn
      // toward the last movement direction. The avatar's front is its -Z.
      const root = nodes[avatar.rootIndex]!;
      root.localTransform.translation.copy(transform.translation);

      const yaw = Math.atan2(-player.facing.x, -player.facing.z);
      targetRotation.setFromAxisAngle(AXIS_Y, yaw);
      root.localTransform.rotation.slerp(targetRotation, 1 - Math.exp(-TURN_EASE_RATE * deltaTime));

      avatar.hierarchy.updateGlobalTransforms();

      for (const part of avatar.parts) {
        const anchor = nodes[part.anchorIndex]!;
        part.mesh.transform.translation.copy(anchor.globalTransform.translation);
        part.mesh.transform.rotation.copy(anchor.globalTransform.rotation);
      }
    }
  },
});

/**
 * Builds the six-box rig. Joint nodes sit at the shoulders and hips so limbs
 * rotate around them; each visible box hangs off an anchor node placed at
 * the box's center, so the hierarchy does all the pivot math.
 */
function buildAvatar(): AvatarState {
  const nodes: (HierarchyNode | null)[] = [];

  const addNode = (parentIndex: number | null, offset: [number, number, number]): number => {
    const node: HierarchyNode = {
      parentIndex,
      childrenIndexList: [],
      localTransform: new Transform3D(),
      globalTransform: new Transform3D(),
    };
    node.localTransform.translation.set(...offset);

    const index = nodes.length;
    nodes.push(node);
    if (parentIndex !== null) nodes[parentIndex]!.childrenIndexList.push(index);
    return index;
  };

  const rootIndex = addNode(null, [0, 0, 0]);
  const torsoIndex = addNode(rootIndex, [0, HIP_Y + TORSO_HEIGHT / 2, 0]);
  const headIndex = addNode(rootIndex, [0, SHOULDER_Y + HEAD_SIZE / 2, 0]);

  const shoulderX = TORSO_WIDTH / 2 + LIMB_WIDTH / 2;
  const leftArmJointIndex = addNode(rootIndex, [shoulderX, SHOULDER_Y, 0]);
  const rightArmJointIndex = addNode(rootIndex, [-shoulderX, SHOULDER_Y, 0]);
  const leftLegJointIndex = addNode(rootIndex, [LIMB_WIDTH / 2, HIP_Y, 0]);
  const rightLegJointIndex = addNode(rootIndex, [-LIMB_WIDTH / 2, HIP_Y, 0]);

  // Limb boxes hang from their joints: the anchor is half a limb below.
  const limbAnchorOffset: [number, number, number] = [0, -LIMB_HEIGHT / 2, 0];
  const limbSize: [number, number, number] = [LIMB_WIDTH, LIMB_HEIGHT, LIMB_WIDTH];

  const parts: BodyPart[] = [
    createPart({ anchorIndex: torsoIndex, color: SHIRT_COLOR, size: [TORSO_WIDTH, TORSO_HEIGHT, TORSO_DEPTH] }),
    createPart({ anchorIndex: headIndex, color: SKIN_COLOR, size: [HEAD_SIZE, HEAD_SIZE, HEAD_SIZE] }),
    createPart({ anchorIndex: addNode(leftArmJointIndex, limbAnchorOffset), color: SKIN_COLOR, size: limbSize }),
    createPart({ anchorIndex: addNode(rightArmJointIndex, limbAnchorOffset), color: SKIN_COLOR, size: limbSize }),
    createPart({ anchorIndex: addNode(leftLegJointIndex, limbAnchorOffset), color: PANTS_COLOR, size: limbSize }),
    createPart({ anchorIndex: addNode(rightLegJointIndex, limbAnchorOffset), color: PANTS_COLOR, size: limbSize }),
  ];

  return {
    hierarchy: new NodeHierarchy(nodes),
    rootIndex,
    leftArmJointIndex,
    rightArmJointIndex,
    leftLegJointIndex,
    rightLegJointIndex,
    parts,
    phase: 0,
    swing: 0,
  };
}

type CreatePartOptions = {
  anchorIndex: number;
  color: [number, number, number];
  size: [number, number, number];
};

function createPart(options: CreatePartOptions): BodyPart {
  const material = new Material({
    vertexShaderSource: LIT_VERTEX_SHADER_SOURCE,
    fragmentShaderSource: LIT_FRAGMENT_SHADER_SOURCE,
  });
  material.setUniform("base_color", Uniform.vector3(options.color));

  const mesh = new Mesh({ geometry: GEOMETRY_BOX, material });
  mesh.transform.scale.set(...options.size);

  return { mesh, anchorIndex: options.anchorIndex };
}
