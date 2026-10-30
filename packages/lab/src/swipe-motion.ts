import { clamp, lerp, SpringValue } from '@liquefy-ui/core'

/** The edge a wave comes in from: the right brings the next page, the left the previous one. */
export type SwipeSide = 'left' | 'right'

export type SwipeSize = {
  height: number
  width: number
}

/**
 * A wave's front, in pixels, measured in from the edge it comes from: a
 * straight line `edge` in, with a bell-shaped bulge standing out of it.
 */
export type WaveShape = {
  /** The height of the bulge's tip, from the top. */
  centerY: number
  /** How far the straight part of the front has come in from the edge. */
  edge: number
  /** How far the bulge's tip stands out past the straight part. Negative dents the front in instead. */
  horRadius: number
  /** Half the bulge's height along the front. */
  vertRadius: number
}

export type WaveShapeOptions = {
  /** Wobble added to the bulge, as a share of the width: what the jelly spring has it at. */
  bulge?: number
  /** The bulge tip's height, from the top. */
  centerY: number
  /** 0 to 1 and a little past while it pops in: how much of the handle at rest is showing. */
  presence?: number
}

/** The handle at rest: how far its bulge stands out, as a share of the width, and the most it ever does. */
const HANDLE_REACH = 0.13
const HANDLE_REACH_RANGE = [30, 52] as const
/** Half the handle's height, as a share of the height, and its limits. */
const HANDLE_HALF = 0.12
const HANDLE_HALF_RANGE = [52, 84] as const

/** The bulge is at its widest and tallest this far in… */
const GROW_UNTIL = 0.42
/** …and the straight part of the front starts in from the edge here. */
const EDGE_FROM = 0.2
/** At its widest the bulge stands out this share of the width… */
const WIDEST = 0.5
/** …and its half-height is this share of the height, so its flanks reach past the top and bottom. */
const TALLEST = 0.9
/** Past full, each unit of progress dents the front in by this many widths… */
const DENT = 1.7
/** …but never by more than this share of the width. */
const MAX_DENT = 0.3
/** Under rest, the handle loses this share of its reach per unit of progress. */
const SQUEEZE = 3

/** How far the curve's first control point runs down the front, as a share of the half-height: longer flanks. */
const FLANK = 0.55
/** How far the second runs back from the tip: a rounder, broader tip. */
const TIP = 0.52

/** The bulge a page's handle shows at rest in a room `size`. */
export const handleSize = (size: SwipeSize): { half: number; reach: number } => ({
  half: clamp(size.height * HANDLE_HALF, ...HANDLE_HALF_RANGE),
  reach: clamp(size.width * HANDLE_REACH, ...HANDLE_REACH_RANGE),
})

const easeOut = (value: number): number => 1 - (1 - value) ** 2

/**
 * The front of a wave `progress` of the way across, after Cuberto's liquid
 * swipe. At 0 it is the page's handle: a small bulge on the edge it peeks in
 * from. As it comes in the bulge swells, tall enough that its flanks run off
 * the top and bottom and wide enough that its tip runs ahead of the front;
 * then the straight part follows it across, and the bulge narrows as it goes,
 * until at 1 the front is a straight line on the far side and the page covers
 * the room. Past 1 the front dents back in — the slosh it lands with — and
 * under 0 the handle squeezes small.
 */
export const waveShape = (progress: number, size: SwipeSize, options: WaveShapeOptions): WaveShape => {
  const { height, width } = size
  const presence = Math.max(0, options.presence ?? 1)
  const handle = handleSize(size)
  const reach = handle.reach * presence
  const half = handle.half * presence
  let edge = 0
  let horRadius: number
  let vertRadius: number
  if (progress < 0) {
    const squeeze = Math.max(0, 1 + progress * SQUEEZE)
    horRadius = reach * squeeze
    vertRadius = half * (0.5 + squeeze * 0.5)
  } else if (progress <= 1) {
    const grown = clamp(progress / GROW_UNTIL, 0, 1)
    edge = width * clamp((progress - EDGE_FROM) / (1 - EDGE_FROM), 0, 1)
    vertRadius = lerp(half, height * TALLEST, easeOut(grown))
    horRadius = progress <= GROW_UNTIL
      ? lerp(reach, width * WIDEST, grown)
      : width * WIDEST * (1 - (progress - GROW_UNTIL) / (1 - GROW_UNTIL))
  } else {
    edge = width
    vertRadius = height * TALLEST
    horRadius = -Math.min(width * MAX_DENT, (progress - 1) * width * DENT)
  }
  horRadius += (options.bulge ?? 0) * width
  return { centerY: options.centerY, edge, horRadius, vertRadius }
}

const n = (value: number): string => {
  const fixed = value.toFixed(2)
  return fixed === '-0.00' ? '0.00' : fixed
}

/**
 * The outline of a wave's page, as a `clip-path: path()` in the room's
 * pixels: the strip between the edge and the front, and the bulge. Each half
 * of the bulge is one cubic that leaves the straight part along it and meets
 * the tip upright, so the front has no corner anywhere. The strip runs a pixel
 * past the room on every side so no edge of it shows.
 *
 * Both sides wind the same way round — the left walks its front upward where
 * the right walks it down — so the two outlines of one page, which a loop of
 * two pages shows on both sides at once, add up where they overlap instead of
 * cancelling out.
 */
export const wavePath = (shape: WaveShape, size: SwipeSize, side: SwipeSide): string => {
  const { centerY, edge, horRadius, vertRadius } = shape
  if (vertRadius <= 0 || (edge <= 0 && horRadius <= 0)) return ''
  const right = side === 'right'
  const x = right ? (inward: number) => size.width - inward : (inward: number) => inward
  const sign = right ? 1 : -1
  const top = Math.min(0, centerY - vertRadius) - 1
  const bottom = Math.max(size.height, centerY + vertRadius) + 1
  const [first, last] = right ? [top, bottom] : [bottom, top]
  const front = x(edge)
  const tip = x(edge + horRadius)
  // Where the bulge leaves the straight part, and where it rejoins it.
  const near = centerY - sign * vertRadius
  const far = centerY + sign * vertRadius
  const flank = sign * vertRadius * FLANK
  const round = sign * vertRadius * TIP
  return [
    `M${n(x(-1))} ${n(first)}`,
    `L${n(front)} ${n(first)}`,
    `L${n(front)} ${n(near)}`,
    `C${n(front)} ${n(near + flank)} ${n(tip)} ${n(centerY - round)} ${n(tip)} ${n(centerY)}`,
    `C${n(tip)} ${n(centerY + round)} ${n(front)} ${n(far - flank)} ${n(front)} ${n(far)}`,
    `L${n(front)} ${n(last)}`,
    `L${n(x(-1))} ${n(last)}`,
    'Z',
  ].join(' ')
}

/** A release at least this fast, in pixels a second, turns the page — or, backward, keeps it — however far it has come. */
export const FLICK_SPEED = 500
/** Let go slowly, the page turns once its wave is this far across: the bulge's tip about halfway. */
export const SWIPE_THRESHOLD = 0.3

/**
 * Whether a wave let go `progress` of the way across at `velocity` (pixels a
 * second, positive onward) turns the page. A flick turns it however little it
 * has come, a flick back keeps it however far, and otherwise it turns once it
 * is past the threshold.
 */
export const chooseSwipe = (progress: number, velocity: number): boolean => {
  if (velocity >= FLICK_SPEED) return true
  if (velocity <= -FLICK_SPEED) return false
  return progress >= SWIPE_THRESHOLD
}

export type WaveFrame = {
  /** Wobble on the bulge, as a share of the width. */
  bulge: number
  /** The bulge tip's height, from the top. */
  centerY: number
  /** How far across: 0 is the handle, 1 a page that covers the room. */
  progress: number
  /** How much of the handle at rest is showing: 0 to 1, a little past while it pops in. */
  presence: number
}

export type WaveMotionOptions = {
  /**
   * False keeps the bulge from wobbling and the handle from popping — the
   * provider's `motion` off. The wave still follows a finger, which is the
   * person's own hand rather than an animation.
   */
  liquid?: boolean
  /** 0 to 1, the provider's `wobbliness`: how far the wave swings past where it lands, and how long the bulge keeps sloshing. */
  wobbliness?: number
}

/** The longest frame the motion will count, in seconds. */
const MAX_FRAME = 1 / 30
/** How much of each frame's measured speed the jelly hears. */
const SMOOTHING = 0.35
/** Bulge per unit of progress a second: a page swept across in a third of a second leads with its tip by about a thirtieth of the width. */
const JELLY_GAIN = 0.01
const JELLY_MAX = 0.04

/** A front this close to where it is heading — a few pixels in a phone-wide room… */
const LANDED_DISTANCE = 0.01
/** …and this slow, in progress a second, has finished sloshing. */
const LANDED_SPEED = 0.15

/** A damping that gives `ratio` of critical damping on a spring of `stiffness` and unit mass. */
const damped = (ratio: number, stiffness: number): number => 2 * ratio * Math.sqrt(stiffness)

/** Puts a spring that has stopped visibly at rest. Returns whether it is. */
const settle = (spring: SpringValue, distance: number, speed: number): boolean => {
  if (Math.abs(spring.current - spring.target) > distance || Math.abs(spring.velocity) > speed) return false
  if (spring.current !== spring.target || spring.velocity !== 0) spring.set(spring.target)
  return true
}

/**
 * The motion behind one wave, with no DOM attached. Its progress is a spring:
 * a finger holds it wherever the finger puts it, and on release it carries
 * the finger's speed toward 0 (back to a handle) or 1 (across), swinging past
 * — under 0 the handle squeezes, past 1 the front dents back in — and settling.
 *
 * Three more springs make it liquid. The jelly hears how fast the front moves
 * and leads with the tip while it races, then sloshes back when it stops; the
 * bulge's height follows a finger up and down a moment behind it; and the
 * handle pops in past its size and settles when it first shows.
 *
 * Like the other lab timelines, `step` counts at most a thirtieth of a second
 * however long the frame took, so a stall slows the motion instead of jumping it.
 */
export class WaveMotion {
  private readonly progress: SpringValue
  private readonly jelly: SpringValue
  private readonly centre: SpringValue
  private readonly presence: SpringValue
  private readonly liquid: boolean
  private holding = false
  private lastProgress: number
  /** The front's speed, smoothed over a few frames, in progress a second. */
  private speed = 0

  public constructor(centerY: number, options: WaveMotionOptions = {}) {
    const wobbliness = clamp(options.wobbliness ?? 0.1, 0, 1)
    this.liquid = options.liquid ?? true
    // At the provider's default the front swings about a tenth past where it
    // lands: across, a dent that closes; back, a handle that squeezes and pops.
    this.progress = new SpringValue(0, { damping: damped(0.58 - wobbliness * 0.3, 190), stiffness: 190 })
    this.jelly = new SpringValue(0, { damping: damped(0.34 - wobbliness * 0.14, 560), stiffness: 560 })
    this.centre = new SpringValue(centerY, { damping: damped(0.8, 520), stiffness: 520 })
    this.presence = new SpringValue(1, { damping: damped(0.42 - wobbliness * 0.16, 300), stiffness: 300 })
    this.lastProgress = 0
  }

  /** How far across the front is. */
  public get current(): number {
    return this.progress.current
  }

  /** Where the front is heading. */
  public get target(): number {
    return this.progress.target
  }

  public get held(): boolean {
    return this.holding
  }

  /** Whether the front has stopped where it was heading and nothing on it still wobbles. */
  public get settled(): boolean {
    return !this.holding && this.atRest()
  }

  /**
   * Whether the front is within a hair of where it is heading and all but
   * stopped: its slosh is over, though the spring's tail has a way to go.
   */
  public get landed(): boolean {
    return !this.holding
      && Math.abs(this.progress.current - this.progress.target) < LANDED_DISTANCE
      && Math.abs(this.progress.velocity) < LANDED_SPEED
  }

  /** Holds the front under a finger: `progress` of the way across, its bulge drawn toward `centerY`. */
  public hold(progress: number, centerY: number): void {
    this.holding = true
    this.progress.set(progress)
    this.aim(centerY, !this.liquid)
  }

  /** Lets go with the finger's `velocity`, in progress a second, heading for `target`. */
  public release(target: number, velocity: number): void {
    this.holding = false
    this.progress.setTarget(target)
    this.progress.velocity = velocity
  }

  /** Heads for `target` with whatever speed the front already has. */
  public moveTo(target: number): void {
    this.holding = false
    this.progress.setTarget(target)
  }

  /** Puts the front at `progress` and stills it, for motion off and for a page that has just turned. */
  public jumpTo(progress: number): void {
    this.holding = false
    this.progress.set(progress)
    this.jelly.set(0)
    this.speed = 0
    this.lastProgress = progress
  }

  /** Draws the bulge's height toward `centerY`; with `jump`, puts it there. */
  public aim(centerY: number, jump = false): void {
    if (jump) this.centre.set(centerY)
    else this.centre.setTarget(centerY)
  }

  /** Shows the handle at rest, or tucks it away. One shown from nothing pops in past its size. */
  public show(shown: boolean, jump = false): void {
    const target = shown ? 1 : 0
    if (jump || !this.liquid) this.presence.set(target)
    else this.presence.setTarget(target)
  }

  /** Advances by one frame of `delta` seconds. Returns whether anything is still moving, or held. */
  public step(delta: number): boolean {
    const seconds = Math.min(Math.max(delta, 0), MAX_FRAME)
    if (seconds === 0) return this.holding || this.speed !== 0 || !this.atRest()

    if (!this.holding) this.progress.step(seconds)
    this.centre.step(seconds)
    this.presence.step(seconds)

    this.speed += ((this.progress.current - this.lastProgress) / seconds - this.speed) * SMOOTHING
    if (Math.abs(this.speed) < 0.002) this.speed = 0
    this.lastProgress = this.progress.current

    // Racing across, the tip leads; when the front stops, the spring carries
    // the bulge past straight and it sloshes.
    this.jelly.setTarget(this.liquid ? clamp(this.speed * JELLY_GAIN, -JELLY_MAX, JELLY_MAX) : 0)
    this.jelly.step(seconds)

    // A spring's tail takes a second or more to vanish, and every frame of it
    // redraws a page. Anything that has stopped visibly is stopped outright.
    if (!this.holding) settle(this.progress, 2e-4, 4e-3)
    settle(this.jelly, 1e-4, 2e-3)
    settle(this.centre, 0.05, 1)
    settle(this.presence, 1e-3, 1e-2)
    return this.holding || this.speed !== 0 || !this.atRest()
  }

  public frame(): WaveFrame {
    return {
      bulge: this.jelly.current,
      centerY: this.centre.current,
      presence: Math.max(0, this.presence.current),
      progress: this.progress.current,
    }
  }

  private atRest(): boolean {
    return [this.progress, this.jelly, this.centre, this.presence]
      .every((spring) => spring.current === spring.target && spring.velocity === 0)
  }
}

const SIDES: readonly SwipeSide[] = ['right', 'left']

const opposite = (side: SwipeSide): SwipeSide => (side === 'right' ? 'left' : 'right')

/** A wave this close to its handle can still be handed another page without anyone seeing the swap. */
const AT_HANDLE = 0.02
/** A page caught by a finger this far across is let in, and the drag starts on the page after it. */
const ALL_BUT_ACROSS = 0.9

export type SwipeDeckOptions = WaveMotionOptions & {
  /** The handles' height at rest, from the top. */
  centerY: number
  count: number
  loop?: boolean
}

/** One side of the deck: the page it brings in, if there is one, and the wave it comes in on. */
export type SwipeWave = {
  motion: WaveMotion
  page: number | null
}

/**
 * The pages of a liquid swipe as a whole, with no DOM attached. One page, the
 * base, covers the room; on each side a wave holds the page that comes in from
 * there — the next on the right, the previous on the left — as a handle at
 * rest.
 *
 * `goTo` sends the wave on the way to a page across and the other side's
 * handle away. Once the page has covered the room and stopped sloshing it
 * becomes the base, and both sides pop in the handles of its neighbours. A
 * page further than one away comes in on the side's wave directly when the
 * wave is at rest; one already on its way finishes first, and the next leaves
 * from there.
 *
 * A finger `grab`s the deck, `drag`s a wave across from either side — the
 * side by which way it has moved from where it started — and `letGo`es with
 * its speed, which turns the page or sends the wave back.
 */
export class SwipeDeck {
  /** The page that covers the room. */
  public base: number
  /** The page the deck is on its way to: the base when it is not going anywhere. */
  public target: number
  public readonly waves: Record<SwipeSide, SwipeWave>
  private count: number
  private loop: boolean
  private rest: number
  /** The side the way to the target was given as, rather than worked out. */
  private direction: SwipeSide | null = null
  private gesture = false
  private holding: SwipeSide | null = null

  public constructor(index: number, options: SwipeDeckOptions) {
    this.count = Math.max(0, Math.floor(options.count))
    this.loop = options.loop ?? false
    this.rest = options.centerY
    this.base = this.clampIndex(index)
    this.target = this.base
    const wave = (side: SwipeSide): SwipeWave => {
      const motion = new WaveMotion(this.rest, options)
      const page = this.neighbour(side)
      motion.show(page !== null, true)
      return { motion, page }
    }
    this.waves = { left: wave('left'), right: wave('right') }
  }

  /** The page next to `from` on `side`, round the end when the deck loops; null when there is none. */
  public neighbour(side: SwipeSide, from = this.base): number | null {
    const next = from + (side === 'right' ? 1 : -1)
    if (next >= 0 && next < this.count) return next
    if (!this.loop || this.count < 2) return null
    return (next + this.count) % this.count
  }

  /** The side the page `index` comes in from: the nearer way round when the deck loops. */
  public towards(index: number): SwipeSide {
    if (!this.loop) return index > this.base ? 'right' : 'left'
    const onward = (index - this.base + this.count) % this.count
    return onward <= this.count - onward ? 'right' : 'left'
  }

  /** The side whose page is furthest across, which draws over the other. */
  public get leading(): SwipeSide {
    return this.waves.left.motion.current > this.waves.right.motion.current ? 'left' : 'right'
  }

  /** New pages or a new loop setting. A handle that now has a page, or has lost one, pops in or tucks away. */
  public configure(count: number, loop: boolean): void {
    const pages = Math.max(0, Math.floor(count))
    if (pages === this.count && loop === this.loop) return
    this.count = pages
    this.loop = loop
    this.base = this.clampIndex(this.base)
    this.target = this.clampIndex(this.target)
    for (const side of SIDES) {
      const wave = this.waves[side]
      if (wave.page !== null && wave.page >= this.count) wave.page = null
      if (this.gesture || wave.motion.current > AT_HANDLE) continue
      wave.page = this.target === this.base ? this.neighbour(side) : wave.page
      wave.motion.show(wave.page !== null)
    }
    this.plan()
  }

  /** Moves the handles' resting height, for a room of a new size. */
  public setRest(centerY: number): void {
    this.rest = centerY
    for (const side of SIDES) {
      const { motion } = this.waves[side]
      if (!motion.held && motion.current === 0 && motion.target === 0) motion.aim(centerY, true)
    }
  }

  /** Heads for page `index`, coming in from `side` or from the nearer one. */
  public goTo(index: number, side?: SwipeSide): void {
    this.target = this.clampIndex(index)
    this.direction = this.target === this.base ? null : side ?? null
    this.plan()
  }

  /**
   * A finger takes hold. A page all but across is let in first; otherwise the
   * wave furthest across is caught where it is. Returns where the drag starts:
   * the caught wave's progress, positive on the right and negative on the left.
   */
  public grab(): number {
    for (const side of SIDES) {
      const wave = this.waves[side]
      if (wave.page !== null && wave.motion.target === 1 && wave.motion.current >= ALL_BUT_ACROSS) this.commit(side)
    }
    this.gesture = true
    const right = this.waves.right.motion.current
    const left = this.waves.left.motion.current
    if (right <= 0 && left <= 0) return 0
    return right >= left ? right : -left
  }

  /**
   * Holds a wave under the finger: `pull` of the way across from the right
   * when positive, from the left when negative, the bulge drawn toward
   * `centerY`. The other side lets its wave go home and tucks its handle away;
   * a side with no page to bring in stays put.
   */
  public drag(pull: number, centerY: number): void {
    let side: SwipeSide | null = pull > 0 ? 'right' : pull < 0 ? 'left' : null
    if (side && this.waves[side].page === null) side = null
    for (const each of SIDES) {
      const wave = this.waves[each]
      if (each === side) {
        wave.motion.hold(Math.min(1, Math.abs(pull)), centerY)
        wave.motion.show(true)
      } else {
        wave.motion.moveTo(0)
        wave.motion.show(side === null && wave.page !== null)
      }
    }
    this.holding = side
  }

  /**
   * The finger lets go at `velocity`, in pixels a second toward where the held
   * wave is going, in a room `width` pixels wide. Returns the page the deck is
   * now heading for.
   */
  public letGo(velocity: number, width: number): number {
    this.gesture = false
    const side = this.holding
    this.holding = null
    if (side === null) {
      this.goTo(this.base)
      return this.target
    }
    const wave = this.waves[side]
    const turn = chooseSwipe(wave.motion.current, velocity)
    wave.motion.release(turn ? 1 : 0, velocity / Math.max(1, width))
    if (!turn) wave.motion.aim(this.rest)
    this.target = turn ? wave.page! : this.base
    this.direction = turn ? side : null
    this.plan()
    return this.target
  }

  /** Lands on the target at once, with every handle in place: motion off. */
  public finish(): void {
    if (this.gesture) return
    this.base = this.target
    this.direction = null
    for (const side of SIDES) {
      const wave = this.waves[side]
      wave.page = this.neighbour(side)
      wave.motion.jumpTo(0)
      wave.motion.aim(this.rest, true)
      wave.motion.show(wave.page !== null, true)
    }
  }

  /**
   * Advances by one frame of `delta` seconds. A page that has come all the
   * way across and finished sloshing becomes the base — or, when the deck is
   * going on past it, as soon as it covers the room. Returns whether anything is still
   * moving, or held.
   */
  public step(delta: number): boolean {
    let busy = false
    for (const side of SIDES) busy = this.waves[side].motion.step(delta) || busy
    for (const side of SIDES) {
      const { motion, page } = this.waves[side]
      if (page === null || motion.held || motion.target !== 1) continue
      if (motion.landed || (motion.current >= 1 && page !== this.target)) {
        this.commit(side)
        return true
      }
    }
    // A wave back home with a page that is no longer its neighbour — one
    // that was on its way somewhere else — swaps it, and its handle pops in again.
    if (!this.gesture && this.target === this.base) {
      for (const side of SIDES) {
        const wave = this.waves[side]
        const page = this.neighbour(side)
        if (wave.page === page || !wave.motion.settled || wave.motion.current !== 0) continue
        wave.page = page
        wave.motion.show(false, true)
        wave.motion.show(page !== null)
        busy = true
      }
    }
    return busy
  }

  private commit(side: SwipeSide): void {
    this.base = this.waves[side].page!
    if (this.base === this.target) this.direction = null
    for (const each of SIDES) {
      const wave = this.waves[each]
      wave.page = this.neighbour(each)
      wave.motion.jumpTo(0)
      wave.motion.aim(this.rest, true)
      wave.motion.show(false, true)
    }
    this.plan()
  }

  /** Points both waves at where the target says they should be. */
  private plan(): void {
    if (this.gesture) return
    if (this.target === this.base) {
      for (const side of SIDES) {
        const wave = this.waves[side]
        wave.motion.moveTo(0)
        if (wave.motion.current <= AT_HANDLE) wave.page = this.neighbour(side)
        wave.motion.show(wave.page !== null)
      }
      return
    }
    const side = this.direction ?? this.towards(this.target)
    const wave = this.waves[side]
    if (wave.page !== this.target && wave.motion.current <= AT_HANDLE) wave.page = this.target
    wave.motion.show(true)
    wave.motion.moveTo(1)
    const other = this.waves[opposite(side)]
    other.motion.moveTo(0)
    other.motion.show(false)
  }

  private clampIndex(index: number): number {
    if (this.count === 0) return 0
    return clamp(Math.round(Number.isFinite(index) ? index : 0), 0, this.count - 1)
  }
}
