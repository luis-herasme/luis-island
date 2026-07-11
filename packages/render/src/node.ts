import { Matrix4, Quaternion, Vector3 } from "@game/math";

const UP = new Vector3(0, 1, 0);
const sharedLookAtMatrix = new Matrix4();

export class Node {
  position = new Vector3();
  quaternion = new Quaternion();
  scale = new Vector3(1, 1, 1);

  /** Local transform, recomputed from position/quaternion/scale on update. */
  matrix = new Matrix4();
  /** Local-to-world transform, valid after updateWorldMatrix(). */
  worldMatrix = new Matrix4();

  parent: Node | null = null;
  children: Node[] = [];
  visible = true;

  /**
   * Rotate so local -Z faces the target (camera convention), in local space —
   * intended for nodes at the scene root or under unrotated parents.
   */
  lookAt(target: Vector3, up = UP): this {
    this.quaternion.setFromRotationMatrix(
      sharedLookAtMatrix.targetTo(this.position, target, up),
    );
    return this;
  }

  add(child: Node): this {
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    return this;
  }

  remove(child: Node): this {
    const childIndex = this.children.indexOf(child);
    if (childIndex !== -1) {
      this.children.splice(childIndex, 1);
      child.parent = null;
    }
    return this;
  }

  updateWorldMatrix(parentWorldMatrix?: Matrix4): void {
    this.matrix.compose(this.position, this.quaternion, this.scale);
    if (parentWorldMatrix) {
      this.worldMatrix.multiplyMatrices(parentWorldMatrix, this.matrix);
    } else {
      this.worldMatrix.copy(this.matrix);
    }
    for (const child of this.children) child.updateWorldMatrix(this.worldMatrix);
  }

  traverse(callback: (node: Node) => void): void {
    callback(this);
    for (const child of this.children) child.traverse(callback);
  }
}
