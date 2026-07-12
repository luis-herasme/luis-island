import { Transform3D, Vector3 } from "@game/math";

export type HierarchyNode = {
  parentIndex: number | null;
  childrenIndexList: number[];
  localTransform: Transform3D;
  globalTransform: Transform3D;
};

/**
 * A parent-child tree of transforms — a glTF scene's node graph, a skeleton,
 * or a hand-built rig. Purely positional data: nothing here touches the GPU.
 *
 * Something writes the node-local transforms — an `Animation` clip playing
 * keyframes, or procedural code like a walk cycle — then
 * `updateGlobalTransforms` propagates them from the roots, and each node's
 * `globalTransform` is ready to be read into a mesh transform.
 */
export class NodeHierarchy {
  /** Sparse: indices that are not part of the hierarchy hold null. */
  readonly nodes: (HierarchyNode | null)[];

  constructor(nodes: (HierarchyNode | null)[]) {
    this.nodes = nodes;
  }

  updateGlobalTransforms(): void {
    // [node index, parent index]
    const nodesToUpdate: [number, number][] = [];

    for (let nodeIndex = 0; nodeIndex < this.nodes.length; nodeIndex++) {
      const node = this.nodes[nodeIndex];
      if (!node || node.parentIndex !== null) continue;

      // A root has nothing above it: its global transform is its local one.
      node.globalTransform.translation.copy(node.localTransform.translation);
      node.globalTransform.rotation.copy(node.localTransform.rotation);
      node.globalTransform.scale.copy(node.localTransform.scale);

      for (const childIndex of node.childrenIndexList) {
        nodesToUpdate.push([childIndex, nodeIndex]);
      }
    }

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
