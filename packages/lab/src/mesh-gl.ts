import { createBackdropProgram, DITHER_GLSL, type BackdropProgram } from './backdrop-gl'
import type { MeshTessellation } from './mesh-motion'

const VERTEX = `#version 300 es
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;

void main() {
  v_color = a_color;
  // Positions run from the top-left corner, as on the page.
  gl_Position = vec4(a_position.x * 2.0 - 1.0, 1.0 - a_position.y * 2.0, 0.0, 1.0);
}
`

// The triangles are small enough that blending their corners' colours
// straight across reads as a smooth surface. The dither keeps a slow
// gradient across a large screen from stepping into bands.
const FRAGMENT = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;
${DITHER_GLSL}

void main() {
  outColor = vec4(v_color + dither(gl_FragCoord.xy) / 255.0, 1.0);
}
`

/**
 * The GPU half of `MeshGradient`: the tessellated mesh as one indexed draw,
 * colours uploaded when they change and positions every frame.
 */
export class MeshRenderer {
  private colorBuffer: WebGLBuffer | null = null
  private count = 0
  private gl: WebGL2RenderingContext | null
  private indexBuffer: WebGLBuffer | null = null
  private positionBuffer: WebGLBuffer | null = null
  private program: BackdropProgram | null = null
  private vao: WebGLVertexArrayObject | null = null

  public constructor(gl: WebGL2RenderingContext | null) {
    this.gl = gl
    this.build()
  }

  public get supported(): boolean {
    return this.program !== null
  }

  /** Builds the program again, after the context was lost and given back. Meshes have to be set again too. */
  public restore(): void {
    this.build()
  }

  /** Takes a new tessellation and its vertex colours. */
  public setMesh(mesh: MeshTessellation, colors: Float32Array): void {
    const gl = this.gl
    if (!gl || !this.vao) return
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertexColumns * mesh.vertexRows * 2 * 4, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
    this.count = mesh.indices.length
  }

  /** Takes new vertex colours for the current tessellation. */
  public setColors(colors: Float32Array): void {
    const gl = this.gl
    if (!gl || !this.colorBuffer) return
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
  }

  /** Draws the mesh with its vertices at `positions`. */
  public render(positions: Float32Array): void {
    const gl = this.gl
    if (!gl || !this.program || !this.vao || this.count === 0) return
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.useProgram(this.program.program)
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions)
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0)
  }

  public destroy(): void {
    const gl = this.gl
    if (gl && !gl.isContextLost()) {
      if (this.program) gl.deleteProgram(this.program.program)
      for (const buffer of [this.positionBuffer, this.colorBuffer, this.indexBuffer]) if (buffer) gl.deleteBuffer(buffer)
      if (this.vao) gl.deleteVertexArray(this.vao)
    }
    this.program = null
    this.gl = null
  }

  private build(): void {
    const gl = this.gl
    this.program = null
    this.count = 0
    if (!gl || gl.isContextLost()) return
    const program = createBackdropProgram(gl, VERTEX, FRAGMENT, [], ['a_position', 'a_color'])
    if (!program) return
    this.vao = gl.createVertexArray()
    this.positionBuffer = gl.createBuffer()
    this.colorBuffer = gl.createBuffer()
    this.indexBuffer = gl.createBuffer()
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
    gl.disable(gl.BLEND)
    this.program = program
  }
}
