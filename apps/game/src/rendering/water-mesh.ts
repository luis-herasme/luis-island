import { Data, Geometry, IndexBuffer, Material, Mesh, VertexBuffer, VertexData } from "@game/render";

/**
 * The water is a flat unit plane in XZ, scaled to size by its transform;
 * all the motion lives in the fragment shader. A sum of moving sine waves
 * forms a height field, its finite differences tilt the normal, and the
 * normal drives three ingredients that read as water: diffuse shading,
 * a fresnel blend toward the sky color at grazing angles, and a sharp
 * specular glint from the same directional light the lit shader uses.
 */
const WATER_VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

out vec3 v_world_position;

void main() {
  vec4 worldPosition = transform * vec4(position, 1.0);
  v_world_position = worldPosition.xyz;
  gl_Position = projection_matrix * camera_inverse_matrix * worldPosition;
}`;

const WATER_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_world_position;

uniform float time;
uniform vec3 camera_position;

out vec4 fragment_color;

// Cartoon pool-caustic water: a saturated blue base with a slowly wobbling
// bright cellular web — the borders of animated Voronoi cells — plus soft
// darker patches from the cell interiors, at two overlapping scales.
const vec3 DEEP_COLOR = vec3(0.1, 0.47, 0.86);
const vec3 BASE_COLOR = vec3(0.16, 0.58, 0.94);
const vec3 HORIZON_COLOR = vec3(0.5, 0.85, 0.97);
const vec3 CAUSTIC_COLOR = vec3(0.85, 0.97, 1.0);

vec2 hashPoint(vec2 cell) {
  return fract(sin(vec2(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3)))) * 43758.5453);
}

// Distances to the closest and second-closest animated feature points.
// Their difference is ~0 on cell borders — that is where the light web is.
vec2 voronoiDistances(vec2 point, float wobbleTime) {
  vec2 cell = floor(point);
  vec2 local = fract(point);

  float closest = 8.0;
  float secondClosest = 8.0;
  for (int offsetY = -1; offsetY <= 1; offsetY++) {
    for (int offsetX = -1; offsetX <= 1; offsetX++) {
      vec2 neighbor = vec2(float(offsetX), float(offsetY));
      vec2 featurePoint = hashPoint(cell + neighbor);
      featurePoint = 0.5 + 0.5 * sin(wobbleTime + 6.2831 * featurePoint);
      float featureDistance = length(neighbor + featurePoint - local);
      if (featureDistance < closest) {
        secondClosest = closest;
        closest = featureDistance;
      } else if (featureDistance < secondClosest) {
        secondClosest = featureDistance;
      }
    }
  }
  return vec2(closest, secondClosest);
}

void main() {
  vec2 point = v_world_position.xz;

  // Soften the pattern far from the camera so it cannot alias, and blend
  // toward a bright horizon so distance stays readable.
  float cameraDistance = distance(camera_position.xz, point);
  float farness = smoothstep(40.0, 160.0, cameraDistance);

  vec2 coarse = voronoiDistances(point * 0.28, time * 0.5);
  vec2 fine = voronoiDistances(point * 0.55 + 17.3, time * 0.4 + 2.0);

  // Wide, soft-edged borders: fat light patches, not thin electric lines.
  float coarseEdge = 1.0 - smoothstep(0.0, 0.45, coarse.y - coarse.x);
  float fineEdge = 1.0 - smoothstep(0.0, 0.5, fine.y - fine.x);
  float caustics = clamp(coarseEdge * 0.75 + fineEdge * 0.4, 0.0, 1.0);

  // Cell interiors darken slightly toward their centers — the soft patches.
  vec3 color = mix(DEEP_COLOR, BASE_COLOR, smoothstep(0.1, 0.75, coarse.x));
  color = mix(color, CAUSTIC_COLOR, caustics * 0.65 * (1.0 - farness * 0.7));
  color = mix(color, HORIZON_COLOR, farness * 0.55);

  fragment_color = vec4(color, 1.0);
}`;

// prettier-ignore
const PLANE_POSITIONS: [number, number, number][] = [
  [-0.5, 0, -0.5],
  [0.5, 0, -0.5],
  [0.5, 0, 0.5],
  [-0.5, 0, 0.5],
];

const PLANE_INDICES = [0, 2, 1, 0, 3, 2];

/** One flat quad; the shader does the rest. */
export function createWaterMesh(): Mesh {
  const geometry = new Geometry({
    vertexCount: PLANE_POSITIONS.length,
    indices: IndexBuffer.fromUint8(PLANE_INDICES),
    vertexBuffers: [
      new VertexBuffer({ vertexData: new VertexData({ name: "position", data: Data.vector3(PLANE_POSITIONS) }) }),
    ],
  });

  const material = new Material({
    vertexShaderSource: WATER_VERTEX_SHADER_SOURCE,
    fragmentShaderSource: WATER_FRAGMENT_SHADER_SOURCE,
  });

  return new Mesh({ geometry, material });
}
