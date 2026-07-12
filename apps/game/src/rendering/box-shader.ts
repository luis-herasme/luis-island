/**
 * The one shader every box in the demo uses: a fixed directional light plus
 * a per-material base_color uniform.
 */
export const BOX_VERTEX_SHADER_SOURCE = `#version 300 es
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

export const BOX_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;

uniform vec3 base_color;

out vec4 fragment_color;

void main() {
  float light = max(0.35, dot(normalize(v_normal), normalize(vec3(0.4, 1.0, 0.6))));
  fragment_color = vec4(base_color * light, 1.0);
}`;
