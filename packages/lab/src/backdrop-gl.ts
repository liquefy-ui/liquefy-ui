/**
 * The WebGL plumbing both backdrops share. Contexts are made the way
 * `@liquefy-ui/core`'s glass renderer makes its own — WebGL2 or nothing, no
 * depth or stencil — except that a backdrop owns its canvas outright rather
 * than borrowing a shared one, since what it draws is the size of the page.
 */

/** Creates a WebGL2 context for a backdrop, or `null` when the browser will not give one. */
export const createBackdropContext = (canvas: HTMLCanvasElement): WebGL2RenderingContext | null => {
  try {
    return canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    })
  } catch {
    return null
  }
}

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

/** A linked program and the locations of the uniforms it was asked for. */
export type BackdropProgram = {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null>
}

/**
 * Compiles and links a program and looks up its uniforms. Attributes are
 * bound in the order given, `a_position` first at location 0, so one vertex
 * array serves every program that draws the full-screen triangle.
 */
export const createBackdropProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: readonly string[],
  attributes: readonly string[] = ['a_position'],
): BackdropProgram | null => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  attributes.forEach((name, location) => gl.bindAttribLocation(program, location, name))
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {}
  for (const name of uniformNames) uniforms[name] = gl.getUniformLocation(program, name)
  return { program, uniforms }
}

/**
 * Hands `onLost` and `onRestored` the canvas's context loss and restoration.
 * A lost context is asked back (`preventDefault`), since a backdrop is
 * usually the first thing the browser takes from a page that holds too many,
 * and the last thing a reader would expect to stay gone.
 */
export const watchContextLoss = (
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onRestored: () => void,
): (() => void) => {
  const lost = (event: Event) => {
    event.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', lost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  return () => {
    canvas.removeEventListener('webglcontextlost', lost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
  }
}

/** A hash of the pixel, added below one step of 8-bit colour so smooth gradients do not band. */
export const DITHER_GLSL = `
float dither(vec2 pixel) {
  return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715)))) - 0.5;
}
`
