/**
 * The `basic` material's shaders: unlit, drawn at full brightness — for
 * textures that already carry their lighting, like photo scans. Same two
 * variants as the lit shaders, picked by the render system: with or without
 * a texture map, both multiplied by base_color.
 */
export const BASIC_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

void main() {
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}`;

export const BASIC_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform vec3 base_color;

out vec4 fragment_color;

void main() {
  fragment_color = vec4(base_color, 1.0);
}`;

export const BASIC_TEXTURED_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec2 uv;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}`;

export const BASIC_TEXTURED_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform vec3 base_color;
uniform sampler2D texture_sampler;
uniform vec2 texture_scale;

out vec4 fragment_color;

void main() {
  fragment_color = texture(texture_sampler, v_uv * texture_scale) * vec4(base_color, 1.0);
}`;
