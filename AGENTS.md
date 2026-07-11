# Agent instructions

## Workflow

- **Plan before writing code.** For any non-trivial task, present the design and get agreement before creating or editing files. Don't scaffold, refactor, or implement on the strength of a discussion alone — wait for an explicit go-ahead.

## Naming conventions

- **No single-letter variable names.** The exception is mathematical component context, where the letter is the actual domain name: `x`, `y`, `z`, `w` on vectors and quaternions, `r`, `g`, `b` on colors. Outside of that, spell it out — `index` not `i`, `matrix` not `m`, `quaternion` not `q`.
- **No abbreviations in identifiers.** Prefer the full word everywhere: `Vector3` not `Vec3`, `Matrix4` not `Mat4`, `Quaternion` not `Quat`, `position` not `pos`, `direction` not `dir`, `deltaTime` not `dt`, `elements` not `e`.
- **Accepted domain notation** (treated like `x`/`y`/`z`, not abbreviations): `gl` for the WebGL context; matrix-entry / cofactor names in linear-algebra internals (`m00`, `a01`, `b11`); component-prefixed locals in math kernels (`qx`, `ax`, `nz`); `cos`/`sin` prefixes (`cosX`, `sinHalfTheta`); GLSL conventions in shader source (`aPosition`, `uWorld`, `vNormal`).
