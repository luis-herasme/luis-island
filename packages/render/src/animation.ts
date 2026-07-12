import type { Quaternion, Vector3 } from "@game/math";
import type { NodeHierarchy } from "./node-hierarchy";

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
  hierarchy: NodeHierarchy;
  samplers: Sampler[];
  channels: Channel[];
};

/**
 * A keyframe animation clip playing over a NodeHierarchy (e.g. a glTF
 * skeleton). Channels drive node-local transforms through samplers; the
 * hierarchy then propagates them into global transforms. This mirrors glTF's
 * own split — nodes belong to the scene, animations merely reference them —
 * so several clips can share one hierarchy.
 */
export class Animation {
  private readonly animationDuration: number;
  private readonly hierarchy: NodeHierarchy;
  private readonly samplers: Sampler[];
  private readonly channels: Channel[];
  private currentTime = 0;

  constructor(options: AnimationOptions) {
    this.animationDuration = options.animationDuration;
    this.hierarchy = options.hierarchy;
    this.samplers = options.samplers;
    this.channels = options.channels;
  }

  update(deltaTime: number): void {
    this.currentTime = (this.currentTime + deltaTime) % this.animationDuration;
    this.updateLocalTransforms();
    this.hierarchy.updateGlobalTransforms();
  }

  private updateLocalTransforms(): void {
    for (const channel of this.channels) {
      const node = this.hierarchy.nodes[channel.targetNodeIndex];
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
