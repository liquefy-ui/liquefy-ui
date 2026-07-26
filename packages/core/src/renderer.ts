import { clamp, hexToRgb } from './math'
import type { LiquidRendererOptions } from './types'

const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// The glass body itself: everything is shaped by the rounded-rect SDF of the
// component, so highlights hug the true silhouette. The SDF domain is warped
// by traveling waves while `u_wobble` carries jelly energy, which makes the
// rim and bezel physically wiggle instead of merely translating.
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_radius;
uniform vec2 u_pointer;
uniform vec3 u_tint;
uniform float u_time;
uniform float u_active;
uniform float u_intensity;
uniform float u_wobble;
uniform vec2 u_stretch;
uniform vec4 u_ripple;
uniform float u_press;

const float TAU = 6.28318530718;

float sdRoundedRect(vec2 point, vec2 halfSize, float radius) {
  vec2 q = abs(point) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

vec3 iridescence(float phase) {
  return 0.5 + 0.5 * cos(TAU * (phase + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 sizePx = u_resolution / u_dpr;
  vec2 p = (v_uv - 0.5) * sizePx;
  float minSide = min(sizePx.x, sizePx.y);
  float radius = min(u_radius, minSide * 0.5);

  float angle = atan(p.y, p.x);
  float wobbleAmp = u_wobble * minSide * 0.05;
  float wobble = sin(angle * 3.0 + u_time * 15.0) * 0.62
    + sin(angle * 5.0 - u_time * 10.0 + 1.7) * 0.38;

  vec2 halfSize = sizePx * 0.5 - 1.0;
  halfSize *= vec2(1.0 + u_stretch.x * 0.4, 1.0 + u_stretch.y * 0.4);
  float d = sdRoundedRect(p, halfSize, radius) + wobble * wobbleAmp;
  float edgeDist = -d;

  float inside = smoothstep(0.9, -0.9, d);

  float rimWidth = 2.1 + u_active * 1.7 + u_press * 1.2;
  float rimR = exp(-pow(max(edgeDist - 0.4, 0.0) / (rimWidth * 1.3), 1.5));
  float rimG = exp(-pow(max(edgeDist - 1.0, 0.0) / rimWidth, 1.5));
  float rimB = exp(-pow(max(edgeDist - 1.7, 0.0) / (rimWidth * 0.85), 1.5));
  float topBias = smoothstep(-0.25, 0.95, v_uv.y);

  float bezelWidth = clamp(minSide * 0.16, 6.0, 26.0);
  float bezel = smoothstep(bezelWidth, 0.0, edgeDist) * (1.0 - max(max(rimR, rimG), rimB));

  vec2 pointerPx = (u_pointer - 0.5) * sizePx;
  float pointerDist = length(p - pointerPx);
  float glowSigma = minSide * 0.42 + 30.0 * u_active;
  float glow = exp(-pointerDist * pointerDist / (2.0 * glowSigma * glowSigma)) * u_active;
  float core = exp(-pointerDist * pointerDist / (2.0 * 240.0)) * u_active;

  float ripple = 0.0;
  if (u_ripple.w > 0.001) {
    vec2 ripplePx = (u_ripple.xy - 0.5) * sizePx;
    float rippleDist = length(p - ripplePx);
    float front = rippleDist - u_ripple.z * 320.0;
    float ringWidth = 11.0 + u_ripple.z * 46.0;
    float ring = exp(-front * front / (2.0 * ringWidth * ringWidth));
    ripple = ring * exp(-u_ripple.z * 3.4) * u_ripple.w;
  }

  float sheenAxis = p.x / sizePx.x * 0.55 - p.y / sizePx.y + 0.34 - (u_pointer.x - 0.5) * 0.22;
  float sheen = exp(-sheenAxis * sheenAxis * 30.0) * (0.05 + u_active * 0.1);

  float sparklePhase = sin((p.x + p.y * 1.3) * 0.11 + u_time * 1.1) * sin(p.x * 0.07 - u_time * 0.8);
  float sparkle = max(0.0, sparklePhase) * 0.05 * u_active;

  vec3 white = vec3(0.97, 0.985, 1.0);
  vec3 rimTint = mix(u_tint * 0.8 + vec3(0.2), white, topBias);
  vec3 rim = vec3(rimR, rimG, rimB) * rimTint;
  vec3 shimmer = iridescence(angle / TAU + u_time * 0.04 + u_wobble * 0.3) * rimG * (0.08 + u_wobble * 0.16);

  float rimStrength = (0.38 + 0.62 * u_active + 0.45 * u_wobble) * u_intensity;

  vec3 color = vec3(0.0);
  color += rim * rimStrength;
  color += shimmer * u_intensity;
  color += mix(white, u_tint, 0.35) * bezel * (0.015 + u_active * 0.02) * u_intensity;
  color += white * (glow * 0.13 + core * 0.22) * u_intensity;
  color += (white * 0.75 + u_tint * 0.25) * ripple * 0.4 * u_intensity;
  color += white * sheen * u_intensity;
  color += white * sparkle * u_intensity;

  color *= inside;
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 0.85);
  outColor = vec4(color, alpha);
}
`

type FrameState = {
  active: number
  dpr: number
  height: number
  intensity: number
  pointer: readonly [number, number]
  press: number
  radius: number
  ripple: readonly [number, number, number, number]
  stretch: readonly [number, number]
  time: number
  tint: readonly [number, number, number]
  width: number
}

// Browsers hard-cap live WebGL contexts (~16 per page), so a canvas per
// component silently kills its siblings. All components instead share one
// hidden WebGL canvas: each frame is drawn there, then blitted into the
// component's own cheap 2D canvas.
class SharedGlassContext {
  private static instance: SharedGlassContext | undefined

  public readonly canvas: HTMLCanvasElement
  public gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}

  public static get(): SharedGlassContext {
    if (!SharedGlassContext.instance) SharedGlassContext.instance = new SharedGlassContext()
    return SharedGlassContext.instance
  }

  private constructor() {
    this.canvas = document.createElement('canvas')
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      stencil: false,
    })
    if (!gl) return

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
    if (!program) return

    this.gl = gl
    this.program = program
    for (const name of [
      'active', 'dpr', 'intensity', 'pointer', 'press', 'radius',
      'resolution', 'ripple', 'stretch', 'time', 'tint', 'wobble',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, `u_${name}`)
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.SCISSOR_TEST)
  }

  public draw(state: FrameState, wobble: number): boolean {
    const gl = this.gl
    if (!gl || !this.program) return false

    if (this.canvas.width < state.width || this.canvas.height < state.height) {
      this.canvas.width = Math.max(this.canvas.width, state.width)
      this.canvas.height = Math.max(this.canvas.height, state.height)
    }

    gl.viewport(0, 0, state.width, state.height)
    gl.scissor(0, 0, state.width, state.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.uniform2f(this.uniforms.resolution ?? null, state.width, state.height)
    gl.uniform1f(this.uniforms.dpr ?? null, state.dpr)
    gl.uniform1f(this.uniforms.radius ?? null, state.radius)
    gl.uniform2f(this.uniforms.pointer ?? null, state.pointer[0], state.pointer[1])
    gl.uniform3f(this.uniforms.tint ?? null, state.tint[0], state.tint[1], state.tint[2])
    gl.uniform1f(this.uniforms.time ?? null, state.time)
    gl.uniform1f(this.uniforms.active ?? null, state.active)
    gl.uniform1f(this.uniforms.intensity ?? null, state.intensity)
    gl.uniform1f(this.uniforms.wobble ?? null, wobble)
    gl.uniform2f(this.uniforms.stretch ?? null, state.stretch[0], state.stretch[1])
    gl.uniform1f(this.uniforms.press ?? null, state.press)
    gl.uniform4f(this.uniforms.ripple ?? null, state.ripple[0], state.ripple[1], state.ripple[2], state.ripple[3])
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    return true
  }
}

export class LiquidRenderer {
  private active = 0
  private animationFrame = 0
  private blitContext: CanvasRenderingContext2D | null = null
  private destroyed = false
  private hovering = false
  private intensity: number
  private lastTime = 0
  private pointer: readonly [number, number] = [0.5, 0.5]
  private press = 0
  private pressTarget = 0
  private radius: number
  private readonly resizeObserver: ResizeObserver | null
  private rippleAge = -1
  private rippleOrigin: readonly [number, number] = [0.5, 0.5]
  private rippleStrength = 0
  private stretch: readonly [number, number] = [0, 0]
  private supported = false
  private tint: readonly [number, number, number]
  private wobble = 0

  public constructor(private readonly canvas: HTMLCanvasElement, options: LiquidRendererOptions = {}) {
    this.intensity = clamp(options.intensity ?? 0.72, 0, 1.4)
    this.radius = options.radius ?? 16
    this.tint = hexToRgb(options.tint ?? '#8eb9ff')
    this.resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.resize())

    this.supported = SharedGlassContext.get().gl !== null
    this.blitContext = this.supported ? canvas.getContext('2d') : null
    if (!this.supported || !this.blitContext) {
      this.supported = false
      this.canvas.dataset.fallback = 'true'
      return
    }

    this.resizeObserver?.observe(this.canvas)
    this.resize()
    this.render(performance.now())
  }

  public destroy(): void {
    this.destroyed = true
    cancelAnimationFrame(this.animationFrame)
    this.resizeObserver?.disconnect()
  }

  public isSupported(): boolean {
    return this.supported
  }

  public pulse(strength = 1): void {
    this.ripple(this.pointer[0], 1 - this.pointer[1], strength)
  }

  public ripple(x: number, y: number, strength = 1): void {
    this.rippleOrigin = [clamp(x), clamp(1 - y)]
    this.rippleAge = 0
    this.rippleStrength = clamp(strength, 0, 1.5)
    this.start()
  }

  public setActive(active: boolean): void {
    this.hovering = active
    this.start()
  }

  public setIntensity(intensity: number): void {
    this.intensity = clamp(intensity, 0, 1.4)
    this.start()
  }

  public setPointer(x: number, y: number): void {
    this.pointer = [clamp(x), clamp(1 - y)]
    this.start()
  }

  public setPress(pressed: boolean): void {
    this.pressTarget = pressed ? 1 : 0
    this.start()
  }

  public setRadius(radius: number): void {
    this.radius = Math.max(0, radius)
    this.start()
  }

  public setStretch(x: number, y: number): void {
    this.stretch = [clamp(x, -1, 1), clamp(y, -1, 1)]
  }

  public setTint(tint: string): void {
    this.tint = hexToRgb(tint)
    this.start()
  }

  public setWobble(energy: number): void {
    this.wobble = clamp(energy, 0, 1)
    if (this.wobble > 0.003) this.start()
  }

  private get pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, 2)
  }

  private resize(): void {
    const width = Math.max(1, Math.round(this.canvas.clientWidth * this.pixelRatio))
    const height = Math.max(1, Math.round(this.canvas.clientHeight * this.pixelRatio))
    if (this.canvas.width === width && this.canvas.height === height) return

    this.canvas.width = width
    this.canvas.height = height
    this.render(performance.now())
  }

  private render(time: number): void {
    if (!this.supported || this.destroyed || !this.blitContext) return

    const shared = SharedGlassContext.get()
    const width = this.canvas.width
    const height = this.canvas.height
    const drawn = shared.draw({
      active: this.active,
      dpr: this.pixelRatio,
      height,
      intensity: this.intensity,
      pointer: this.pointer,
      press: this.press,
      radius: this.radius,
      ripple: [
        this.rippleOrigin[0],
        this.rippleOrigin[1],
        Math.max(this.rippleAge, 0),
        this.rippleAge >= 0 ? this.rippleStrength : 0,
      ],
      stretch: this.stretch,
      time: time / 1000,
      tint: this.tint,
      width,
    }, this.wobble)
    if (!drawn) return

    this.blitContext.clearRect(0, 0, width, height)
    this.blitContext.drawImage(
      shared.canvas,
      0,
      shared.canvas.height - height,
      width,
      height,
      0,
      0,
      width,
      height,
    )
  }

  private start(): void {
    if (this.animationFrame || this.destroyed || !this.supported) return

    this.lastTime = performance.now()
    const tick = (time: number): void => {
      const delta = Math.min((time - this.lastTime) / 1000, 0.05)
      this.lastTime = time

      const activeTarget = this.hovering ? 1 : 0
      this.active += (activeTarget - this.active) * Math.min(1, delta * (this.hovering ? 9 : 4.5))
      this.press += (this.pressTarget - this.press) * Math.min(1, delta * 14)
      if (this.rippleAge >= 0) {
        this.rippleAge += delta
        if (this.rippleAge > 1.4) this.rippleAge = -1
      }

      this.render(time)

      const settled = Math.abs(this.active - activeTarget) < 0.004
        && Math.abs(this.press - this.pressTarget) < 0.004
        && this.rippleAge < 0
        && this.wobble < 0.004
        && !this.hovering

      if (!settled) {
        this.animationFrame = requestAnimationFrame(tick)
        return
      }

      this.active = activeTarget
      this.press = this.pressTarget
      this.render(time)
      this.animationFrame = 0
    }

    this.animationFrame = requestAnimationFrame(tick)
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

const createProgram = (gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program

  gl.deleteProgram(program)
  return null
}
