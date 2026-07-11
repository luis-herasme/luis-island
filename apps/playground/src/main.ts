import { Quaternion, Vector3 } from "@game/math";
import { Geometry, Material, Mesh, PerspectiveCamera, Renderer, startAnimationLoop } from "@game/render";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;
in vec2 uv;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec3 v_normal;
out vec2 v_uv;

void main() {
  v_uv = uv;
  v_normal = mat3(transform) * normal;
  gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec2 v_uv;

out vec4 fragment_color;

void main() {
  vec3 normal = normalize(v_normal);
  float light = max(0.2, dot(normal, normalize(vec3(0.25, 1.0, 1.0))));

  // Simple checker pattern so the faces read without a texture
  float checker = mod(floor(v_uv.x * 4.0) + floor(v_uv.y * 4.0), 2.0);
  vec3 base = mix(vec3(1.0, 0.53, 0.27), vec3(0.9, 0.42, 0.18), checker);

  fragment_color = vec4(base * light, 1.0);
}`;

const renderer = new Renderer();
const camera = PerspectiveCamera.withWindowAspect();

const cube = new Mesh(Geometry.box(), new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE));
cube.transform.translation.z = -5;

const scene = [cube];

const spin = new Quaternion();
const yAxis = new Vector3(0, 1, 0);
const zAxis = new Vector3(0, 0, 1);

startAnimationLoop(() => {
  spin.setFromAxisAngle(yAxis, 0.01);
  cube.transform.rotation.multiply(spin);
  spin.setFromAxisAngle(zAxis, 0.005);
  cube.transform.rotation.multiply(spin);

  renderer.renderScene(scene, camera);
});
