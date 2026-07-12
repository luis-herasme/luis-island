import { Vector3 } from "@game/math";
import { BufferUsage, Data, Geometry, IndexBuffer, Material, Mesh, Texture, Uniform, VertexBuffer, VertexData } from "@game/render";

/**
 * Billboarding: the camera's right and up directions in world space are the
 * first two rows of the view matrix, so each corner is placed in the plane
 * that faces the camera — the quad can never be seen edge-on.
 *
 * Each puff also lives a little life as it rises through the column: it
 * fades in quickly at the base, grows on the way up, and dissolves before
 * reaching the top, so the column reads as a plume instead of a stack of
 * identical sprites.
 */
const SPRITE_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec2 uv;
in vec3 offset;
in float size;
in float rotation;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;
uniform float column_bottom;
uniform float column_top;

out vec2 v_uv;
out float v_alpha;

void main() {
  float age = clamp((offset.y - column_bottom) / (column_top - column_bottom), 0.0, 1.0);

  float growth = mix(0.6, 1.7, age);
  float fadeIn = smoothstep(0.0, 0.35, age);
  float fadeOut = 1.0 - smoothstep(0.45, 1.0, age);
  v_alpha = fadeIn * fadeOut;

  // Each puff's quad is rotated by its own fixed angle in the billboard
  // plane, so the shared texture never reads as the same repeated stamp.
  float rotationCos = cos(rotation);
  float rotationSin = sin(rotation);
  vec2 corner = vec2(
    position.x * rotationCos - position.y * rotationSin,
    position.x * rotationSin + position.y * rotationCos
  );

  vec3 cameraRight = vec3(camera_inverse_matrix[0][0], camera_inverse_matrix[1][0], camera_inverse_matrix[2][0]);
  vec3 cameraUp = vec3(camera_inverse_matrix[0][1], camera_inverse_matrix[1][1], camera_inverse_matrix[2][1]);
  vec3 worldPosition = offset + (cameraRight * corner.x + cameraUp * corner.y) * size * growth;

  v_uv = uv;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(worldPosition, 1.0);
}`;

/**
 * The texture's alpha, scaled by the puff's life-cycle fade and a low base
 * opacity: single puffs stay airy and overlapping puffs accumulate into a
 * denser core instead of flat white.
 */
const SPRITE_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;
in float v_alpha;

uniform sampler2D texture_sampler;

out vec4 fragment_color;

void main() {
  vec4 color = texture(texture_sampler, v_uv);

  // The texture's alpha never quite reaches zero at its borders, which
  // blending would expose as a square silhouette — fade it out radially so
  // alpha is guaranteed zero before the quad edge.
  float edgeFade = 1.0 - smoothstep(0.25, 0.5, distance(v_uv, vec2(0.5)));

  // A light blue tint keeps the puffs reading as wind.
  fragment_color = vec4(color.rgb * vec3(0.85, 0.92, 1.0), color.a * v_alpha * edgeFade * 0.35);
}`;

const SPRITE_HALF_SIZE = 0.3;

type WindSpritesMeshOptions = {
  offsets: Vector3[];
  texture: Texture;
  /** The column's vertical extent — drives each puff's life-cycle fade. */
  bottom: number;
  top: number;
};

/**
 * One instanced mesh for a whole column of puff sprites: a single quad per
 * particle, billboarded toward the camera in the vertex shader, placed by a
 * per-instance offset attribute rewritten each frame, with a per-instance
 * random size so no two puffs look alike.
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

  const sizes = options.offsets.map(() => 0.7 + Math.random() * 0.6);
  const rotations = options.offsets.map(() => Math.random() * 2 * Math.PI);

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
      new VertexBuffer({
        vertexData: new VertexData({ name: "size", data: Data.float(sizes), divisor: 1 }),
      }),
      new VertexBuffer({
        vertexData: new VertexData({ name: "rotation", data: Data.float(rotations), divisor: 1 }),
      }),
    ],
  });

  const material = new Material({
    vertexShaderSource: SPRITE_VERTEX_SHADER_SOURCE,
    fragmentShaderSource: SPRITE_FRAGMENT_SHADER_SOURCE,
    transparent: true,
  });
  material.setUniform("texture_sampler", Uniform.texture(options.texture));
  material.setUniform("column_bottom", Uniform.float(options.bottom));
  material.setUniform("column_top", Uniform.float(options.top));

  return new Mesh({ geometry, material });
}
