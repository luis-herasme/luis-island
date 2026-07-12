import { Vector3 } from "@game/math";
import { BufferUsage, Data, Geometry, IndexBuffer, Material, Mesh, Texture, Uniform, VertexBuffer, VertexData } from "@game/render";

/**
 * Billboarding: the camera's right and up directions in world space are the
 * first two rows of the view matrix, so each corner is placed in the plane
 * that faces the camera — the quad can never be seen edge-on.
 */
const SPRITE_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec2 uv;
in vec3 offset;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec2 v_uv;

void main() {
  vec3 cameraRight = vec3(camera_inverse_matrix[0][0], camera_inverse_matrix[1][0], camera_inverse_matrix[2][0]);
  vec3 cameraUp = vec3(camera_inverse_matrix[0][1], camera_inverse_matrix[1][1], camera_inverse_matrix[2][1]);
  vec3 worldPosition = offset + cameraRight * position.x + cameraUp * position.y;

  v_uv = uv;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(worldPosition, 1.0);
}`;

/**
 * The texture's alpha flows straight through to the framebuffer: the
 * material is transparent, so the renderer blends these fragments over
 * whatever is already drawn, giving the puffs their soft edges.
 */
const SPRITE_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform sampler2D texture_sampler;

out vec4 fragment_color;

void main() {
  vec4 color = texture(texture_sampler, v_uv);

  // A light blue tint keeps the puffs reading as wind; alpha is softened a
  // touch so the column stays airy even where puffs overlap.
  fragment_color = vec4(color.rgb * vec3(0.85, 0.92, 1.0), color.a * 0.85);
}`;

const SPRITE_HALF_SIZE = 0.24;

type WindSpritesMeshOptions = {
  offsets: Vector3[];
  texture: Texture;
};

/**
 * One instanced mesh for a whole column of puff sprites: a single quad per
 * particle, billboarded toward the camera in the vertex shader and placed
 * by a per-instance offset attribute rewritten each frame.
 */
export function createWindSpritesMesh(options: WindSpritesMeshOptions): Mesh {
  // prettier-ignore
  const positions: [number, number, number][] = [
    [-SPRITE_HALF_SIZE, -SPRITE_HALF_SIZE, 0],
    [SPRITE_HALF_SIZE, -SPRITE_HALF_SIZE, 0],
    [SPRITE_HALF_SIZE, SPRITE_HALF_SIZE, 0],
    [-SPRITE_HALF_SIZE, SPRITE_HALF_SIZE, 0],
  ];

  // prettier-ignore
  const uvs: [number, number][] = [
    [0, 1],
    [1, 1],
    [1, 0],
    [0, 0],
  ];

  const indices = [0, 1, 2, 2, 3, 0];

  const geometry = new Geometry({
    vertexCount: positions.length,
    instanceCount: options.offsets.length,
    indices: IndexBuffer.fromUint8(indices),
    vertexBuffers: [
      new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(positions) }) }),
      new VertexBuffer({ vertexData: new VertexData({ name: "uv", data: Data.vector2(uvs) }) }),
      new VertexBuffer({
        vertexData: new VertexData({
          name: "offset",
          data: Data.vector3(options.offsets.map((offset) => [offset.x, offset.y, offset.z])),
          divisor: 1,
        }),
        usage: BufferUsage.DynamicDraw,
      }),
    ],
  });

  const material = new Material({
    vertexShaderSource: SPRITE_VERTEX_SHADER_SOURCE,
    fragmentShaderSource: SPRITE_FRAGMENT_SHADER_SOURCE,
    transparent: true,
  });
  material.setUniform("texture_sampler", Uniform.texture(options.texture));

  return new Mesh({ geometry, material });
}
