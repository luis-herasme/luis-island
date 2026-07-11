// Attribute locations are fixed across all programs so a geometry's VAO
// works with any material: 0 = position, 1 = normal.
export const POSITION_ATTRIBUTE_LOCATION = 0;
export const NORMAL_ATTRIBUTE_LOCATION = 1;

export const BASIC_VERTEX_SHADER = `#version 300 es
layout(location = ${POSITION_ATTRIBUTE_LOCATION}) in vec3 aPosition;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uWorld;

void main() {
  gl_Position = uProjection * uView * uWorld * vec4(aPosition, 1.0);
}
`;

export const BASIC_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 uColor;

out vec4 fragColor;

void main() {
  fragColor = vec4(uColor, 1.0);
}
`;

export const LAMBERT_VERTEX_SHADER = `#version 300 es
layout(location = ${POSITION_ATTRIBUTE_LOCATION}) in vec3 aPosition;
layout(location = ${NORMAL_ATTRIBUTE_LOCATION}) in vec3 aNormal;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uWorld;
uniform mat3 uNormalMatrix;

out vec3 vNormal;

void main() {
  vNormal = uNormalMatrix * aNormal;
  gl_Position = uProjection * uView * uWorld * vec4(aPosition, 1.0);
}
`;

export const LAMBERT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 uColor;
uniform vec3 uLightDirection; // direction the light travels, normalized, world space
uniform vec3 uLightColor;     // pre-multiplied by intensity
uniform vec3 uAmbientColor;   // pre-multiplied by intensity

in vec3 vNormal;

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, -uLightDirection), 0.0);
  vec3 lighting = uAmbientColor + uLightColor * diffuse;
  fragColor = vec4(uColor * lighting, 1.0);
}
`;
