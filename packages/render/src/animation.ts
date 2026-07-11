import { Quaternion, Transform3D, Vector3 } from "@game/math";

export type AnimationNode = {
  parentIndex: number | null;
  childrenIndexList: number[];
  localTransform: Transform3D;
  globalTransform: Transform3D;
};

export type SamplerValues = { kind: "vector3"; values: Vector3[] } | { kind: "quaternion"; values: Quaternion[] };

export type Interpolation = "linear";

export type Sampler = {
  times: number[];
  values: SamplerValues;
  interpolation: Interpolation;
};

export type NodeProperty = "translation" | "rotation" | "scale";

export type Channel = {
  samplerIndex: number;
  targetNodeIndex: number;
  targetNodeProperty: NodeProperty;
};

type AnimationOptions = {
  animationDuration: number;
  /** Sparse: indices that are not part of the hierarchy hold null. */
  nodes: (AnimationNode | null)[];
  samplers: Sampler[];
  channels: Channel[];
};

/**
 * A keyframe animation over a node hierarchy (e.g. a glTF skeleton).
 * Channels drive node-local transforms through samplers; global transforms
 * are recomputed by walking the hierarchy from the roots.
 */
export class Animation {
  private readonly animationDuration: number;
  private readonly nodes: (AnimationNode | null)[];
  private readonly samplers: Sampler[];
  private readonly channels: Channel[];
  private currentTime = 0;

  constructor(options: AnimationOptions) {
    this.animationDuration = options.animationDuration;
    this.nodes = options.nodes;
    this.samplers = options.samplers;
    this.channels = options.channels;
  }

  update(deltaTime: number): void {
    this.currentTime = (this.currentTime + deltaTime) % this.animationDuration;
    this.updateLocalTransforms();
    this.updateGlobalTransforms();
  }

  private updateLocalTransforms(): void {
    for (const channel of this.channels) {
      const node = this.nodes[channel.targetNodeIndex];
      if (!node) throw new Error(`Channel targets a missing node: ${channel.targetNodeIndex}`);

      const sampler = this.samplers[channel.samplerIndex];
      if (!sampler) throw new Error(`Channel targets a missing sampler: ${channel.samplerIndex}`);

      const index = getTimeIndex(sampler, this.currentTime);
      if (index === null) return;

      const previousTime = sampler.times[index]!;
      const nextTime = sampler.times[index + 1]!;
      const alpha = (this.currentTime - previousTime) / (nextTime - previousTime);

      // interpolation: "linear" is the only supported mode
      if (sampler.values.kind === "vector3") {
        const value = sampler.values.values[index]!.clone().lerp(sampler.values.values[index + 1]!, alpha);

        switch (channel.targetNodeProperty) {
          case "translation":
            node.localTransform.translation.copy(value);
            break;
          case "scale":
            node.localTransform.scale.copy(value);
            break;
          default:
            throw new Error(`A vector3 sampler cannot drive the ${channel.targetNodeProperty} property`);
        }
      } else {
        const value = sampler.values.values[index]!.clone().slerp(sampler.values.values[index + 1]!, alpha);

        if (channel.targetNodeProperty !== "rotation") {
          throw new Error(`A quaternion sampler cannot drive the ${channel.targetNodeProperty} property`);
        }

        node.localTransform.rotation.copy(value);
      }
    }
  }

  updateGlobalTransforms(): void {
    // [node index, parent index]
    const nodesToUpdate = this.collectRootChildren();

    let entry: [number, number] | undefined;
    while ((entry = nodesToUpdate.shift())) {
      const [nodeIndex, parentIndex] = entry;

      const parentNode = this.nodes[parentIndex]!;
      const node = this.nodes[nodeIndex]!;

      const globalMatrix = parentNode.globalTransform.toMatrix4x4().multiply(node.localTransform.toMatrix4x4());
      node.globalTransform = Transform3D.fromMatrix4x4(globalMatrix);

      for (const childIndex of node.childrenIndexList) {
        nodesToUpdate.push([childIndex, nodeIndex]);
      }
    }
  }

  /** Pairs of global joint positions, one line segment per parent-child bone. */
  getLines(): Vector3[] {
    const nodesToUpdate = this.collectRootChildren();
    const lines: Vector3[] = [];

    let entry: [number, number] | undefined;
    while ((entry = nodesToUpdate.shift())) {
      const [nodeIndex, parentIndex] = entry;

      const parentNode = this.nodes[parentIndex]!;
      const node = this.nodes[nodeIndex]!;

      if (parentNode.parentIndex !== null) {
        lines.push(parentNode.globalTransform.translation.clone());
        lines.push(node.globalTransform.translation.clone());
      }

      for (const childIndex of node.childrenIndexList) {
        nodesToUpdate.push([childIndex, nodeIndex]);
      }
    }

    return lines;
  }

  /** [node index, parent index] pairs for every child of a root node. */
  private collectRootChildren(): [number, number][] {
    const rootChildren: [number, number][] = [];

    for (let nodeIndex = 0; nodeIndex < this.nodes.length; nodeIndex++) {
      const node = this.nodes[nodeIndex];
      if (!node || node.parentIndex !== null) continue;

      for (const childIndex of node.childrenIndexList) {
        rootChildren.push([childIndex, nodeIndex]);
      }
    }

    return rootChildren;
  }
}

/** Index of the keyframe interval containing time, or null when past the end. */
function getTimeIndex(sampler: Sampler, time: number): number | null {
  let index = 0;

  while (index < sampler.times.length - 1 && time > sampler.times[index + 1]!) {
    index += 1;
  }

  if (index + 1 >= sampler.times.length) return null;

  return index;
}
