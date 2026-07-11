import { Transform3D } from "@game/math";
import type { Geometry } from "./geometry";
import type { Material } from "./material";

/** https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced#mode */
export const RenderPrimitive = {
  Points: 0x0000, // gl.POINTS
  Lines: 0x0001, // gl.LINES
  LineLoop: 0x0002, // gl.LINE_LOOP
  LineStrip: 0x0003, // gl.LINE_STRIP
  Triangles: 0x0004, // gl.TRIANGLES
  TriangleStrip: 0x0005, // gl.TRIANGLE_STRIP
  TriangleFan: 0x0006, // gl.TRIANGLE_FAN
} as const;

export type RenderPrimitive = (typeof RenderPrimitive)[keyof typeof RenderPrimitive];

type MeshOptions = {
  geometry: Geometry;
  material: Material;
};

export class Mesh {
  geometry: Geometry;
  material: Material;
  transform = new Transform3D();
  renderPrimitive: RenderPrimitive = RenderPrimitive.Triangles;
  vertexArrayObject: WebGLVertexArrayObject | null = null;

  constructor(options: MeshOptions) {
    this.geometry = options.geometry;
    this.material = options.material;
  }

  getOrCreateVertexArrayObject(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    if (!this.vertexArrayObject) this.vertexArrayObject = this.createVertexArrayObject(gl);
    return this.vertexArrayObject;
  }

  private createVertexArrayObject(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const materialResources = this.material.resources;
    if (!materialResources) {
      throw new Error("The material must be initialized before creating the vertex array object");
    }

    const vertexArrayObject = gl.createVertexArray();
    if (!vertexArrayObject) throw new Error("Failed to create the vertex array object");

    gl.bindVertexArray(vertexArrayObject);

    for (const vertexBuffer of this.geometry.vertexBuffers) {
      vertexBuffer.buffer.bind(gl);
      materialResources.setAttributeBuffer(vertexBuffer.layout);
    }

    for (const interleavedVertexBuffer of this.geometry.interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.bind(gl);
      for (const vertexLayout of interleavedVertexBuffer.layouts) {
        materialResources.setAttributeBuffer(vertexLayout);
      }
    }

    gl.bindVertexArray(null);
    return vertexArrayObject;
  }
}
