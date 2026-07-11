/**
 * Example: a 10x10 grid of quads drawn with one instanced draw call.
 *
 * Shows how instancing falls out of the data model — a mat3 attribute with
 * divisor 1 advances once per instance, and per-frame animation is just
 * setVertex writes into that buffer. This file typechecks as part of
 * `pnpm check`; point the playground's import here to run it live.
 */
import { Transform2D } from "@game/math";
import { Geometry } from "../geometry";
import { Material } from "../material";
import { Mesh } from "../mesh";
import { Renderer } from "../renderer";
import { startAnimationLoop } from "../utils";

// "position", "color" and "uv" advance per vertex; "transform" has divisor 1,
// so each instance gets its own 3x3 matrix (occupying three attribute
// locations — one per column, handled by the layout machinery).
const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 position;
in vec3 color;
in mat3 transform;

out vec3 v_color;

void main() {
  v_color = color;
  gl_Position = vec4((transform * vec3(position, 1.0)).xy, 0.0, 1.0);
}`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_color;
out vec4 fragment_color;

void main() {
  fragment_color = vec4(v_color, 1.0);
}`;

const renderer = new Renderer();

// quadInstanced(count) bundles the per-vertex quad data with a per-instance
// "transform" attribute (DynamicDraw) and sets geometry.instanceCount, which
// is what turns the draw into drawElementsInstanced.
const GRID_SIZE = 10;
const grid = new Mesh({
  geometry: Geometry.quadInstanced(GRID_SIZE * GRID_SIZE),
  material: new Material({
    vertexShaderSource: VERTEX_SHADER_SOURCE,
    fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
  }),
});

// Each instance gets its own Transform2D, written into the shared buffer.
const instanceTransforms: Transform2D[] = [];
for (let x = 0; x < GRID_SIZE; x++) {
  for (let y = 0; y < GRID_SIZE; y++) {
    const transform = new Transform2D();
    transform.scale.multiplyScalar(0.05);
    transform.translation.x = ((x + 0.5 - GRID_SIZE / 2) / GRID_SIZE) * 2;
    transform.translation.y = ((y + 0.5 - GRID_SIZE / 2) / GRID_SIZE) * 2;
    instanceTransforms.push(transform);
  }
}

// getVertexBuffer looks the attribute up by name. setVertex encodes the
// numbers into the buffer's byte layout and marks it dirty; the next render
// flushes the whole buffer with one bufferSubData.
const transformBuffer = grid.geometry.getVertexBuffer("transform");
if (!transformBuffer) throw new Error("quadInstanced geometry is missing its transform attribute");

startAnimationLoop(() => {
  // Animate by rewriting per-instance matrices. Only the bytes change —
  // layouts, the vertex array object and the program are all reused.
  for (let instance = 0; instance < instanceTransforms.length; instance++) {
    const transform = instanceTransforms[instance]!;
    transform.rotation += instance * 0.0005;
    transformBuffer.setVertex(instance, transform.toArray());
  }

  // This example clears and draws directly instead of using renderScene:
  // the shader works in clip space, so no camera uniforms are needed.
  renderer.clear();
  renderer.render(grid);
});
