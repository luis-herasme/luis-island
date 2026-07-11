# @game/render

A from-scratch WebGL2 renderer. It is deliberately low level: you describe
vertex data and write GLSL; the renderer owns the GPU lifecycle. There is no
scene graph, no built-in materials and no lighting model — a scene is a plain
`Mesh[]`, which is what lets the ECS own the world structure instead of the
renderer.

The design is a TypeScript port of
[suricato](https://github.com/luis-herasme/suricato), module for module.
Deliberate differences are listed at the [end](#deviations-from-suricato).

## The core idea: CPU data first, GPU resources lazily

Every GPU-backed object in this package — buffer, program, texture, vertex
array object — follows one pattern:

1. **Construction is cheap and GPU-free.** Creating a `Geometry`, `Material`
   or `Texture` only stores CPU-side data. You can build them anywhere,
   including before a WebGL context exists, and unit-test them in Node.
2. **First render creates the GPU resource.** The first `renderer.render(mesh)`
   uploads buffers, compiles shaders and records the vertex array object.
3. **Writes mark dirty; the next render flushes.** Updating vertex data goes to
   the CPU copy and sets a flag; `onBeforeRender` pushes it to the GPU with
   `bufferSubData` only when something actually changed.

The primitive that implements this is `BufferGPU`: a `Uint8Array` (the CPU
copy) plus a lazily created `WebGLBuffer` and a dirty flag. Vertex buffers,
index buffers and uniform buffer objects are all thin wrappers around it that
add interpretation — *what the bytes mean*.

## Anatomy of a draw

`renderer.render(mesh)` does, in order:

1. **Flush buffers** — every vertex buffer (plain and interleaved) uploads or
   updates its GPU copy if dirty.
2. **Prepare the material** — on first use, compile both shaders, link the
   program, and introspect it: the names and locations of every *active*
   uniform, attribute and uniform block are read back from WebGL and cached.
   Then `useProgram` and set every uniform in the material's map. Textures get
   texture units assigned in map order and are uploaded on first use.
3. **Bind the vertex array object** — on first use, create a VAO and wire each
   attribute to its buffer using the layouts (see below). The VAO records the
   full attribute setup, so subsequent frames are a single bind.
4. **Issue the draw call** — chosen by what the geometry has:

   | geometry state | GL call |
   | --- | --- |
   | indices + `instanceCount` | `drawElementsInstanced` |
   | indices | `drawElements` |
   | neither | `drawArrays` (`vertexCount` vertices) |

   The primitive is `mesh.renderPrimitive` (`Triangles` by default; points,
   lines and strips are available).

`renderer.renderScene({ scene, camera })` is the frame-level wrapper: it clears,
adapts to window resizes, and injects three uniforms into every mesh's
material before drawing it:

| uniform | value |
| --- | --- |
| `transform` | the mesh's `Transform3D` as a mat4 |
| `projection_matrix` | the camera's projection |
| `camera_inverse_matrix` | inverse of the camera's transform (world → view) |

Declare the ones you need in your vertex shader; unused ones cost nothing (see
[name-based binding](#everything-binds-by-name)).

## Describing vertex data

Three layers, each adding meaning to the one below:

**`Data` — typed values.** A `Data` holds raw attribute values plus what they
are: component type (float, byte, short, …), components per element, and — for
matrix attributes — column count. Factories mirror GLSL types:

```ts
Data.vector3([[0, 0, 0], [1, 0, 0], [0, 1, 0]]); // one [x, y, z] per vertex
Data.unsignedByteVector3([[255, 0, 0]]);         // e.g. a compact color
Data.matrix3([transform2D.toArray()]);           // one flat 3x3 per element
```

**`VertexData` — a named attribute.** The name must match an `in` declaration
in your vertex shader; that is the whole contract. Options:

- `normalize: true` — integer data is mapped to [0, 1] / [-1, 1] in the
  shader. This is how a `unsignedByteVector3` color becomes a `vec3`.
- `divisor: 1` — the attribute advances **per instance** instead of per
  vertex. This is the entire instancing API; see below.

```ts
new VertexData({ name: "color", data: Data.unsignedByteVector3(colors), normalize: true });
```

**Buffers — where attributes live.** Two options:

```ts
// One attribute per buffer — simple, update one attribute freely:
new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(positions) }) });

// Several attributes interleaved per vertex — one buffer, cache-friendly:
new InterleavedVertexBuffer({ attributes: [position, normal, uv] });
```

For interleaved buffers the package computes the layout for you: each
attribute's byte offset is aligned to its component size, and the stride is
aligned to the largest component size, so mixed types (bytes next to floats)
are always legal for the GPU. `VertexLayout` is the result — name, component
type/count, normalize, stride, offset, divisor — and is exactly what
`vertexAttribPointer` needs.

Matrix attributes are transparent: a `mat3` occupies three consecutive
attribute locations, and the layout machinery sets up each column (this is
what WebGL requires — one location holds at most a vec4).

**A `Geometry`** is the bundle the mesh draws: any number of plain and
interleaved buffers, optional `IndexBuffer`, optional `instanceCount`.

The built-in shapes are **templates** — canonical geometries built once at
module load, never rendered themselves. `copy()` hands you an independent
instance (fresh bytes, own GPU state) that is safe to mutate:

```ts
new Mesh({ geometry: GEOMETRY_BOX.copy(), material });
```

`GEOMETRY_QUAD` and `GEOMETRY_QUAD_INTERLEAVED` work the same way. Sharing a
template directly across meshes is only safe for geometry nothing ever writes
to. `instanced(count)` builds on `copy()`: it returns an instanced copy of
any geometry (see [Instancing](#instancing)). Loading stays a factory —
`Geometry.fromOBJ(parseOBJ(text))` builds fresh geometry per call.

### Updating vertex data at runtime

```ts
const buffer = geometry.getVertexBuffer("transform");
buffer.setVertex(index, transform.toArray());       // per element

const interleaved = geometry.getInterleavedVertexBuffer("position");
interleaved.updateVertex("position", index, [x, y, z]);
```

Both encode the numbers into the buffer's byte layout and mark it dirty; the
next render flushes the whole buffer in one `bufferSubData`. Buffers cannot
grow — `count` is fixed at construction, so size for the maximum you need.

## Materials and uniforms

A `Material` is your GLSL plus a uniform map:

```ts
const material = new Material({
  vertexShaderSource: VERTEX_SHADER_SOURCE,
  fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
});
material.setUniform("light_direction", Uniform.vector3([0.25, 1, 1]));
material.setUniform("albedo", Uniform.texture(await Texture.fromImageUrl("/crate.png")));
```

`Uniform` is a discriminated union with a factory per GLSL type —
`Uniform.float`, `.vector2/3/4`, `.int*`, `.unsignedInt*`, `.matrix2/3/4`,
`.texture` — plus conversions: `Uniform.fromMatrix4x4(matrix)`,
`Uniform.fromTransform3D(transform)`.

Textures carry their sampler settings (`minificationFilter`,
`magnificationFilter`, `wrapHorizontal`, `wrapVertical`) and their source —
an `HTMLImageElement` or raw pixels — and upload on first use. Texture units
are assigned automatically, one per texture uniform, every frame.

Uniform blocks work through `UniformBufferObject`: create it with raw bytes,
give it a binding point, and point the material's block at the same binding
point (after the material's first render, when the program exists):

```ts
const ubo = new UniformBufferObject({ renderer, bufferCPU: initialBytes });
ubo.setBindingPoint(0);
material.resources!.setUniformBlock("Settings", 0);
ubo.setBytes(byteOffset, newBytes); // flushes immediately
```

### Everything binds by name

There are no fixed attribute locations and no uniform location bookkeeping in
user code. After linking, the material reads back what the program actually
uses and binds by name:

- an attribute connects to the `VertexData` with the same name;
- `setUniform("foo", …)` targets the uniform declared as `foo`.

The corollary: **anything the shader does not use is silently skipped.** GLSL
compilers eliminate unused declarations, so a declared-but-unused uniform
does not even exist after linking. This is what makes `renderScene`'s
injected uniforms free for shaders that ignore them — and it also means a
typo in a uniform name fails silently. If a value seems to have no effect,
check the name first.

## Instancing

Instancing is not a feature bolted onto the renderer — it falls out of the
data model. Give an attribute `divisor: 1` and it advances once per instance;
set `instanceCount` on the geometry and the draw becomes instanced.
`instanced(count)` does both to a copy of any geometry, adding a dynamic
per-instance mat3 `transform` attribute initialized to identity:

```ts
const geometry = GEOMETRY_QUAD.instanced(100);

const transforms = geometry.getVertexBuffer("transform")!;
for (let instance = 0; instance < 100; instance++) {
  const transform = new Transform2D();
  transform.translation.set(/* … */);
  transforms.setVertex(instance, transform.toArray());
}
```

One draw call renders all 100 quads; per-frame animation is just more
`setVertex` calls (the buffer uses `DynamicDraw`).

## Transforms and the camera

`Transform3D` (scale + quaternion rotation + translation, composed into a
`Matrix4x4` on demand) and its 2D analog `Transform2D` **live in `@game/math`**,
not here — the TRS value type is math, and this package is just one of its
consumers. There is no parent/child hierarchy anywhere on purpose; composing
transforms is the ECS's job.

`PerspectiveCamera` is projection parameters plus a `Transform3D`. Move the
camera by setting its transform; `renderScene` derives the view matrix by
inverting it, and keeps the aspect updated when the window resizes.

## Examples

Each example is a self-contained, commented, runnable file. They typecheck as
part of `pnpm check`, so they cannot drift from the real API:

- [`src/examples/cube.ts`](./src/examples/cube.ts) — the core workflow: a
  `GEOMETRY_BOX.copy()`, custom GLSL, a `base_color` uniform set by name,
  per-frame transform animation through the `renderScene` convention.
- [`src/examples/instancing.ts`](./src/examples/instancing.ts) — a 10×10 grid
  in one instanced draw call: a divisor-1 `mat3` attribute, per-frame
  `setVertex` updates, and direct `renderer.render` without a camera.

The playground app runs one of them — `pnpm dev`, and swap the import in
`apps/playground/src/main.ts` to switch.

## Rules that keep it fast (and their sharp edges)

**The VAO is recorded once.** The first render captures which buffers feed
which attributes. Afterwards, updating buffer *contents* is cheap and picked
up automatically — but *replacing* a buffer or adding attributes will not be
seen until you set `mesh.vertexArrayObject = null` to force a re-record.

**Programs and textures are cached forever.** Shader sources are compiled once
per material; texture data uploads once. Editing `vertexShaderSource` or a
texture's pixels after first render has no effect (create a new
material/texture instead).

**Buffers are fixed-size.** `setVertex`/`setBytes` write inside the existing
allocation. Any write marks the whole buffer dirty; one `bufferSubData`
uploads it on the next render.

**`renderScene` owns three uniform names.** `transform`, `projection_matrix`
and `camera_inverse_matrix` are overwritten on every mesh, every frame. Use
different names for your own uniforms, or call `renderer.render(mesh)`
directly to opt out of the convention (as the instanced example does).

## Deviations from suricato

- `glam` is replaced by `@game/math` (`Vector2`, `Vector3`, `Quaternion`,
  `Matrix4x4`), and Rust enums by `as const` objects or discriminated unions.
- suricato's `transform.rs` has no counterpart file here: `Transform2D` and
  `Transform3D` moved to `@game/math`, since the TRS value type is math and
  the renderer should not own the concept.
- Setting a uniform the shader does not use is a silent no-op instead of a
  panic — GLSL compilers drop unused declarations, so they never get
  locations.
- The `uniform3uiv`/`uniform4uiv` calls for unsigned-int vector uniforms are
  correct here (the Rust version reused `uniform2uiv`), and a scale animation
  channel writes to `scale` (the Rust version wrote to `translation`).
- `Animation` is constructed from plain data. The Rust `From<Gltf>` conversion
  depended on the `gltf` crate; a glTF/GLB loader is future work.
- Texture wrap settings are actually applied (`TEXTURE_WRAP_S`/`TEXTURE_WRAP_T`);
  the Rust version stored but never uploaded them.

## Current limitations (deliberate, for now)

- No devicePixelRatio handling — the canvas is sized in CSS pixels, so output
  is soft on high-DPI displays.
- The renderer creates its own full-window canvas and tracks `window` size;
  embedding into an existing layout needs an accepted-canvas constructor.
- `Transform3D.toMatrix4x4()`/`toArray()` allocate per call, so `renderScene`
  allocates per mesh per frame — irrelevant at playground scale, worth a
  scratch-buffer pass before rendering thousands of meshes.
- Backface culling is not enabled (matches suricato); depth testing is.
