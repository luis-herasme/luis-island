/**
 * The `lit` material's shaders: one lighting model (a fixed directional
 * light), two variants picked by the render system — with or without a
 * texture map. Both multiply a base_color uniform; the textured variant
 * multiplies the sampled texel on top, so a color plus a texture is a
 * tinted texture.
 */
export const LIT_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec3 v_normal;

void main() {
  v_normal = mat3(transform) * normal;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}`;

export const LIT_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;

uniform vec3 base_color;

out vec4 fragment_color;

void main() {
  float light = max(0.35, dot(normalize(v_normal), normalize(vec3(0.4, 1.0, 0.6))));
  fragment_color = vec4(base_color * light, 1.0);
}`;

export const LIT_TEXTURED_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec3 v_normal;
out vec2 v_uv;

void main() {
  v_normal = mat3(transform) * normal;
  v_uv = uv;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}`;

export const LIT_TEXTURED_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec2 v_uv;

uniform vec3 base_color;
uniform sampler2D texture_sampler;
uniform float texture_scale;

out vec4 fragment_color;

void main() {
  float light = max(0.35, dot(normalize(v_normal), normalize(vec3(0.4, 1.0, 0.6))));
  fragment_color = texture(texture_sampler, v_uv * texture_scale) * vec4(base_color, 1.0);
  fragment_color.rgb *= light;
}`;
