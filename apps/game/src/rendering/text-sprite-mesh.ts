import { Data, Geometry, IndexBuffer, Material, Mesh, Uniform, VertexBuffer, VertexData } from "@game/render";
import { createTextTexture } from "./text-texture";

/**
 * Billboarding: the camera's right and up directions in world space are the
 * first two rows of the view matrix, so the quad always faces the camera —
 * the three.js Sprite idea. Only the transform's translation is used; the
 * quad's size is baked into its corners.
 */
const TEXT_SPRITE_VERTEX_SHADER_SOURCE = `#version 300 es
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

const TEXT_SPRITE_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform sampler2D texture_sampler;

out vec4 fragment_color;

void main() {
  fragment_color = texture(texture_sampler, v_uv);
}`;

type TextSpriteMeshOptions = {
  text: string;
  /** World-unit height of the label; width follows the text's aspect. */
  height: number;
};

/** A camera-facing quad textured with canvas-rendered text. */
export function createTextSpriteMesh(options: TextSpriteMeshOptions): Mesh {
  const { texture, aspect } = createTextTexture(options.text);

  const halfHeight = options.height / 2;
  const halfWidth = halfHeight * aspect;

  // prettier-ignore
  const positions: [number, number, number][] = [
    [-halfWidth, halfHeight, 0],
    [halfWidth, halfHeight, 0],
    [halfWidth, -halfHeight, 0],
    [-halfWidth, -halfHeight, 0],
  ];

  // Canvas row 0 is the top of the text, and uploaded pixels put row 0 at
  // v = 0 — so the quad's top corners take v = 0.
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
    vertexShaderSource: TEXT_SPRITE_VERTEX_SHADER_SOURCE,
    fragmentShaderSource: TEXT_SPRITE_FRAGMENT_SHADER_SOURCE,
    transparent: true,
  });
  material.setUniform("texture_sampler", Uniform.texture(texture));

  return new Mesh({ geometry, material });
}
