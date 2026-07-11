# Agent instructions

## Workflow

- **Plan before writing code.** For any non-trivial task, present the design and get agreement before creating or editing files. Don't scaffold, refactor, or implement on the strength of a discussion alone — wait for an explicit go-ahead.

## TypeScript conventions

- **Prefer `type` over `interface`.** Declare object shapes as type aliases (`type Foo = { ... }`), not interfaces — in docs and examples too.

## Naming conventions

- **No single-letter variable names.** The exception is mathematical component context, where the letter is the actual domain name: `x`, `y`, `z`, `w` on vectors and quaternions, `r`, `g`, `b` on colors. Outside of that, spell it out — `index` not `i`, `matrix` not `m`, `quaternion` not `q`.
- **No abbreviations in identifiers.** Prefer the full word everywhere: `Vector3` not `Vec3`, `Matrix4x4` not `Mat4`, `Quaternion` not `Quat`, `position` not `pos`, `direction` not `dir`, `deltaTime` not `dt`, `elements` not `e`.
- **Accepted domain notation** (treated like `x`/`y`/`z`, not abbreviations): `gl` for the WebGL context; matrix-entry / cofactor names in linear-algebra internals (`m00`, `a01`, `b11`); component-prefixed locals in math kernels (`qx`, `ax`, `nz`); `cos`/`sin` prefixes (`cosX`, `sinHalfTheta`); GLSL conventions in shader source (`aPosition`, `uWorld`, `vNormal`).
- **Kebab-case file names.** A file is named after its main export, lowercased with hyphens between words: `vertex-buffer.ts` for `VertexBuffer`, `uniform-buffer-object.ts` for `UniformBufferObject`. Dimension and size suffixes stay attached to their word: `matrix4x4.ts`, `transform2d.ts`.

## API conventions

- **One options object instead of multiple parameters.** A function, method, or constructor that would take two or more parameters takes a single object instead, with its shape declared as a named `type` directly above the declaration (`type SpawnBoxOptions = { ... }`). Call sites then name every value, so argument order cannot be confused and each call documents itself: `new Material({ vertexShaderSource, fragmentShaderSource })`, never `new Material(a, b)`. Exceptions:
  - **Math kernels and per-frame hot paths** where the parameter order is domain-canonical and an object allocation per call would be waste: `vector.set(x, y, z)`, `quaternion.setFromAxisAngle(axis, angle)`, `matrix.multiplyMatrices(left, right)`, `vertexBuffer.setVertex(vertexIndex, values)`.
  - **Key–value setters** following the `Map.set` convention: `material.setUniform("base_color", value)`.
  - **Typed lookups** where the compiler already prevents confusion: `ecs.get(entity, "position")`.
  - A single required parameter plus one optional trailing parameter is fine positionally: `IndexBuffer.fromUint8(values, usage?)`.
- **No magic constants.** A literal with domain meaning (a WebGL enum value, a byte size, a format tag) is written exactly once, inside a named `as const` definition (`BufferKind`, `VertexComponentType`); every other place references the name. `kind: 0x1405 // gl.UNSIGNED_INT` at a use site is not acceptable — the comment is the name the constant should have had.
