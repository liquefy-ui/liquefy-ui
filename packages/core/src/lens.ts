import { clamp } from './math'
import type { LensMap, LensMapOptions } from './types'

const maximumMapDimension = 640

const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Renders an feDisplacementMap texture for a rounded-rect lens: neutral (0.5)
// in the optically-flat center, bending samples toward the center inside the
// bezel band so the backdrop magnifies and folds around the rim like thick
// convex glass. Red encodes X displacement, green encodes Y (y-down, SVG space).
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_size;
uniform float u_radius;
uniform float u_bezel;

float sdRoundedRect(vec2 point, vec2 halfSize, float radius) {
  vec2 q = abs(point) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 pixel = vec2(v_uv.x, 1.0 - v_uv.y) * u_size;
  vec2 p = pixel - u_size * 0.5;
  vec2 halfSize = u_size * 0.5 - 0.5;
  float radius = min(u_radius, min(halfSize.x, halfSize.y));
  float d = sdRoundedRect(p, halfSize, radius);

  if (d > 0.0) {
    outColor = vec4(0.5, 0.5, 0.5, 1.0);
    return;
  }

  float t = clamp(1.0 + d / u_bezel, 0.0, 1.0);
  float profile = 1.0 - sqrt(max(0.0, 1.0 - t * t));

  float epsilon = 1.0;
  vec2 gradient = vec2(
    sdRoundedRect(p + vec2(epsilon, 0.0), halfSize, radius) - sdRoundedRect(p - vec2(epsilon, 0.0), halfSize, radius),
    sdRoundedRect(p + vec2(0.0, epsilon), halfSize, radius) - sdRoundedRect(p - vec2(0.0, epsilon), halfSize, radius)
  );
  vec2 outwardNormal = gradient / max(length(gradient), 0.0001);

  vec2 displacement = -outwardNormal * profile;
  outColor = vec4(displacement * 0.5 + 0.5, 0.5, 1.0);
}
`

type LensContext = {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext
  uniforms: {
    bezel: WebGLUniformLocation | null
    radius: WebGLUniformLocation | null
    size: WebGLUniformLocation | null
  }
}

let sharedContext: LensContext | null | undefined

const getLensContext = (): LensContext | null => {
  if (sharedContext !== undefined) return sharedContext
  if (typeof document === 'undefined') {
    sharedContext = null
    return sharedContext
  }

  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true,
    stencil: false,
  })

  if (!gl) {
    sharedContext = null
    return sharedContext
  }

  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
    gl.deleteShader(shader)
    return null
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentShaderSource)
  const program = vertexShader && fragmentShader ? gl.createProgram() : null
  if (!vertexShader || !fragmentShader || !program) {
    sharedContext = null
    return sharedContext
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    sharedContext = null
    return sharedContext
  }

  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  sharedContext = {
    canvas,
    gl,
    uniforms: {
      bezel: gl.getUniformLocation(program, 'u_bezel'),
      radius: gl.getUniformLocation(program, 'u_radius'),
      size: gl.getUniformLocation(program, 'u_size'),
    },
  }
  return sharedContext
}

export const isLensRenderingSupported = (): boolean => getLensContext() !== null

export const createLensMap = (options: LensMapOptions): LensMap | null => {
  const context = getLensContext()
  const width = Math.max(2, Math.round(options.width))
  const height = Math.max(2, Math.round(options.height))
  if (!context || width < 4 || height < 4) return null

  const minimumSide = Math.min(width, height)
  const radius = clamp(options.radius, 0, minimumSide / 2)
  const bezel = clamp(options.bezel ?? Math.max(10, minimumSide * 0.22), 4, minimumSide / 2)
  const strength = clamp(options.strength ?? 1, 0, 2)
  const maximumDisplacement = bezel * 0.72 * strength

  const downscale = Math.min(1, maximumMapDimension / Math.max(width, height))
  const mapWidth = Math.max(4, Math.round(width * downscale))
  const mapHeight = Math.max(4, Math.round(height * downscale))

  const { canvas, gl, uniforms } = context
  if (canvas.width !== mapWidth || canvas.height !== mapHeight) {
    canvas.width = mapWidth
    canvas.height = mapHeight
  }

  gl.viewport(0, 0, mapWidth, mapHeight)
  gl.uniform2f(uniforms.size, mapWidth, mapHeight)
  gl.uniform1f(uniforms.radius, radius * downscale)
  gl.uniform1f(uniforms.bezel, bezel * downscale)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  return {
    height,
    scale: maximumDisplacement * 2,
    url: canvas.toDataURL('image/png'),
    width,
  }
}
