import { clamp } from '@liquefy-ui/core'
import type { BackdropRgb } from './backdrop-color'

/**
 * The knobs of a fluid backdrop. Everything that costs GPU time is here, so
 * a page that needs it lighter can turn it down without forking the shader.
 */
export type FluidOptions = {
  /** Cells across the short side of the dye — the colour you see. Never more than the canvas has pixels. */
  dyeResolution: number
  /** How fast the colour fades, per second. Lower keeps more of it on screen; 0 never fades. */
  fade: number
  /** Most device pixels per CSS pixel the canvas is drawn at. The colour is soft, so 1 loses nothing visible. */
  maxPixelRatio: number
  /** Jacobi iterations of the pressure solve per frame. More keeps the water from compressing; fewer is cheaper. */
  pressureIterations: number
  /** Cells across the short side of the velocity grid, which is far coarser than the dye it carries. */
  resolution: number
  /** How fast time runs, 1 being real time. 0 holds the water still. */
  speed: number
  /** 0 to 1: how hard the water is stirred on its own when nobody is touching it. */
  stir: number
  /** How strongly small eddies are kept spinning instead of being smeared out by the grid. */
  vorticity: number
}

export const FLUID_DEFAULTS: Readonly<FluidOptions> = {
  dyeResolution: 512,
  fade: 0.4,
  maxPixelRatio: 1,
  pressureIterations: 20,
  resolution: 128,
  speed: 1,
  stir: 0.5,
  vorticity: 12,
}

const LIMITS: Record<keyof FluidOptions, readonly [number, number, boolean]> = {
  // [least, most, whole numbers only]
  dyeResolution: [32, 2048, true],
  fade: [0, 4, false],
  maxPixelRatio: [0.25, 3, false],
  pressureIterations: [1, 80, true],
  resolution: [16, 512, true],
  speed: [0, 4, false],
  stir: [0, 1, false],
  vorticity: [0, 80, false],
}

/**
 * Fills in what was left out and holds everything else to a range the
 * simulation is stable and affordable in: a value that is not a number falls
 * back to the default, and one outside the range is clamped to its end.
 */
export const resolveFluidOptions = (options: Partial<FluidOptions> = {}): FluidOptions => {
  const resolved = { ...FLUID_DEFAULTS }
  for (const key of Object.keys(LIMITS) as (keyof FluidOptions)[]) {
    const value = options[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const [least, most, whole] = LIMITS[key]
    resolved[key] = clamp(whole ? Math.round(value) : value, least, most)
  }
  return resolved
}

/** A grid's size in cells. */
export type FluidGrid = { height: number; width: number }

/**
 * The grid for a canvas of `width` × `height` pixels with `resolution` cells
 * across its short side, the long side in proportion. The long side is held
 * to four times the short, so a strip-shaped canvas does not ask for a grid
 * the size of the page.
 */
export const fluidGrid = (width: number, height: number, resolution: number): FluidGrid => {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const short = Math.max(1, Math.round(resolution))
  const aspect = Math.min(Math.max(w, h) / Math.min(w, h), 4)
  const long = Math.max(1, Math.round(short * aspect))
  return w >= h ? { height: short, width: long } : { height: long, width: short }
}

/**
 * The dye grid: `resolution` across the short side, but never finer than the
 * canvas itself, where the extra cells would only be averaged away.
 */
export const dyeGrid = (width: number, height: number, resolution: number): FluidGrid =>
  fluidGrid(width, height, Math.min(resolution, Math.max(1, Math.min(width, height))))

/**
 * One push of the water and a drop of colour with it. Positions are
 * fractions of the backdrop from its top-left corner, as on the page; the
 * push is in fractions of the backdrop per second, added to the water under
 * the splat; and the colour is premultiplied — how much of each channel to
 * add — so a faint touch adds a little.
 */
export type FluidSplat = {
  color: BackdropRgb
  dx: number
  dy: number
  /** Radius of the splat, in fractions of the backdrop's short side. */
  radius: number
  x: number
  y: number
}

/** A seeded random stream (mulberry32), so a backdrop starts the same on the server and in every browser. */
export const seededRandom = (seed: number): (() => number) => {
  let state = Math.floor(seed * 2654435761) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const scale = ([r, g, b]: BackdropRgb, amount: number): BackdropRgb => [r * amount, g * amount, b * amount]

/**
 * The palette as one colour that drifts through it over time, lingering on
 * each colour and blending to the next — the colour a pointer paints with.
 */
export const paletteAt = (palette: readonly BackdropRgb[], time: number, period = 2.4): BackdropRgb => {
  if (palette.length === 0) return [1, 1, 1]
  const position = (((time / period) % palette.length) + palette.length) % palette.length
  const index = Math.floor(position)
  const from = palette[index] ?? [1, 1, 1]
  const to = palette[(index + 1) % palette.length] ?? from
  // Smoothstep, so the colour holds for a while before it turns.
  const t = position - index
  const blend = t * t * (3 - 2 * t)
  return [
    from[0] + (to[0] - from[0]) * blend,
    from[1] + (to[1] - from[1]) * blend,
    from[2] + (to[2] - from[2]) * blend,
  ]
}

type Wanderer = {
  /** Centre of the path. */
  cx: number
  cy: number
  /** Reach of the path either side of its centre. */
  rx: number
  ry: number
  /** Angular speeds and phases of the two harmonics on each axis. */
  wx: number
  wy: number
  px: number
  py: number
  qx: number
  qy: number
  /** Where in the palette it starts, in seconds of `paletteAt`'s cycle. */
  color: number
}

/** Seconds a stirrer spends on each palette colour before it has blended into the next. */
const STIR_COLOR_PERIOD = 12

/** How hard a stirrer pushes the water it passes through, per unit of its own speed. */
const STIR_PUSH = 6

/** How much colour a stirrer lays down per second at full `stir`. */
const STIR_INK = 6

/** The stirrers' splat radius, in short sides. */
const STIR_RADIUS = 0.08

/**
 * Invisible stirrers that wander the water when nobody is touching it. Each
 * one follows a slow, never-quite-repeating loop — two sine harmonics a
 * little out of tune on each axis — pushing the water along its path and
 * trailing a ribbon of colour behind it that drifts through the palette. The paths stay inside the
 * backdrop with a margin, so colour is laid down where it can be seen.
 *
 * It touches no DOM and no GPU: `splats(time, step)` is all it does.
 */
export class FluidStirrer {
  private readonly wanderers: Wanderer[]

  public constructor(count = 3, seed = 1) {
    const random = seededRandom(seed)
    const total = Math.max(0, Math.round(count))
    this.wanderers = Array.from({ length: total }, (_, index) => ({
      color: index * STIR_COLOR_PERIOD,
      cx: 0.3 + random() * 0.4,
      cy: 0.3 + random() * 0.4,
      px: random() * Math.PI * 2,
      py: random() * Math.PI * 2,
      qx: random() * Math.PI * 2,
      qy: random() * Math.PI * 2,
      rx: 0.16 + random() * 0.08,
      ry: 0.16 + random() * 0.08,
      // A full loop takes something like ten to eighteen seconds.
      wx: 0.35 + random() * 0.25,
      wy: 0.35 + random() * 0.25,
    }))
  }

  /** Where stirrer `index` is at `time`, in fractions of the backdrop. */
  public position(index: number, time: number): { x: number; y: number } {
    const w = this.wanderers[index]
    if (!w) return { x: 0.5, y: 0.5 }
    return {
      x: w.cx + w.rx * (0.7 * Math.sin(w.wx * time + w.px) + 0.3 * Math.sin(2.3 * w.wx * time + w.qx)),
      y: w.cy + w.ry * (0.7 * Math.sin(w.wy * time + w.py) + 0.3 * Math.sin(1.7 * w.wy * time + w.qy)),
    }
  }

  /** How fast stirrer `index` is moving at `time`, in fractions of the backdrop per second. */
  public velocity(index: number, time: number): { x: number; y: number } {
    const w = this.wanderers[index]
    if (!w) return { x: 0, y: 0 }
    return {
      x: w.rx * (0.7 * w.wx * Math.cos(w.wx * time + w.px) + 0.3 * 2.3 * w.wx * Math.cos(2.3 * w.wx * time + w.qx)),
      y: w.ry * (0.7 * w.wy * Math.cos(w.wy * time + w.py) + 0.3 * 1.7 * w.wy * Math.cos(1.7 * w.wy * time + w.qy)),
    }
  }

  public get count(): number {
    return this.wanderers.length
  }

  /**
   * The splats the stirrers make over a frame `step` seconds long ending at
   * `time`, at a `strength` from 0 to 1. A zero-length frame makes none.
   */
  public splats(time: number, step: number, palette: readonly BackdropRgb[], strength: number): FluidSplat[] {
    if (step <= 0 || strength <= 0 || palette.length === 0) return []
    return this.wanderers.map((wanderer, index) => {
      const { x, y } = this.position(index, time)
      const velocity = this.velocity(index, time)
      // Each stirrer moves through the whole palette, a colour every few
      // seconds, so every colour keeps turning up however many stirrers there are.
      const color = paletteAt(palette, time + wanderer.color * (palette.length / Math.max(1, this.wanderers.length)), STIR_COLOR_PERIOD)
      return {
        color: scale(color, STIR_INK * strength * step),
        dx: velocity.x * STIR_PUSH * strength,
        dy: velocity.y * STIR_PUSH * strength,
        radius: STIR_RADIUS,
        x,
        y,
      }
    })
  }
}

/** How hard a pointer pushes, per fraction of the backdrop it moved since the last frame. */
const POINTER_PUSH = 38

/** Colour per fraction of the backdrop the pointer travelled. */
const POINTER_INK = 2.6

/** Most colour a single frame of pointer movement can lay down. */
const POINTER_INK_CAP = 0.3

/** The pointer's splat radius, in short sides. */
const POINTER_RADIUS = 0.045

/**
 * Collects a pointer's movement between frames into one splat per frame. A
 * mouse can report several moves a frame, and a splat for each would stamp a
 * string of beads; one per frame along the whole movement reads as a stroke.
 */
export class PointerStroke {
  private last: { x: number; y: number } | null = null
  private dx = 0
  private dy = 0
  private x = 0
  private y = 0
  private moved = false

  /** The pointer is at `x`, `y` (fractions of the backdrop). */
  public move(x: number, y: number): void {
    if (this.last) {
      this.dx += x - this.last.x
      this.dy += y - this.last.y
      this.moved = true
    }
    this.last = { x, y }
    this.x = x
    this.y = y
  }

  /** The pointer has left, or lifted: its next move starts a new stroke instead of jumping from here. */
  public lift(): void {
    this.last = null
  }

  /** The splat for everything moved since the last call, in `color`, or `null` if it has not moved. */
  public take(color: BackdropRgb): FluidSplat | null {
    if (!this.moved) return null
    const distance = Math.hypot(this.dx, this.dy)
    const splat: FluidSplat = {
      color: scale(color, Math.min(distance * POINTER_INK, POINTER_INK_CAP)),
      dx: this.dx * POINTER_PUSH,
      dy: this.dy * POINTER_PUSH,
      radius: POINTER_RADIUS,
      x: this.x,
      y: this.y,
    }
    this.dx = 0
    this.dy = 0
    this.moved = false
    return splat
  }
}

/**
 * The splats a backdrop opens with, so it is already full of colour on its
 * first frame instead of filling up from black: a few soft pools of each
 * palette colour, scattered, each with a push to start it turning.
 */
export const fluidSplash = (palette: readonly BackdropRgb[], seed = 1): FluidSplat[] => {
  if (palette.length === 0) return []
  const random = seededRandom(seed + 101)
  const count = Math.max(6, palette.length * 2)
  return Array.from({ length: count }, (_, index) => {
    const angle = random() * Math.PI * 2
    const push = 0.8 + random() * 0.8
    return {
      color: scale(palette[index % palette.length] ?? [1, 1, 1], 0.45 + random() * 0.3),
      dx: Math.cos(angle) * push,
      dy: Math.sin(angle) * push,
      radius: 0.07 + random() * 0.05,
      x: 0.12 + random() * 0.76,
      y: 0.12 + random() * 0.76,
    }
  })
}

/** One vortex of the analytic flow: where it is, how hard it spins (positive is anticlockwise), and its core's radius. */
export type FluidVortex = {
  radius: number
  strength: number
  x: number
  y: number
}

/** Most vortices the analytic flow carries at once; the shader has a slot for each. */
export const MAX_VORTICES = 12

/** How long, in seconds, a pointer's vortices take to lose half their spin. */
const VORTEX_HALF_LIFE = 0.7

/**
 * The flow used where the GPU cannot hold a velocity field: no simulation,
 * only a handful of vortices whose velocity is written down in closed form.
 * A field built only out of vortices has no divergence, so colour carried
 * through it swirls and folds as it would in water — it simply cannot be
 * pushed around as freely as in the full solver.
 *
 * Each stirrer is a vortex that travels its path; each frame of pointer
 * movement drops a pair of opposite vortices either side of the stroke,
 * which together shove the water along it, and which spin down over a
 * second or so.
 */
export class VortexField {
  private trail: FluidVortex[] = []

  /** Drops the pair of vortices for a pointer's `splat`. */
  public push(splat: FluidSplat): void {
    const speed = Math.hypot(splat.dx, splat.dy)
    if (speed < 1e-4) return
    // Either side of the stroke, half a radius out, turning opposite ways.
    const nx = -splat.dy / speed
    const ny = splat.dx / speed
    const offset = splat.radius * 0.8
    const strength = Math.min(speed, 12) * splat.radius * 1.6
    this.trail.push(
      { radius: splat.radius, strength, x: splat.x + nx * offset, y: splat.y + ny * offset },
      { radius: splat.radius, strength: -strength, x: splat.x - nx * offset, y: splat.y - ny * offset },
    )
    // Keep the newest; the oldest have spun down the most.
    if (this.trail.length > MAX_VORTICES) this.trail.splice(0, this.trail.length - MAX_VORTICES)
  }

  /** Spins the pointer's vortices down by a frame `step` seconds long and lets the faint ones go. */
  public step(step: number): void {
    if (step <= 0) return
    const decay = 0.5 ** (step / VORTEX_HALF_LIFE)
    for (const vortex of this.trail) vortex.strength *= decay
    this.trail = this.trail.filter((vortex) => Math.abs(vortex.strength) > 1e-3)
  }

  /** Every vortex at `time`: the stirrers' first, then as many of the pointer's as there is room for. */
  public vortices(stirrer: FluidStirrer, time: number, strength: number): FluidVortex[] {
    const own: FluidVortex[] = []
    for (let index = 0; index < stirrer.count; index += 1) {
      const { x, y } = stirrer.position(index, time)
      own.push({ radius: 0.18, strength: (index % 2 === 0 ? 1 : -1) * 0.6 * strength, x, y })
    }
    return [...own, ...this.trail.slice(-(MAX_VORTICES - own.length))].slice(0, MAX_VORTICES)
  }
}
