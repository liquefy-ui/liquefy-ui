import { clamp, SpringValue } from '@liquefy-ui/core'

/**
 * The point of the glass that stays put while it changes shape, named for where
 * it sits on the shape: `top-left` grows right and down, `top` grows down and
 * out to both sides, `center` grows every way at once.
 */
export type MorphOrigin =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'

/** A rounded rectangle of glass at rest, in pixels. */
export type MorphBox = { height: number; radius: number; width: number }

export type MorphFrame = {
  /** Uniform scale of a landing bounce, 1 at rest. Content scales with it about the origin. */
  bounce: number
  /** Opacity of the content the latest swap replaced, falling to 0. */
  conceal: number
  height: number
  radius: number
  /** Opacity of the content the latest swap brought in, rising to 1 as the glass makes room for it. */
  reveal: number
  width: number
  /** The glass's centre, relative to the origin point. */
  x: number
  y: number
}

export type GlassMorphOptions = {
  /** Milliseconds the second axis waits behind the first. */
  lag?: number
  origin?: MorphOrigin
  /** 0 to 1, the provider's `wobbliness`: how far the glass swings past its new shape. */
  wobbliness?: number
}

export type MorphToOptions = {
  /** Ends with a pop: the glass swells past its size as it lands and wobbles back. */
  bounce?: boolean
  /**
   * Whether new content comes in with the shape. The old content fades out at
   * once and the new waits until the glass has made room for it. False keeps
   * the content as it is and only moves the glass.
   */
  swap?: boolean
}

/**
 * Which way the glass's centre lies from the origin point, per axis: 1 is
 * right of (below) it, -1 left of (above) it, 0 on it.
 */
const DIRECTIONS: Record<MorphOrigin, readonly [number, number]> = {
  bottom: [0, -1],
  'bottom-left': [1, -1],
  'bottom-right': [-1, -1],
  center: [0, 0],
  left: [1, 0],
  right: [-1, 0],
  top: [0, 1],
  'top-left': [1, 1],
  'top-right': [-1, 1],
}

export const morphDirection = (origin: MorphOrigin): readonly [number, number] => DIRECTIONS[origin]

/** The longest frame the clock will count, in seconds. */
const MAX_FRAME = 1 / 30
/** How long outgoing content takes to fade, in milliseconds. */
const CONCEAL = 110
/** The soonest incoming content starts to show, and how long it then takes. */
const REVEAL_DELAY = 70
const REVEAL = 200
/** How fast the size has to change before the corners round off toward a pill, in pixels a second. */
const ROUNDING_SPEED = 2400
/** The most a fast-growing axis thins the other, as a share of it. */
const MAX_THINNING = 0.12
/** Closer than this, in pixels and pixels a second, a size is at rest: the eye stopped seeing it move long before the spring would. */
const REST_DISTANCE = 0.05
const REST_SPEED = 0.5

const smoothstep = (value: number): number => {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

/** A spring's direction of travel toward its target, as -1, 0 or 1. */
const heading = (spring: SpringValue): number => Math.sign(spring.target - spring.current)

/** Steps a spring measured in pixels, and puts it to rest once it is too close to its target to see. */
const stepPixels = (spring: SpringValue, seconds: number): boolean => {
  const moving = spring.step(seconds)
  if (moving && Math.abs(spring.target - spring.current) < REST_DISTANCE && Math.abs(spring.velocity) < REST_SPEED) {
    spring.set(spring.target)
    return false
  }
  return moving
}

type Axis = {
  /** When the target below is due to be handed to the spring, on the morph's own clock. */
  dueAt: number
  /** The target this axis is waiting for its turn to head to. */
  pending: number | null
  spring: SpringValue
}

/**
 * The motion behind glass that changes shape: a button that grows into a panel,
 * a bubble that stretches into a capsule. Width, height and corner radius each
 * ride a spring, so the glass swings past its new shape and settles back.
 *
 * One axis goes first and the other follows `lag` milliseconds behind: growing,
 * the glass spreads sideways before it drops; shrinking, it pulls its height in
 * before its width — one thing at a time, the way a drop of liquid spreads and
 * gathers. While an axis is moving fast the other thins and the corners round
 * off, so the glass is a blob in motion and a crisp rounded rectangle at rest.
 *
 * It touches no DOM. `step` is handed each frame's delta and the renderer reads
 * `frame()` back, which is what lets the sequence be asserted in a unit test.
 * Like `DropletChoreography`, the lag runs on a clock that only moves when a
 * frame is stepped, and a long frame counts as a short one, so a main-thread
 * stall slows the morph down instead of collapsing its two halves into one.
 */
export class GlassMorph {
  /** Milliseconds of animation stepped so far. */
  private clock = 0
  private readonly direction: readonly [number, number]
  private readonly lag: number
  private readonly width: Axis
  private readonly height: Axis
  private readonly radius: SpringValue
  /** Jelly: each axis's own wobble about 1, on top of the size. */
  private readonly squashX: SpringValue
  private readonly squashY: SpringValue
  private readonly pop: SpringValue

  private goal: MorphBox
  /** The box the latest swap started from, for measuring how far the glass has come. */
  private distance = 0
  private progress = 1
  private swappedAt = Number.NEGATIVE_INFINITY
  private concealFrom = 0
  private revealed = 1
  /** The axis whose arrival ends the morph, and the side of its target it started on. */
  private landing: { axis: Axis; side: number } | null = null
  private bounceOnLanding = false

  public constructor(box: MorphBox, options: GlassMorphOptions = {}) {
    this.direction = DIRECTIONS[options.origin ?? 'top-left']
    this.lag = Math.max(0, options.lag ?? 70)
    // A damping ratio of about 0.62 at the provider's default wobbliness: the
    // glass overshoots by under a tenth and comes back once, reaching its new
    // size in about a third of a second. Full wobbliness takes the ratio down
    // to 0.35, where it rings.
    const ratio = 0.65 - clamp(options.wobbliness ?? 0.1, 0, 1) * 0.3
    const size = { damping: 2 * Math.sqrt(190) * ratio, mass: 1, stiffness: 190 }
    this.width = { dueAt: Number.POSITIVE_INFINITY, pending: null, spring: new SpringValue(box.width, size) }
    this.height = { dueAt: Number.POSITIVE_INFINITY, pending: null, spring: new SpringValue(box.height, size) }
    this.radius = new SpringValue(box.radius, { damping: 2 * Math.sqrt(160) * 0.8, mass: 1, stiffness: 160 })
    this.squashX = new SpringValue(1, { damping: 12, mass: 1, stiffness: 380 })
    this.squashY = new SpringValue(1, { damping: 12, mass: 1, stiffness: 380 })
    // Loose enough to ring: a pop swells by about a sixth, dips under and
    // swells again before it rests.
    this.pop = new SpringValue(1, { damping: 9, mass: 1, stiffness: 440 })
    this.goal = { ...box }
  }

  /** The shape the glass is heading for. */
  public get target(): MorphBox {
    return { ...this.goal }
  }

  /**
   * Starts a morph to `box`. Growing, width goes first and height follows a lag
   * behind; shrinking in height, height goes first. A morph started while
   * another is under way carries on from where the glass is, at the speed it
   * has.
   */
  public morphTo(box: MorphBox, options: MorphToOptions = {}): void {
    const now = this.clock
    const swap = options.swap ?? true
    if (swap) {
      // The content on its way in becomes the content on its way out, from
      // however far it had got.
      this.concealFrom = this.revealed
      this.revealed = 0
      this.swappedAt = now
      this.progress = 0
      this.distance = Math.abs(box.width - this.width.spring.current) + Math.abs(box.height - this.height.spring.current)
    }

    const heightFirst = box.height < this.height.spring.current - 0.5
    const [first, second] = heightFirst ? [this.height, this.width] : [this.width, this.height]
    const [firstTarget, secondTarget] = heightFirst ? [box.height, box.width] : [box.width, box.height]
    first.pending = null
    first.dueAt = Number.POSITIVE_INFINITY
    first.spring.setTarget(firstTarget)
    // The second waits only when the first has somewhere to go.
    const firstMoves = Math.abs(firstTarget - first.spring.current) > 0.5
    second.pending = secondTarget
    second.dueAt = firstMoves ? now + this.lag : now
    this.radius.setTarget(box.radius)
    this.goal = { ...box }

    const secondMoves = Math.abs(secondTarget - second.spring.current) > 0.5
    const lands = secondMoves ? second : firstMoves ? first : null
    this.landing = lands ? { axis: lands, side: Math.sign((lands === second ? secondTarget : firstTarget) - lands.spring.current) } : null
    this.bounceOnLanding = options.bounce === true && (lands !== null || swap)
    // New content and nowhere to travel: the bounce lands straight away.
    if (!lands && this.bounceOnLanding) this.land()
    this.applyDue()
  }

  /**
   * Moves the glass to a new size without replaying a morph: both axes at once,
   * the content left as it is. For content that grows or shrinks on its own,
   * like a list filling in as someone types.
   */
  public resize(box: MorphBox): void {
    for (const [axis, value] of [[this.width, box.width], [this.height, box.height]] as const) {
      if (axis.pending !== null) axis.pending = value
      else axis.spring.setTarget(value)
    }
    this.radius.setTarget(box.radius)
    this.goal = { ...box }
  }

  /** Puts the glass in its final shape with its content showing and nothing moving, for motion off and for tests. */
  public settle(): void {
    this.width.spring.set(this.goal.width)
    this.height.spring.set(this.goal.height)
    this.radius.set(this.goal.radius)
    for (const axis of [this.width, this.height]) {
      axis.pending = null
      axis.dueAt = Number.POSITIVE_INFINITY
    }
    for (const spring of [this.squashX, this.squashY, this.pop]) spring.set(1)
    this.revealed = 1
    this.concealFrom = 0
    this.progress = 1
    this.distance = 0
    this.swappedAt = Number.NEGATIVE_INFINITY
    this.landing = null
    this.bounceOnLanding = false
  }

  /**
   * Advances the morph by one frame of `delta` seconds. Returns whether
   * anything is still moving, fading or waiting for its turn.
   */
  public step(delta: number): boolean {
    // A long frame counts as a short one, so a stall slows the morph down
    // instead of letting the second axis start alongside the first.
    const seconds = Math.min(Math.max(delta, 0), MAX_FRAME)
    this.clock += seconds * 1000
    this.applyDue()

    let busy = this.width.pending !== null || this.height.pending !== null
    for (const spring of [this.width.spring, this.height.spring, this.radius]) {
      if (stepPixels(spring, seconds)) busy = true
    }
    for (const spring of [this.squashX, this.squashY, this.pop]) {
      if (spring.step(seconds)) busy = true
    }

    if (this.landing) {
      const { axis, side } = this.landing
      // Landed once the axis reaches its target: on the far side of it, or at rest on it.
      if (axis.pending === null && (heading(axis.spring) !== side || side === 0)) this.land()
    }

    if (this.distance > 0.5) {
      const remaining = Math.abs(this.goal.width - this.width.spring.current) + Math.abs(this.goal.height - this.height.spring.current)
      // The furthest it has come: swinging back from an overshoot does not take the content away again.
      this.progress = Math.max(this.progress, 1 - remaining / this.distance)
    } else {
      this.progress = 1
    }
    const elapsed = this.clock - this.swappedAt
    this.revealed = Math.min(
      smoothstep((this.progress - 0.4) / 0.45),
      smoothstep((elapsed - REVEAL_DELAY) / REVEAL),
    )
    if (this.revealed < 1 || this.conceal > 0) busy = true
    return busy
  }

  /** True once nothing is moving, fading or waiting, which is when an outgoing layer may unmount. */
  public get settled(): boolean {
    return this.width.pending === null
      && this.height.pending === null
      && this.revealed >= 1
      && this.conceal <= 0
      && [this.width.spring, this.height.spring, this.radius, this.squashX, this.squashY, this.pop]
        .every((spring) => spring.velocity === 0 && spring.current === spring.target)
  }

  public frame(): MorphFrame {
    const bounce = Math.max(0, this.pop.current)
    let width = Math.max(0, this.width.spring.current) * this.squashX.current * bounce
    let height = Math.max(0, this.height.spring.current) * this.squashY.current * bounce

    // Growing fast along one axis thins the other a little, the way a drop
    // pulled out sideways gets thinner before it fills back out.
    const rateX = this.width.spring.velocity / Math.max(this.width.spring.current, 24)
    const rateY = this.height.spring.velocity / Math.max(this.height.spring.current, 24)
    const thinning = clamp((rateX - rateY) * 0.025, -MAX_THINNING, MAX_THINNING)
    if (thinning > 0) height *= 1 - thinning
    else width *= 1 + thinning

    // In motion the corners round off toward a pill, and tighten back to
    // their radius as it slows.
    const speed = Math.hypot(this.width.spring.velocity, this.height.spring.velocity)
    const round = Math.min(width, height) / 2
    const resting = Math.max(0, this.radius.current) * bounce
    const radius = Math.min(round, resting + Math.max(0, round - resting) * clamp(speed / ROUNDING_SPEED, 0, 0.75))

    const [dx, dy] = this.direction
    return {
      bounce,
      conceal: this.conceal,
      height,
      radius,
      reveal: this.revealed,
      width,
      x: (dx * width) / 2,
      y: (dy * height) / 2,
    }
  }

  private get conceal(): number {
    if (this.concealFrom <= 0) return 0
    return this.concealFrom * (1 - smoothstep((this.clock - this.swappedAt) / CONCEAL))
  }

  /** Hands every axis whose turn has come its target. */
  private applyDue(): void {
    for (const axis of [this.width, this.height]) {
      if (axis.pending === null || this.clock < axis.dueAt) continue
      axis.spring.setTarget(axis.pending)
      axis.pending = null
      axis.dueAt = Number.POSITIVE_INFINITY
    }
  }

  private land(): void {
    const landing = this.landing
    this.landing = null
    if (this.bounceOnLanding) {
      this.bounceOnLanding = false
      this.pop.velocity += 4.6
    }
    if (!landing) return
    // A jiggle across the axis that arrived, in proportion to how fast it was
    // going: the glass bulges where it stopped and wobbles back.
    const along = landing.axis === this.width ? this.squashX : this.squashY
    const across = landing.axis === this.width ? this.squashY : this.squashX
    const impact = clamp(Math.abs(landing.axis.spring.velocity) / Math.max(landing.axis.spring.current, 24), 0, 12)
    along.velocity -= impact * 0.09 * landing.side
    across.velocity += impact * 0.12 * landing.side
  }
}
