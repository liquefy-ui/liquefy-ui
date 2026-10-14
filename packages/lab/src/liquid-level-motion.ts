import { clamp, SpringValue } from '@liquefy-ui/core'

export type LiquidLevelOptions = {
  /** The vessel's width over its height, which turns a lean into a slope. */
  aspect?: number
  /** How many columns the surface is simulated in, 8 to 96. */
  columns?: number
  /** 0 to 1, the provider's `wobbliness`: how long the liquid keeps moving once it is disturbed. */
  wobbliness?: number
}

/** The fixed step the surface is integrated at. Explicit wave integration is only stable below a limit. */
const SUBSTEP = 1 / 240

/** The longest frame the clock will count, in seconds. */
const MAX_FRAME = 1 / 30

/** How far the surface leans at a full lean, in radians: about twelve degrees. */
const MAX_LEAN = (12 * Math.PI) / 180

/**
 * How fast a wave crosses the vessel, in widths per second. It sets the
 * slowest slosh, the one that rocks from wall to wall, at about a second a
 * swing — the period of a glass of water nudged on a table.
 */
const WAVE_SPEED = 1.9

/** Pulls a stray offset back to the mean so the volume does not drift. Small enough not to change the slosh. */
const RESTORE = 3

/** Damps short ripples faster than the long slosh, so the surface stays smooth while it rocks. */
const VISCOSITY = 6

/** How hard a change of value kicks the surface, per unit of the jump's size. */
const SPLASH = 0.28

/** How far the liquid climbs the walls as the level turns round, per unit of the change in its speed. */
const CLIMB = 0.12

/** The far side of the surface moves less than the near one. */
const BACK = 0.7

/** Below this, in fractions of the vessel's height, a wave is too small to draw and the surface is flat. */
const QUIET = 6e-4

/** A level this close to the bottom is too shallow to carry a full-height wave. */
const SHALLOW = 0.08

/**
 * The liquid behind a level meter: a level that springs past its mark and
 * settles back, and a surface that sloshes when the level jumps or the vessel
 * leans.
 *
 * The surface is a one-dimensional heightfield — a row of columns, each pulled
 * toward its neighbours by the wave equation and slowed by damping — so a kick
 * on one side travels across, reflects off the walls and dies away. Heights are
 * measured in fractions of the vessel's height from the bottom, which keeps the
 * waves in proportion at any size.
 *
 * Like `DropletChoreography`, it touches no DOM and keeps a clock that only
 * moves when a frame is stepped, so a renderer reads `front(i)` and `back(i)`
 * after each `step` and a unit test can assert the whole motion.
 */
export class LiquidLevelSimulation {
  public readonly columns: number

  private readonly accelerations: Float64Array
  private aspect: number
  private busy = false
  private readonly climb: Float64Array
  private readonly damping: number
  private readonly heights: Float64Array
  private readonly lean: SpringValue
  private readonly level: SpringValue
  /** Seconds stepped but not yet integrated, carried over to the next frame. */
  private pending = 0
  private readonly position: Float64Array
  private readonly splash: Float64Array
  private readonly velocities: Float64Array
  private readonly waveSpeed: number

  public constructor(level: number, options: LiquidLevelOptions = {}) {
    const wobbliness = clamp(options.wobbliness ?? 0.1, 0, 1)
    this.columns = Math.round(clamp(options.columns ?? 48, 8, 96))
    this.aspect = Math.max(0.05, options.aspect ?? 1)
    this.waveSpeed = WAVE_SPEED * this.columns
    // About two seconds of slosh at the provider's default, longer as the
    // wobbliness rises.
    this.damping = 1.9 - wobbliness * 1.2
    // Underdamped on purpose: the level swings about an eighth of the way past
    // its mark and back, the way a poured liquid overshoots and drops.
    this.level = new SpringValue(clamp(level, 0, 1), { damping: 10.6 - wobbliness * 5, mass: 1, stiffness: 90 })
    this.lean = new SpringValue(0, { damping: 14, mass: 1, stiffness: 70 })

    this.accelerations = new Float64Array(this.columns)
    this.heights = new Float64Array(this.columns)
    this.velocities = new Float64Array(this.columns)
    this.position = new Float64Array(this.columns)
    this.splash = new Float64Array(this.columns)
    this.climb = new Float64Array(this.columns)
    for (let index = 0; index < this.columns; index += 1) {
      const x = (index + 0.5) / this.columns
      this.position[index] = x - 0.5
      // The first three sloshing modes of a box, lopsided so a jump rocks the
      // surface rather than only bowing it. Each averages to zero over the
      // columns, so a kick moves liquid about without adding or removing any.
      this.splash[index] = Math.cos(Math.PI * x) * 0.9 + Math.cos(2 * Math.PI * x) * 0.5 + Math.cos(3 * Math.PI * x) * 0.25
      this.climb[index] = Math.cos(2 * Math.PI * x)
    }
  }

  /** The level being headed for, 0 to 1. */
  public get target(): number {
    return this.level.target
  }

  /** The level as drawn, which swings past the target on its way there. */
  public get current(): number {
    return this.level.current
  }

  /** The tallest wave on the surface, in fractions of the vessel's height. */
  public get slosh(): number {
    let tallest = 0
    for (const height of this.heights) tallest = Math.max(tallest, Math.abs(height))
    return tallest
  }

  /** True once the level is on its mark and the surface is flat and still. */
  public get settled(): boolean {
    return !this.busy
  }

  /** Heads for a new level, 0 to 1. The surface is kicked in proportion to the jump. */
  public setLevel(level: number): void {
    const next = clamp(Number.isFinite(level) ? level : 0, 0, 1)
    const jump = next - this.level.target
    if (jump === 0) return
    this.level.setTarget(next)
    // Kicked on a curve rather than in proportion, so a nudge of a few
    // percent still ripples while a jump across the vessel does not slop
    // over the brim.
    const kick = Math.sign(jump) * Math.abs(jump) ** 0.6 * SPLASH
    for (let index = 0; index < this.columns; index += 1) this.velocities[index]! -= kick * (this.splash[index] ?? 0)
    this.busy = true
  }

  /** Leans the surface toward one side, -1 (left) to 1 (right), as if the vessel were tipped that way. */
  public setLean(lean: number): void {
    const next = clamp(Number.isFinite(lean) ? lean : 0, -1, 1)
    if (next === this.lean.target) return
    this.lean.setTarget(next)
    this.busy = true
  }

  /** A new width over height. The surface keeps its shape; only the lean's slope is rescaled. */
  public resize(aspect: number): void {
    if (Number.isFinite(aspect) && aspect > 0) this.aspect = Math.max(0.05, aspect)
  }

  /** Puts the level on its mark with a flat, still surface, for reduced motion and for tests. */
  public settle(): void {
    this.level.set(this.level.target)
    this.lean.set(this.lean.target)
    this.heights.fill(0)
    this.velocities.fill(0)
    this.pending = 0
    this.busy = false
  }

  /**
   * Advances by one frame of `delta` seconds. Returns whether anything is
   * still moving.
   */
  public step(delta: number): boolean {
    // A long frame counts as a short one: a stall slows the liquid down
    // instead of letting the waves blow up over one huge step.
    this.pending += Number.isFinite(delta) ? Math.min(Math.max(delta, 0), MAX_FRAME) : 0
    while (this.pending >= SUBSTEP * 0.999) {
      this.pending -= SUBSTEP
      this.integrate()
    }
    return this.busy
  }

  /** The near surface's height above the bottom at column `index`, in fractions of the vessel's height. */
  public front(index: number): number {
    return this.surface(index, this.heights[index] ?? 0)
  }

  /**
   * The far surface's height. It mirrors the near one at a smaller amplitude,
   * so a rock from wall to wall reads as liquid swirling round the vessel
   * rather than a flat sheet tipping.
   */
  public back(index: number): number {
    return this.surface(index, (this.heights[this.columns - 1 - index] ?? 0) * BACK)
  }

  private surface(index: number, wave: number): number {
    const level = this.level.current
    // A puddle cannot carry a wave as tall as a full vessel does.
    const depth = clamp(level / SHALLOW, 0, 1)
    return level + this.slope() * (this.position[index] ?? 0) + wave * depth
  }

  private slope(): number {
    return Math.tan(this.lean.current * MAX_LEAN) * this.aspect
  }

  private integrate(): void {
    const levelVelocity = this.level.velocity
    const slope = this.slope()
    const levelMoving = this.level.step(SUBSTEP)
    const leanMoving = this.lean.step(SUBSTEP)

    const columns = this.columns
    const heights = this.heights
    const velocities = this.velocities

    // A lean moves the surface's resting line, not the liquid: what was level
    // a moment ago is now off the new line by the change in slope, and the
    // waves carry it across from there. That lag is the slosh.
    const tilted = this.slope() - slope
    // The level turning round — slowing at the top of its swing — sends the
    // liquid up the walls for a moment.
    const surge = (this.level.velocity - levelVelocity) * CLIMB
    if (tilted !== 0 || surge !== 0) {
      for (let index = 0; index < columns; index += 1) {
        heights[index]! -= tilted * (this.position[index] ?? 0)
        velocities[index]! -= surge * (this.climb[index] ?? 0)
      }
    }

    // Every column's pull is worked out from the same instant before any of
    // them moves, so the surface does not drift toward whichever end the loop
    // starts from.
    const speed = this.waveSpeed * this.waveSpeed
    const accelerations = this.accelerations
    for (let index = 0; index < columns; index += 1) {
      const height = heights[index] ?? 0
      const velocity = velocities[index] ?? 0
      // The walls reflect: past either end the surface carries on flat.
      const curvature = (heights[index - 1] ?? height) + (heights[index + 1] ?? height) - 2 * height
      const shear = (velocities[index - 1] ?? velocity) + (velocities[index + 1] ?? velocity) - 2 * velocity
      accelerations[index] = speed * curvature - RESTORE * height - this.damping * velocity + VISCOSITY * shear
    }

    let tallest = 0
    let fastest = 0
    for (let index = 0; index < columns; index += 1) {
      velocities[index] = (velocities[index] ?? 0) + (accelerations[index] ?? 0) * SUBSTEP
      const height = (heights[index] ?? 0) + (velocities[index] ?? 0) * SUBSTEP
      heights[index] = height
      tallest = Math.max(tallest, Math.abs(height))
      fastest = Math.max(fastest, Math.abs(velocities[index] ?? 0))
    }

    const rippling = tallest > QUIET || fastest > QUIET * 10
    if (!rippling) {
      heights.fill(0)
      velocities.fill(0)
    }
    this.busy = levelMoving || leanMoving || rippling
  }
}
