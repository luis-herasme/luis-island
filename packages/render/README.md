# @game/render

A from-scratch WebGL2 renderer. It is deliberately low level: you describe vertex data and write GLSL, and the renderer owns the GPU lifecycle — buffers, programs, textures and vertex array objects are created lazily on first render and updated only when their CPU-side data changes.

The design is a TypeScript port of [suricato](https://github.com/luis-herasme/suricato), module for module.

## Architecture

Everything starts on the CPU. Each GPU resource is a plain object holding its CPU-side data plus a lazily created WebGL handle; nothing touches the GPU until the first `Renderer.render` call.

| Module | What it does |
| --- | --- |
| `bufferGPU` | `BufferGPU` — a byte buffer with a CPU copy and a lazily created GPU copy. Writes mark it dirty; `onBeforeRender` flushes with `bufferSubData`. |
| `vertexBuffer` | `Data` (typed attribute values), `VertexData` (a named attribute with divisor/normalize), `VertexLayout` (how it lives in a buffer), `VertexBuffer` (one attribute per buffer) and `InterleavedVertexBuffer` (several attributes per vertex, with alignment-correct offsets and stride). |
| `indexBuffer` | `IndexBuffer.fromUint8/16/32` for indexed drawing. |
| `geometry` | `Geometry` — vertex buffers + optional indices + optional instance count, with `box`, `quad`, `quadInterleaved`, `quadInstanced` factories and `fromOBJ`. |
| `material` | `Material` — your GLSL sources plus a uniform map. Compiles and introspects the program on first use (`MaterialResources`): uniform, attribute and uniform-block locations. |
| `uniforms` | The `Uniform` union (floats, ints, unsigned ints, vectors, matrices, textures) and its factory helpers. |
| `texture` | `Texture` — sampler settings plus image or raw pixel data, uploaded lazily. |
| `uniformBufferObject` | `UniformBufferObject` — a UBO bound to a binding point, updated with raw bytes. |
| `mesh` | `Mesh` — geometry + material + `Transform3D` + render primitive. Owns the vertex array object wiring attributes to the material's locations. |
| `camera` | `PerspectiveCamera` — projection parameters plus a `Transform3D`. |
| `transform` | `Transform3D` (scale/rotation/translation → `Matrix4`) and `Transform2D` (scale/angle/translation → column-major 3×3). |
| `renderer` | `Renderer` — creates a full-window canvas, tracks window resizes, and draws meshes. `renderScene` also feeds each material the `transform`, `projection_matrix` and `camera_inverse_matrix` uniforms. |
| `objParser` | `parseOBJ` — minimal Wavefront OBJ parsing (`v`, `vn`, `vt`, `f`). |
| `animation` | `Animation` — keyframe channels/samplers over a node hierarchy with linear interpolation. |
| `utils` | `fetchImage/fetchBytes/fetchText`, `startAnimationLoop`, `generateId`. |

## Example

```ts
import { Geometry, Material, Mesh, PerspectiveCamera, Renderer, startAnimationLoop } from "@game/render";

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

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
out vec4 fragment_color;

void main() {
  float light = max(0.2, dot(normalize(v_normal), normalize(vec3(0.25, 1.0, 1.0))));
  fragment_color = vec4(vec3(1.0, 0.5, 0.25) * light, 1.0);
}`;

const renderer = new Renderer();
const camera = PerspectiveCamera.withWindowAspect();

const mesh = new Mesh(Geometry.box(), new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE));
mesh.transform.translation.z = -5;

startAnimationLoop(() => {
  renderer.renderScene([mesh], camera);
});
```

## Deviations from suricato

- `glam` is replaced by `@game/math` (`Vector2`, `Vector3`, `Quaternion`, `Matrix4`), and Rust enums by `as const` objects or discriminated unions.
- Setting a uniform the shader does not use is a silent no-op instead of a panic — GLSL compilers drop unused declarations, so they never get locations.
- The `uniform3uiv`/`uniform4uiv` calls for unsigned-int vector uniforms are correct here (the Rust version reused `uniform2uiv`), and a scale animation channel writes to `scale` (the Rust version wrote to `translation`).
- `Animation` is constructed from plain data. The Rust `From<Gltf>` conversion depended on the `gltf` crate; a glTF/GLB loader is future work.
- Texture wrap settings are actually applied (`TEXTURE_WRAP_S`/`TEXTURE_WRAP_T`); the Rust version stored but never uploaded them.
