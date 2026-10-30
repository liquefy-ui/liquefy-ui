import { createBackdropProgram, DITHER_GLSL, type BackdropProgram } from './backdrop-gl'
import type { BackdropRgb } from './backdrop-color'
import {
  dyeGrid,
  fluidGrid,
  MAX_VORTICES,
  type FluidGrid,
  type FluidOptions,
  type FluidSplat,
  type FluidVortex,
} from './fluid-motion'

/**
 * How the water is moved on this GPU.
 *
 * - `solver`: the full stable-fluids simulation, on half-float textures.
 * - `vortices`: for a GPU that cannot render to floating-point textures. The
 *   colour is kept in ordinary 8-bit textures and carried by a flow written
 *   down in closed form — the stirrers and the pointer's strokes as vortices —
 *   with no velocity field and no pressure solve.
 */
export type FluidTier = 'solver' | 'vortices'

// One triangle that covers the viewport. Each fragment also gets its four
// neighbours' coordinates, which the finite differences read.
const VERTEX = `#version 300 es
in vec2 a_position;
uniform vec2 u_texel;
out vec2 v_uv;
out vec2 v_l;
out vec2 v_r;
out vec2 v_t;
out vec2 v_b;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  v_l = v_uv - vec2(u_texel.x, 0.0);
  v_r = v_uv + vec2(u_texel.x, 0.0);
  v_t = v_uv + vec2(0.0, u_texel.y);
  v_b = v_uv - vec2(0.0, u_texel.y);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 v_uv;
in vec2 v_l;
in vec2 v_r;
in vec2 v_t;
in vec2 v_b;
out vec4 outColor;
`

const MAX_SPLATS = 8

// Adds up to eight Gaussian splats in one pass. Radii are in short sides, so
// a splat is round on a canvas of any shape. In 8-bit colour, which tops out
// at 1, adding would pile every colour up into white; there a splat paints
// its hue over what is there instead, as far as its amount reaches.
const SPLAT = `${HEADER}
uniform sampler2D u_target;
uniform vec2 u_aspect;
uniform int u_count;
uniform float u_over;
uniform vec4 u_points[${MAX_SPLATS}];
uniform vec3 u_values[${MAX_SPLATS}];

void main() {
  vec3 sum = texture(u_target, v_uv).rgb;
  for (int index = 0; index < ${MAX_SPLATS}; index++) {
    if (index >= u_count) break;
    vec2 offset = (v_uv - u_points[index].xy) * u_aspect;
    float radius = u_points[index].z;
    float falloff = exp(-dot(offset, offset) / (radius * radius));
    vec3 value = u_values[index];
    float amount = max(max(value.r, value.g), value.b);
    vec3 painted = mix(sum, value / max(amount, 1e-5), clamp(amount * falloff, 0.0, 1.0));
    sum = mix(sum + value * falloff, painted, u_over);
  }
  outColor = vec4(sum, 1.0);
}
`

// The velocity's curl, a scalar in two dimensions.
const CURL = `${HEADER}
uniform sampler2D u_velocity;

void main() {
  float l = texture(u_velocity, v_l).y;
  float r = texture(u_velocity, v_r).y;
  float t = texture(u_velocity, v_t).x;
  float b = texture(u_velocity, v_b).x;
  outColor = vec4(0.5 * ((r - l) - (t - b)), 0.0, 0.0, 1.0);
}
`

// Vorticity confinement: pushes each cell round the nearest peak of curl, to
// give back the small eddies a coarse grid smears out.
const VORTICITY = `${HEADER}
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform float u_strength;
uniform float u_dt;

void main() {
  float l = abs(texture(u_curl, v_l).x);
  float r = abs(texture(u_curl, v_r).x);
  float t = abs(texture(u_curl, v_t).x);
  float b = abs(texture(u_curl, v_b).x);
  float curl = texture(u_curl, v_uv).x;
  vec2 gradient = 0.5 * vec2(r - l, t - b);
  vec2 toward = gradient / (length(gradient) + 1e-5);
  vec2 force = u_strength * curl * vec2(toward.y, -toward.x);
  vec2 velocity = texture(u_velocity, v_uv).xy + force * u_dt;
  outColor = vec4(clamp(velocity, -2000.0, 2000.0), 0.0, 1.0);
}
`

// The velocity's divergence. At a wall the cell beyond mirrors this one's
// velocity back, so nothing flows out through the edge.
const DIVERGENCE = `${HEADER}
uniform sampler2D u_velocity;

void main() {
  vec2 here = texture(u_velocity, v_uv).xy;
  float l = v_l.x < 0.0 ? -here.x : texture(u_velocity, v_l).x;
  float r = v_r.x > 1.0 ? -here.x : texture(u_velocity, v_r).x;
  float t = v_t.y > 1.0 ? -here.y : texture(u_velocity, v_t).y;
  float b = v_b.y < 0.0 ? -here.y : texture(u_velocity, v_b).y;
  outColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}
`

const SCALE = `${HEADER}
uniform sampler2D u_source;
uniform float u_value;

void main() {
  outColor = texture(u_source, v_uv) * u_value;
}
`

// One Jacobi iteration of the pressure Poisson equation. The texture clamps
// at its edges, which makes the pressure's slope across a wall zero.
const PRESSURE = `${HEADER}
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;

void main() {
  float l = texture(u_pressure, v_l).x;
  float r = texture(u_pressure, v_r).x;
  float t = texture(u_pressure, v_t).x;
  float b = texture(u_pressure, v_b).x;
  float divergence = texture(u_divergence, v_uv).x;
  outColor = vec4((l + r + t + b - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`

// Takes the pressure's gradient off the velocity, which leaves it free of
// divergence: water that neither piles up nor thins out.
const GRADIENT = `${HEADER}
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;

void main() {
  float l = texture(u_pressure, v_l).x;
  float r = texture(u_pressure, v_r).x;
  float t = texture(u_pressure, v_t).x;
  float b = texture(u_pressure, v_b).x;
  vec2 velocity = texture(u_velocity, v_uv).xy - 0.5 * vec2(r - l, t - b);
  outColor = vec4(velocity, 0.0, 1.0);
}
`

// Semi-Lagrangian advection: each cell takes whatever was upstream of it a
// frame ago. Velocity is in cells of the velocity grid per second.
const ADVECT = `${HEADER}
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_simTexel;
uniform float u_dt;
uniform float u_dissipation;

void main() {
  vec2 from = v_uv - u_dt * texture(u_velocity, v_uv).xy * u_simTexel;
  outColor = texture(u_source, from) / (1.0 + u_dissipation * u_dt);
}
`

// Advection through the closed-form flow, for the 8-bit tier. Each vortex is
// a Lamb–Oseen vortex: it turns like a solid disc inside its core and falls
// off as one over the distance outside it. The step is a midpoint (RK2) one,
// and the result is dithered so the slow fade is not rounded away.
const FLOW = `${HEADER}
uniform sampler2D u_source;
uniform vec4 u_vortices[${MAX_VORTICES}];
uniform int u_count;
uniform vec2 u_aspect;
uniform float u_dt;
uniform float u_dissipation;
uniform float u_seed;
${DITHER_GLSL}

vec2 flow(vec2 uv) {
  vec2 point = uv * u_aspect;
  vec2 velocity = vec2(0.0);
  for (int index = 0; index < ${MAX_VORTICES}; index++) {
    if (index >= u_count) break;
    vec4 vortex = u_vortices[index];
    vec2 offset = point - vortex.xy;
    float distance2 = dot(offset, offset) + 1e-6;
    float swirl = vortex.z / (6.2831853 * distance2) * (1.0 - exp(-distance2 / (vortex.w * vortex.w)));
    velocity += swirl * vec2(-offset.y, offset.x);
  }
  return velocity / u_aspect;
}

void main() {
  vec2 middle = v_uv - 0.5 * u_dt * flow(v_uv);
  vec2 from = v_uv - u_dt * flow(middle);
  vec4 color = texture(u_source, from) / (1.0 + u_dissipation * u_dt);
  outColor = vec4(color.rgb + dither(gl_FragCoord.xy + u_seed) / 255.0, 1.0);
}
`

// The picture. Colour is premultiplied and unbounded in the dye; here it is
// eased onto the backdrop's base so that piling more of one colour on
// saturates toward that colour rather than clipping to white. The slope of
// the colour lights it from above, which gives it the sheen of a liquid
// rather than smoke.
const DISPLAY = `${HEADER}
uniform sampler2D u_dye;
uniform vec3 u_base;
uniform float u_sheen;
${DITHER_GLSL}

vec3 ink(vec2 uv) {
  vec3 dye = max(texture(u_dye, uv).rgb, 0.0);
  float peak = max(max(dye.r, dye.g), dye.b);
  return peak < 1e-5 ? vec3(0.0) : dye * ((1.0 - exp(-1.7 * peak)) / peak);
}

float cover(vec3 color) {
  return max(max(color.r, color.g), color.b);
}

void main() {
  vec3 color = ink(v_uv);
  float here = cover(color);
  vec2 slope = vec2(cover(ink(v_r)) - cover(ink(v_l)), cover(ink(v_t)) - cover(ink(v_b)));
  vec3 normal = normalize(vec3(slope * 6.0, 1.0));
  vec3 sun = normalize(vec3(-0.35, 0.6, 1.0));
  // Zero on the flat, so only a slope brightens or shades.
  float light = dot(normal, sun) - sun.z;
  vec3 lit = u_base * (1.0 - here) + color;
  lit *= 1.0 + u_sheen * light * 1.4;
  outColor = vec4(lit + dither(gl_FragCoord.xy) / 255.0, 1.0);
}
`

const COPY = `${HEADER}
uniform sampler2D u_source;

void main() {
  outColor = texture(u_source, v_uv);
}
`

type Target = {
  fbo: WebGLFramebuffer
  height: number
  texture: WebGLTexture
  width: number
}

type Pair = { read: Target; write: Target }

type Format = { filter: number; format: number; internal: number; type: number }

type Formats = { dye: Format; scalar: Format; vector: Format }

type Programs = Record<
  'advect' | 'copy' | 'curl' | 'display' | 'divergence' | 'flow' | 'gradient' | 'pressure' | 'scale' | 'splat' | 'vorticity',
  BackdropProgram | null
>

/** How fast the water itself slows, per second: slowly, so a stroke keeps moving after the pointer has gone. */
const VELOCITY_FADE = 0.5

/** How much of last frame's pressure a frame starts its solve from. A warm start needs fewer iterations. */
const PRESSURE_CARRY = 0.8

const swap = (pair: Pair): void => {
  const read = pair.read
  pair.read = pair.write
  pair.write = read
}

/**
 * The GPU half of `FluidBackdrop`: Jos Stam's stable fluids ("Stable
 * Fluids", SIGGRAPH 1999), as fragment-shader passes over textures, the way
 * Pavel Dobryakov's WebGL Fluid Simulation runs it in a browser. Each frame:
 * splats push the water and drop colour; the curl is measured and fed back as
 * vorticity confinement; the divergence is measured and a pressure field that
 * cancels it is relaxed by Jacobi iteration; its gradient is taken off the
 * velocity; and the velocity, then the colour, are carried along by it.
 *
 * Velocity and pressure live on a coarse grid (`resolution` cells across the
 * short side) and the colour on a finer one, because the eye reads the
 * colour's detail and not the water's.
 */
export class FluidRenderer {
  public tier: FluidTier | null = null
  private dye: Pair | null = null
  private dyeSize: FluidGrid = { height: 0, width: 0 }
  private divergence: Target | null = null
  private curl: Target | null = null
  private formats: Formats | null = null
  private frame = 0
  private gl: WebGL2RenderingContext | null
  private grid: FluidGrid = { height: 0, width: 0 }
  private pressure: Pair | null = null
  private programs: Programs | null = null
  private targets: Target[] = []
  private vao: WebGLVertexArrayObject | null = null
  private velocity: Pair | null = null

  public constructor(gl: WebGL2RenderingContext | null, private options: FluidOptions) {
    this.gl = gl
    this.build()
  }

  public get supported(): boolean {
    return this.tier !== null
  }

  public setOptions(options: FluidOptions): void {
    const regrid = options.resolution !== this.options.resolution || options.dyeResolution !== this.options.dyeResolution
    this.options = options
    if (regrid) this.resize(true)
  }

  /** Empties the water and the colour. */
  public reset(): void {
    const gl = this.gl
    if (!gl) return
    gl.clearColor(0, 0, 0, 1)
    for (const target of this.targets) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      gl.viewport(0, 0, target.width, target.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }

  /** Builds every program and texture again, after the context was lost and given back. */
  public restore(): void {
    this.targets = []
    this.velocity = null
    this.dye = null
    this.pressure = null
    this.divergence = null
    this.curl = null
    this.grid = { height: 0, width: 0 }
    this.dyeSize = { height: 0, width: 0 }
    this.build()
  }

  /**
   * Fits the grids to the canvas's current size. The water and colour already
   * there are resampled onto the new grids, so a window being resized does
   * not wipe the picture. Returns whether anything was reallocated.
   */
  public resize(force = false): boolean {
    const gl = this.gl
    if (!gl || !this.tier) return false
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const grid = fluidGrid(width, height, this.options.resolution)
    const dye = dyeGrid(width, height, this.options.dyeResolution)
    const same = grid.width === this.grid.width && grid.height === this.grid.height
      && dye.width === this.dyeSize.width && dye.height === this.dyeSize.height
    if (same && !force) return false

    const formats = this.formats
    if (!formats) return false
    const nextDye = this.pair(dye, formats.dye, this.dye)
    const nextVelocity = this.tier === 'solver' ? this.pair(grid, formats.vector, this.velocity) : null
    if (!nextDye || (this.tier === 'solver' && !nextVelocity)) {
      this.release([nextDye, nextVelocity])
      return false
    }
    this.release([this.dye, this.velocity, this.pressure])
    this.release([this.divergence, this.curl])
    this.dye = nextDye
    this.velocity = nextVelocity
    if (this.tier === 'solver') {
      this.pressure = this.pair(grid, formats.scalar, null)
      this.divergence = this.target(grid, formats.scalar)
      this.curl = this.target(grid, formats.scalar)
    }
    this.grid = grid
    this.dyeSize = dye
    return true
  }

  /** Adds `splats` to the water and the colour. */
  public splat(splats: readonly FluidSplat[]): void {
    const gl = this.gl
    const program = this.programs?.splat
    if (!gl || !program || !this.dye || splats.length === 0) return
    const aspect = this.aspect()
    for (let start = 0; start < splats.length; start += MAX_SPLATS) {
      const batch = splats.slice(start, start + MAX_SPLATS)
      const points = new Float32Array(MAX_SPLATS * 4)
      const push = new Float32Array(MAX_SPLATS * 3)
      const color = new Float32Array(MAX_SPLATS * 3)
      batch.forEach((splat, index) => {
        // The page's y runs down; the textures' runs up.
        points.set([splat.x, 1 - splat.y, splat.radius, 0], index * 4)
        push.set([splat.dx * this.grid.width, -splat.dy * this.grid.height, 0], index * 3)
        color.set(splat.color, index * 3)
      })
      gl.useProgram(program.program)
      gl.uniform2f(program.uniforms.u_aspect ?? null, aspect[0], aspect[1])
      gl.uniform1i(program.uniforms.u_count ?? null, batch.length)
      gl.uniform4fv(program.uniforms.u_points ?? null, points)
      if (this.velocity) {
        gl.uniform1f(program.uniforms.u_over ?? null, 0)
        gl.uniform3fv(program.uniforms.u_values ?? null, push)
        this.draw(program, this.velocity.write, { u_target: this.velocity.read })
        swap(this.velocity)
      }
      gl.useProgram(program.program)
      gl.uniform1f(program.uniforms.u_over ?? null, this.tier === 'vortices' ? 1 : 0)
      gl.uniform3fv(program.uniforms.u_values ?? null, color)
      this.draw(program, this.dye.write, { u_target: this.dye.read })
      swap(this.dye)
    }
  }

  /**
   * Moves the water on by `dt` seconds. On the `vortices` tier the colour is
   * carried by `vortices` instead, given in fractions of the backdrop.
   */
  public step(dt: number, vortices: readonly FluidVortex[] = []): void {
    if (dt <= 0 || !this.gl || !this.dye) return
    this.frame += 1
    if (this.tier === 'vortices') {
      this.flow(dt, vortices)
      return
    }
    const programs = this.programs
    const velocity = this.velocity
    const pressure = this.pressure
    const divergence = this.divergence
    const curl = this.curl
    if (!programs || !velocity || !pressure || !divergence || !curl) return
    const gl = this.gl
    const { advect, divergence: divide, gradient, pressure: relax, scale, vorticity } = programs

    if (this.options.vorticity > 0 && programs.curl && vorticity) {
      this.draw(programs.curl, curl, { u_velocity: velocity.read })
      gl.useProgram(vorticity.program)
      gl.uniform1f(vorticity.uniforms.u_strength ?? null, this.options.vorticity)
      gl.uniform1f(vorticity.uniforms.u_dt ?? null, dt)
      this.draw(vorticity, velocity.write, { u_curl: curl, u_velocity: velocity.read })
      swap(velocity)
    }

    if (divide) this.draw(divide, divergence, { u_velocity: velocity.read })

    if (scale) {
      gl.useProgram(scale.program)
      gl.uniform1f(scale.uniforms.u_value ?? null, PRESSURE_CARRY)
      this.draw(scale, pressure.write, { u_source: pressure.read })
      swap(pressure)
    }
    if (relax) {
      for (let iteration = 0; iteration < this.options.pressureIterations; iteration += 1) {
        this.draw(relax, pressure.write, { u_divergence: divergence, u_pressure: pressure.read })
        swap(pressure)
      }
    }
    if (gradient) {
      this.draw(gradient, velocity.write, { u_pressure: pressure.read, u_velocity: velocity.read })
      swap(velocity)
    }

    if (advect) {
      gl.useProgram(advect.program)
      gl.uniform2f(advect.uniforms.u_simTexel ?? null, 1 / this.grid.width, 1 / this.grid.height)
      gl.uniform1f(advect.uniforms.u_dt ?? null, dt)
      gl.uniform1f(advect.uniforms.u_dissipation ?? null, VELOCITY_FADE)
      this.draw(advect, velocity.write, { u_source: velocity.read, u_velocity: velocity.read })
      swap(velocity)
      gl.useProgram(advect.program)
      gl.uniform1f(advect.uniforms.u_dissipation ?? null, this.options.fade)
      this.draw(advect, this.dye.write, { u_source: this.dye.read, u_velocity: velocity.read })
      swap(this.dye)
    }
  }

  /** Draws the colour onto the canvas over `base`. */
  public render(base: BackdropRgb): void {
    const gl = this.gl
    const program = this.programs?.display
    if (!gl || !program || !this.dye) return
    gl.useProgram(program.program)
    gl.uniform3f(program.uniforms.u_base ?? null, base[0], base[1], base[2])
    // The sheen needs a real slope to light. The 8-bit colour's goes up in
    // steps, and lighting those draws contour lines.
    gl.uniform1f(program.uniforms.u_sheen ?? null, this.tier === 'solver' ? 1 : 0)
    this.draw(program, null, { u_dye: this.dye.read }, this.dyeSize)
  }

  public destroy(): void {
    const gl = this.gl
    if (gl && !gl.isContextLost()) {
      this.release([this.dye, this.velocity, this.pressure])
      this.release([this.divergence, this.curl])
      for (const program of Object.values(this.programs ?? {})) if (program) gl.deleteProgram(program.program)
      if (this.vao) gl.deleteVertexArray(this.vao)
    }
    this.programs = null
    this.tier = null
    this.gl = null
  }

  private build(): void {
    const gl = this.gl
    this.tier = null
    if (!gl || gl.isContextLost()) return

    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    this.vao = vao
    gl.disable(gl.BLEND)

    const formats = this.pickFormats()
    if (!formats) return
    this.formats = formats.formats

    const make = (source: string, uniforms: string[]) =>
      createBackdropProgram(gl, VERTEX, source, ['u_texel', ...uniforms])
    const solver = formats.tier === 'solver'
    this.programs = {
      advect: solver ? make(ADVECT, ['u_velocity', 'u_source', 'u_simTexel', 'u_dt', 'u_dissipation']) : null,
      copy: make(COPY, ['u_source']),
      curl: solver ? make(CURL, ['u_velocity']) : null,
      display: make(DISPLAY, ['u_dye', 'u_base', 'u_sheen']),
      divergence: solver ? make(DIVERGENCE, ['u_velocity']) : null,
      flow: solver
        ? null
        : make(FLOW, ['u_source', 'u_vortices', 'u_count', 'u_aspect', 'u_dt', 'u_dissipation', 'u_seed']),
      gradient: solver ? make(GRADIENT, ['u_pressure', 'u_velocity']) : null,
      pressure: solver ? make(PRESSURE, ['u_pressure', 'u_divergence']) : null,
      scale: solver ? make(SCALE, ['u_source', 'u_value']) : null,
      splat: make(SPLAT, ['u_target', 'u_aspect', 'u_count', 'u_over', 'u_points', 'u_values']),
      vorticity: solver ? make(VORTICITY, ['u_velocity', 'u_curl', 'u_strength', 'u_dt']) : null,
    }
    const needed: (keyof Programs)[] = solver
      ? ['advect', 'copy', 'curl', 'display', 'divergence', 'gradient', 'pressure', 'scale', 'splat', 'vorticity']
      : ['copy', 'display', 'flow', 'splat']
    if (needed.some((name) => !this.programs?.[name])) return

    this.tier = formats.tier
    this.resize(true)
    if (!this.dye) this.tier = null
  }

  /**
   * Half floats where the GPU can render to them — which WebGL2 allows with
   * either colour-buffer extension — and otherwise plain bytes for the colour
   * alone. Checked by building a framebuffer, since an extension that is
   * there does not promise a format that completes.
   */
  private pickFormats(): { formats: Formats; tier: FluidTier } | null {
    const gl = this.gl
    if (!gl) return null
    const floats = gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float')
    if (floats) {
      const half: Formats = {
        dye: { filter: gl.LINEAR, format: gl.RGBA, internal: gl.RGBA16F, type: gl.HALF_FLOAT },
        scalar: { filter: gl.NEAREST, format: gl.RED, internal: gl.R16F, type: gl.HALF_FLOAT },
        vector: { filter: gl.LINEAR, format: gl.RG, internal: gl.RG16F, type: gl.HALF_FLOAT },
      }
      const probe = [half.dye, half.scalar, half.vector].map((format) => this.target({ height: 4, width: 4 }, format, false))
      const complete = probe.every(Boolean)
      this.release([...probe])
      if (complete) return { formats: half, tier: 'solver' }
    }
    const bytes: Format = { filter: gl.LINEAR, format: gl.RGBA, internal: gl.RGBA8, type: gl.UNSIGNED_BYTE }
    return { formats: { dye: bytes, scalar: bytes, vector: bytes }, tier: 'vortices' }
  }

  private flow(dt: number, vortices: readonly FluidVortex[]): void {
    const gl = this.gl
    const program = this.programs?.flow
    if (!gl || !program || !this.dye) return
    const aspect = this.aspect()
    const data = new Float32Array(MAX_VORTICES * 4)
    const count = Math.min(vortices.length, MAX_VORTICES)
    for (let index = 0; index < count; index += 1) {
      const vortex = vortices[index]
      if (!vortex) continue
      // Into short sides, with y turned up the texture's way, which also turns
      // every spin the other way round.
      data.set([vortex.x * aspect[0], (1 - vortex.y) * aspect[1], -vortex.strength, vortex.radius], index * 4)
    }
    gl.useProgram(program.program)
    gl.uniform4fv(program.uniforms.u_vortices ?? null, data)
    gl.uniform1i(program.uniforms.u_count ?? null, count)
    gl.uniform2f(program.uniforms.u_aspect ?? null, aspect[0], aspect[1])
    gl.uniform1f(program.uniforms.u_dt ?? null, dt)
    gl.uniform1f(program.uniforms.u_dissipation ?? null, this.options.fade)
    gl.uniform1f(program.uniforms.u_seed ?? null, (this.frame * 7.31) % 251)
    this.draw(program, this.dye.write, { u_source: this.dye.read })
    swap(this.dye)
  }

  /** The canvas's sides in units of its short side, so a circle in those units is round on screen. */
  private aspect(): readonly [number, number] {
    const width = Math.max(1, this.dyeSize.width)
    const height = Math.max(1, this.dyeSize.height)
    const short = Math.min(width, height)
    return [width / short, height / short]
  }

  /**
   * Runs `program` over `target` (the canvas, if `null`) with `textures`
   * bound to the samplers they are named after. `texelOf` sets the
   * neighbour spacing when it is not the target's own.
   */
  private draw(
    program: BackdropProgram,
    target: Target | null,
    textures: Record<string, Target>,
    texelOf?: FluidGrid,
  ): void {
    const gl = this.gl
    if (!gl) return
    gl.useProgram(program.program)
    gl.bindVertexArray(this.vao)
    let unit = 0
    for (const [name, texture] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture.texture)
      gl.uniform1i(program.uniforms[name] ?? null, unit)
      unit += 1
    }
    const width = target ? target.width : gl.drawingBufferWidth
    const height = target ? target.height : gl.drawingBufferHeight
    const texel = texelOf ?? { height, width }
    gl.uniform2f(program.uniforms.u_texel ?? null, 1 / Math.max(1, texel.width), 1 / Math.max(1, texel.height))
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null)
    gl.viewport(0, 0, width, height)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private target(size: FluidGrid, format: Format, keep = true): Target | null {
    const gl = this.gl
    if (!gl) return null
    const texture = gl.createTexture()
    const fbo = gl.createFramebuffer()
    if (!texture || !fbo) return null
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, format.filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, format.filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, format.internal, size.width, size.height, 0, format.format, format.type, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const target: Target = { fbo, height: size.height, texture, width: size.width }
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo)
      gl.deleteTexture(texture)
      return null
    }
    gl.viewport(0, 0, size.width, size.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (keep) this.targets.push(target)
    return target
  }

  /** A read and a write target of `size`, holding `previous`'s content resampled when there is one. */
  private pair(size: FluidGrid, format: Format, previous: Pair | null): Pair | null {
    const read = this.target(size, format)
    const write = this.target(size, format)
    if (!read || !write) return null
    const copy = this.programs?.copy
    if (previous && copy) this.draw(copy, read, { u_source: previous.read })
    return { read, write }
  }

  private release(items: readonly (Pair | Target | null)[]): void {
    const gl = this.gl
    if (!gl) return
    for (const item of items) {
      if (!item) continue
      for (const target of 'read' in item ? [item.read, item.write] : [item]) {
        gl.deleteFramebuffer(target.fbo)
        gl.deleteTexture(target.texture)
        this.targets = this.targets.filter((kept) => kept !== target)
      }
    }
  }
}
