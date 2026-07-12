import { Vector3 } from "@game/math";
import { BufferUsage, Data, Geometry, IndexBuffer, Material, Mesh, VertexBuffer, VertexData } from "@game/render";

const STREAK_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 offset;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

void main() {
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position + offset, 1.0);
}`;

const STREAK_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

out vec4 fragment_color;

void main() {
  fragment_color = vec4(0.78, 0.88, 0.98, 1.0);
}`;

/**
 * One instanced mesh for a whole column of streaks: a thin upright cross
 * (two perpendicular quads, so it reads from any angle) per particle, placed
 * by a per-instance offset attribute the streak system rewrites each frame.
 */
export function createWindStreaksMesh(offsets: Vector3[]): Mesh {
  const halfWidth = 0.035;
  const halfHeight = 0.28;

  // prettier-ignore
  const positions: [number, number, number][] = [
    // Quad in the XY plane
    [-halfWidth, -halfHeight, 0], [halfWidth, -halfHeight, 0], [halfWidth, halfHeight, 0], [-halfWidth, halfHeight, 0],
    // Quad in the ZY plane
    [0, -halfHeight, -halfWidth], [0, -halfHeight, halfWidth], [0, halfHeight, halfWidth], [0, halfHeight, -halfWidth],
  ];

  // prettier-ignore
  const indices = [
    0, 1, 2, 2, 3, 0,
    4, 5, 6, 6, 7, 4,
  ];

  const geometry = new Geometry({
    vertexCount: positions.length,
    instanceCount: offsets.length,
    indices: IndexBuffer.fromUint8(indices),
    vertexBuffers: [
      new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(positions) }) }),
      new VertexBuffer({
        vertexData: new VertexData({
          name: "offset",
          data: Data.vector3(offsets.map((offset) => [offset.x, offset.y, offset.z])),
          divisor: 1,
        }),
        usage: BufferUsage.DynamicDraw,
      }),
    ],
  });

  return new Mesh({
    geometry,
    material: new Material({
      vertexShaderSource: STREAK_VERTEX_SHADER_SOURCE,
      fragmentShaderSource: STREAK_FRAGMENT_SHADER_SOURCE,
    }),
  });
}
