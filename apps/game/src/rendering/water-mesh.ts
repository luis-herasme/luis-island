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

const vec3 DEEP_COLOR = vec3(0.02, 0.11, 0.2);
const vec3 SHALLOW_COLOR = vec3(0.06, 0.29, 0.39);
const vec3 SKY_COLOR = vec3(0.55, 0.7, 0.8);
const vec3 LIGHT_DIRECTION = normalize(vec3(0.4, 1.0, 0.6));
const float NORMAL_SAMPLE_DISTANCE = 0.35;
const float WAVE_STEEPNESS = 0.9;

float waveHeight(vec2 point) {
  float height = 0.0;
  height += sin(point.x * 0.9 + time * 1.2) * 0.45;
  height += sin(dot(point, vec2(0.6, 1.1)) * 0.8 + time * 0.9) * 0.3;
  height += sin(dot(point, vec2(-1.3, 0.7)) * 1.7 + time * 1.6) * 0.15;
  height += sin(dot(point, vec2(0.3, -1.7)) * 2.9 + time * 2.3) * 0.1;
  return height;
}

void main() {
  vec2 point = v_world_position.xz;

  // Central differences over the height field tilt the surface normal.
  float heightWest = waveHeight(point - vec2(NORMAL_SAMPLE_DISTANCE, 0.0));
  float heightEast = waveHeight(point + vec2(NORMAL_SAMPLE_DISTANCE, 0.0));
  float heightSouth = waveHeight(point - vec2(0.0, NORMAL_SAMPLE_DISTANCE));
  float heightNorth = waveHeight(point + vec2(0.0, NORMAL_SAMPLE_DISTANCE));
  vec3 normal = normalize(vec3(
    (heightWest - heightEast) * WAVE_STEEPNESS,
    1.0,
    (heightSouth - heightNorth) * WAVE_STEEPNESS
  ));

  vec3 viewDirection = normalize(camera_position - v_world_position);
  float facing = clamp(dot(viewDirection, normal), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 3.0);

  float diffuse = clamp(dot(normal, LIGHT_DIRECTION), 0.0, 1.0);
  vec3 reflected = reflect(-LIGHT_DIRECTION, normal);
  float specular = pow(clamp(dot(reflected, viewDirection), 0.0, 1.0), 90.0);

  vec3 color = mix(DEEP_COLOR, SHALLOW_COLOR, diffuse * 0.55 + 0.25);
  color = mix(color, SKY_COLOR, fresnel * 0.6);
  color += specular * vec3(0.9, 0.95, 1.0);

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
