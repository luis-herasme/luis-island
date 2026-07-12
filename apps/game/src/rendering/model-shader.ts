/**
 * The shader for textured OBJ models: the box shader's fixed directional
 * light, but with the color sampled from a texture instead of a uniform.
 */
export const MODEL_VERTEX_SHADER_SOURCE = `#version 300 es
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

export const MODEL_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec2 v_uv;

uniform sampler2D texture_sampler;

out vec4 fragment_color;

void main() {
  float light = max(0.35, dot(normalize(v_normal), normalize(vec3(0.4, 1.0, 0.6))));
  fragment_color = texture(texture_sampler, v_uv);
  fragment_color.rgb *= light;
}`;
