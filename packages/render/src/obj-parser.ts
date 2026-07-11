export type OBJ = {
  positions: [number, number, number][];
  normals: [number, number, number][];
  uvs: [number, number][];
  /** position/uv/normal indices, 1-based as in the OBJ format. */
  faces: [number, number, number][];
};

/**
 * Parses a Wavefront OBJ file supporting the v/vn/vt/f commands.
 * Faces must be triangles with position/uv/normal indices ("f 1/1/1 2/2/2 3/3/3").
 * Unsupported commands are ignored.
 */
export function parseOBJ(objData: string): OBJ {
  const positions: [number, number, number][] = [];
  const normals: [number, number, number][] = [];
  const uvs: [number, number][] = [];
  const faces: [number, number, number][] = [];

  for (const line of objData.split(/\r?\n/)) {
    const words = line.split(/\s+/).filter((word) => word.length > 0);
    const command = words.shift();
    if (!command) continue;

    switch (command) {
      case "v":
        positions.push(parseVector3(words));
        break;
      case "vn":
        normals.push(parseVector3(words));
        break;
      case "vt":
        uvs.push(parseVector2(words));
        break;
      case "f":
        for (const faceString of words) {
          const face = parseFace(faceString);

          // Check that the face is valid
          const positionIndex = face[0] - 1;
          const uvIndex = face[1] - 1;
          const normalIndex = face[2] - 1;

          if (!positions[positionIndex] || !uvs[uvIndex] || !normals[normalIndex]) {
            throw new Error(`Invalid face index: ${faceString}`);
          }

          faces.push(face);
        }
        break;
      default:
        // Ignoring unsupported commands
        break;
    }
  }

  return { positions, normals, uvs, faces };
}

function parseFace(face: string): [number, number, number] {
  const parts = face.split("/");
  if (parts.length !== 3) throw new Error(`Expected 3 face indices, got: ${face}`);

  return [parseUnsignedInteger(parts[0]!), parseUnsignedInteger(parts[1]!), parseUnsignedInteger(parts[2]!)];
}

function parseVector3(words: string[]): [number, number, number] {
  if (words.length !== 3) throw new Error(`Expected 3 components, got ${words.length}`);
  return [parseFloatStrict(words[0]!), parseFloatStrict(words[1]!), parseFloatStrict(words[2]!)];
}

function parseVector2(words: string[]): [number, number] {
  if (words.length !== 2) throw new Error(`Expected 2 components, got ${words.length}`);

  // OBJ uv origin is bottom-left; WebGL textures are uploaded top-left, so flip y.
  return [parseFloatStrict(words[0]!), 1 - parseFloatStrict(words[1]!)];
}

function parseFloatStrict(word: string): number {
  const value = Number(word);
  if (Number.isNaN(value)) throw new Error(`Failed to parse a float value: ${word}`);
  return value;
}

function parseUnsignedInteger(word: string): number {
  const value = Number(word);
  if (!Number.isInteger(value) || value < 0) throw new Error(`Failed to parse an unsigned integer value: ${word}`);
  return value;
}
