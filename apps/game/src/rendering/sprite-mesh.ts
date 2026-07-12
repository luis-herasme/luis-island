import { Data, Geometry, IndexBuffer, Material, Mesh, Uniform, VertexBuffer, VertexData, Wrap } from "@game/render";
import type { Texture } from "@game/render";

/**
 * Billboarding: the camera's right and up directions in world space are the
 * first two rows of the view matrix, so the quad always faces the camera —
 * the three.js Sprite idea. Only the transform's translation is used; the
 * quad's size is baked into its corners.
 */
const SPRITE_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec2 uv;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec2 v_uv;

void main() {
  vec3 cameraRight = vec3(camera_inverse_matrix[0][0], camera_inverse_matrix[1][0], camera_inverse_matrix[2][0]);
  vec3 cameraUp = vec3(camera_inverse_matrix[0][1], camera_inverse_matrix[1][1], camera_inverse_matrix[2][1]);
  vec3 anchor = vec3(transform[3][0], transform[3][1], transform[3][2]);
  vec3 worldPosition = anchor + cameraRight * position.x + cameraUp * position.y;

  v_uv = uv;
  gl_Position = projection_matrix * camera_inverse_matrix * vec4(worldPosition, 1.0);
}`;

const SPRITE_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform sampler2D texture_sampler;

out vec4 fragment_color;

void main() {
  fragment_color = texture(texture_sampler, v_uv);
}`;

type SpriteMeshOptions = {
  texture: Texture;
  /** World-unit size of the quad. */
  width: number;
  height: number;
};

/** A camera-facing textured quad, alpha-blended — a three.js Sprite. */
export function createSpriteMesh(options: SpriteMeshOptions): Mesh {
  // Clamp: with the default Repeat wrap, sampling at the quad's edges
  // bleeds the texture's opposite border in as a phantom line.
  options.texture.wrapHorizontal = Wrap.ClampToEdge;
  options.texture.wrapVertical = Wrap.ClampToEdge;

  const halfWidth = options.width / 2;
  const halfHeight = options.height / 2;

  // prettier-ignore
  const positions: [number, number, number][] = [
    [-halfWidth, halfHeight, 0],
    [halfWidth, halfHeight, 0],
    [halfWidth, -halfHeight, 0],
    [-halfWidth, -halfHeight, 0],
  ];

  // Uploaded pixels put image row 0 at v = 0, so the top corners take v = 0.
  // prettier-ignore
  const uvs: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  const indices = [0, 2, 1, 0, 3, 2];

  const geometry = new Geometry({
    vertexCount: positions.length,
    indices: IndexBuffer.fromUint8(indices),
    vertexBuffers: [
      new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(positions) }) }),
      new VertexBuffer({ vertexData: new VertexData({ name: "uv", data: Data.vector2(uvs) }) }),
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
