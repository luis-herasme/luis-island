import type { Entity } from "@game/ecs";
import { AXIS_X, AXIS_Y, Quaternion, Transform3D } from "@game/math";
import type { HierarchyNode } from "@game/render";
import { MagnificationFilter, Material, Mesh, NodeHierarchy, Uniform } from "@game/render";
import { context } from "../game-context";
import { getTexture } from "../rendering/asset-cache";
import { LIT_TEXTURED_FRAGMENT_SHADER_SOURCE, LIT_TEXTURED_VERTEX_SHADER_SOURCE } from "../rendering/lit-shader";
import { createSkinBoxGeometry } from "../rendering/skin-geometry";
import type { SkinBoxOptions } from "../rendering/skin-geometry";

/**
 * Minecraft-style proportions, in world units. The body is one unit tall so
 * it fills the player's unit-cube collider; the head is oversized on
 * purpose — the cartoon big-head look — and pokes past it, visual only.
 */
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

/**
 * Where each body part's unwrap lives in a modern 64x64 Minecraft skin.
 * The avatar faces -Z, so nodes on +X are the character's right side.
 */
const SKIN_REGIONS: Record<string, SkinBoxOptions> = {
  head: { origin: [0, 0], size: [8, 8, 8] },
  torso: { origin: [16, 16], size: [8, 12, 4] },
  rightArm: { origin: [40, 16], size: [4, 12, 4] },
  leftArm: { origin: [32, 48], size: [4, 12, 4] },
  rightLeg: { origin: [0, 16], size: [4, 12, 4] },
  leftLeg: { origin: [16, 48], size: [4, 12, 4] },
};

/** Radians of walk-cycle phase per world unit walked. */
const STRIDE_FREQUENCY = 1.6;
const LEG_SWING_AMPLITUDE = 0.9;
const ARM_SWING_AMPLITUDE = 0.6;
/** Speeds below this are jitter, not walking — the swing eases out. */
const WALKING_SPEED_THRESHOLD = 0.1;
// Per-second rates for easing the swing in and out and turning the body.
const SWING_EASE_RATE = 10;
const TURN_EASE_RATE = 12;

const WHITE: [number, number, number] = [1, 1, 1];

type BodyPart = {
  mesh: Mesh;
  anchorIndex: number;
};

type AvatarState = {
  hierarchy: NodeHierarchy;
  rootIndex: number;
  rightArmJointIndex: number;
  leftArmJointIndex: number;
  rightLegJointIndex: number;
  leftLegJointIndex: number;
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
 * and each box's mesh copies its anchor node's global transform. All six
 * parts sample one Minecraft skin through skin-unwrap UVs. The walk cycle
 * is procedural — the phase advances with the distance actually walked,
 * and the limbs swing as its sine.
 */
export const playerAvatarSystem = context.ecs.createSystem({
  requiredComponents: ["transform", "player"],

  onEntityAdded(entity, ecs) {
    const player = ecs.get(entity, "player");
    if (!player) return;

    const avatar = buildAvatar(player.skinUrl);
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

      // Opposite limbs swing in opposite phases: right leg with left arm.
      const swingAngle = Math.sin(avatar.phase) * avatar.swing;
      nodes[avatar.rightLegJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, swingAngle * LEG_SWING_AMPLITUDE);
      nodes[avatar.leftLegJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, -swingAngle * LEG_SWING_AMPLITUDE);
      nodes[avatar.rightArmJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, -swingAngle * ARM_SWING_AMPLITUDE);
      nodes[avatar.leftArmJointIndex]!.localTransform.rotation.setFromAxisAngle(AXIS_X, swingAngle * ARM_SWING_AMPLITUDE);

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
 * the box's center, so the hierarchy does all the pivot math. Nodes at +X
 * are the character's right side — the avatar faces -Z.
 */
function buildAvatar(skinUrl: string): AvatarState {
  const texture = getTexture(skinUrl);
  // Pixel art: crisp texels when magnified, not smeared ones.
  texture.magnificationFilter = MagnificationFilter.Nearest;

  // One material for all six parts: they sample the same skin, and the
  // renderer sets each mesh's transform right before its draw.
  const material = new Material({
    vertexShaderSource: LIT_TEXTURED_VERTEX_SHADER_SOURCE,
    fragmentShaderSource: LIT_TEXTURED_FRAGMENT_SHADER_SOURCE,
  });
  material.setUniform("base_color", Uniform.vector3(WHITE));
  material.setUniform("texture_scale", Uniform.vector2([1, 1]));
  material.setUniform("texture_sampler", Uniform.texture(texture));

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

  const createPart = (anchorIndex: number, region: SkinBoxOptions, size: [number, number, number]): BodyPart => {
    const mesh = new Mesh({ geometry: createSkinBoxGeometry(region), material });
    mesh.transform.scale.set(...size);
    return { mesh, anchorIndex };
  };

  const rootIndex = addNode(null, [0, 0, 0]);
  const torsoIndex = addNode(rootIndex, [0, HIP_Y + TORSO_HEIGHT / 2, 0]);
  const headIndex = addNode(rootIndex, [0, SHOULDER_Y + HEAD_SIZE / 2, 0]);

  const shoulderX = TORSO_WIDTH / 2 + LIMB_WIDTH / 2;
  const rightArmJointIndex = addNode(rootIndex, [shoulderX, SHOULDER_Y, 0]);
  const leftArmJointIndex = addNode(rootIndex, [-shoulderX, SHOULDER_Y, 0]);
  const rightLegJointIndex = addNode(rootIndex, [LIMB_WIDTH / 2, HIP_Y, 0]);
  const leftLegJointIndex = addNode(rootIndex, [-LIMB_WIDTH / 2, HIP_Y, 0]);

  // Limb boxes hang from their joints: the anchor is half a limb below.
  const limbAnchorOffset: [number, number, number] = [0, -LIMB_HEIGHT / 2, 0];
  const limbSize: [number, number, number] = [LIMB_WIDTH, LIMB_HEIGHT, LIMB_WIDTH];

  const parts: BodyPart[] = [
    createPart(torsoIndex, SKIN_REGIONS.torso!, [TORSO_WIDTH, TORSO_HEIGHT, TORSO_DEPTH]),
    createPart(headIndex, SKIN_REGIONS.head!, [HEAD_SIZE, HEAD_SIZE, HEAD_SIZE]),
    createPart(addNode(rightArmJointIndex, limbAnchorOffset), SKIN_REGIONS.rightArm!, limbSize),
    createPart(addNode(leftArmJointIndex, limbAnchorOffset), SKIN_REGIONS.leftArm!, limbSize),
    createPart(addNode(rightLegJointIndex, limbAnchorOffset), SKIN_REGIONS.rightLeg!, limbSize),
    createPart(addNode(leftLegJointIndex, limbAnchorOffset), SKIN_REGIONS.leftLeg!, limbSize),
  ];

  return {
    hierarchy: new NodeHierarchy(nodes),
    rootIndex,
    rightArmJointIndex,
    leftArmJointIndex,
    rightLegJointIndex,
    leftLegJointIndex,
    parts,
    phase: 0,
    swing: 0,
  };
}
