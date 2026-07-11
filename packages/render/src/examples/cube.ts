/**
 * Example: a lit, spinning cube with a custom shader.
 *
 * Shows the core workflow — build a Geometry, write GLSL, set uniforms by
 * name, and let renderScene inject the camera matrices. This file typechecks
 * as part of `pnpm check`; the playground app runs it live (`pnpm dev`).
 */
import { Quaternion, Vector3 } from "@game/math";
import { PerspectiveCamera } from "../camera";
import { Geometry } from "../geometry";
import { Material } from "../material";
import { Mesh } from "../mesh";
import { Renderer } from "../renderer";
import { Uniform } from "../uniforms";
import { startAnimationLoop } from "../utils";

// Attributes bind by name: `in vec3 position` receives the vertex data named
// "position". The three uniforms below are injected by renderScene for every
// mesh: the mesh transform, the camera projection, and the inverse camera
// transform (world → view).
const VERTEX_SHADER_SOURCE = `#version 300 es
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

// Uniforms also bind by name: "base_color" below is set through setUniform.
// A uniform the shader does not declare (or does not use) is silently skipped.
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;

uniform vec3 base_color;

out vec4 fragment_color;

void main() {
  float light = max(0.2, dot(normalize(v_normal), normalize(vec3(0.25, 1.0, 1.0))));
  fragment_color = vec4(base_color * light, 1.0);
}`;

// The renderer creates a full-window canvas and appends it to the body.
const renderer = new Renderer();
const camera = PerspectiveCamera.withWindowAspect();

// Construction is GPU-free: Geometry.box() only builds CPU-side buffers
// (positions, normals, uvs, indices). The first render uploads them.
const cube = new Mesh({
  geometry: Geometry.box(),
  material: new Material({
    vertexShaderSource: VERTEX_SHADER_SOURCE,
    fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
  }),
});
cube.transform.translation.z = -5;
cube.material.setUniform("base_color", Uniform.vector3([1, 0.53, 0.27]));

// The per-frame rotation increments are constant, so the quaternions are
// built once and reused every frame.
const spinAroundY = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.01);
const spinAroundZ = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.005);

startAnimationLoop(() => {
  // Animate by mutating the transform; renderScene turns it into the
  // "transform" uniform each frame.
  cube.transform.rotation.multiply(spinAroundY);
  cube.transform.rotation.multiply(spinAroundZ);

  // renderScene clears, handles window resizes, injects the camera uniforms
  // and draws each mesh.
  renderer.renderScene({ scene: [cube], camera });
});
