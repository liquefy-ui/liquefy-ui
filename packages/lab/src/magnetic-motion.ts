import { clamp, elasticPull, SpringValue, type GlassMergeShape } from '@liquefy-ui/core'

/** Which way a row of buttons runs. */
export type MagneticOrientation = 'horizontal' | 'vertical'

export type MagneticPoint = { x: number; y: number }

/**
 * A button where it rests: its centre, and its size, in the row's own pixels.
 * Nothing about it has to be a circle or match its neighbours, so a dock of
 * different-sized things can be described the same way.
 */
export type MagneticRest = { height: number; width: number; x: number; y: number }

export type MagneticPullOptions = {
  /** Pixels beyond a button's edge at which the pointer is first felt. */
  reach?: number
  /** 0 to 1: how hard the buttons are drawn toward the pointer. 0 holds them still. */
  strength?: number
}

export type MagneticMotionOptions = {
  /** 0 to 1, the provider's `wobbliness`: how long a button keeps swinging once let go. */
  wobbliness?: number
}

export type MagneticFrame = {
  /** Direction of `stretch`, in degrees clockwise from the x axis. */
  angle: number
  /** A press's squash on each axis: wider and flatter while held. 1 is none. */
  scaleX: number
  scaleY: number
  /** Longer by this factor along `angle` and shorter across it, from leaning and from moving. 1 is none. */
  stretch: number
  /** How far the button is drawn from where it rests. */
  x: number
  y: number
}

export const MAGNETIC_DEFAULTS = { reach: 120, strength: 0.6 } as const

/**
 * `elasticPull` is the lean every liquefy-ui surface has toward a nearing
 * pointer: about a fifth of the way to it. A magnet goes further — twice that,
 * so the nearest button at full strength follows a cursor on it nearly half the
 * way.
 */
const MAGNET = 2

/**
 * How quickly the pull falls away from the nearest button to the others, as a
 * share of its size: a button this much further from the pointer than the
 * nearest is drawn a third (1/e) as hard. Its immediate neighbours in a row get
 * roughly that much, which is enough to close the gap on the nearest and let
 * the glass melt them together, and the ones beyond next to nothing.
 */
const NEIGHBOUR = 0.85

/**
 * The furthest a button travels, as a share of its size. The pull eases into
 * it rather than stopping at it, so a large reach on a strong magnet still
 * leaves the button in reach of its own place.
 */
const MAX_TRAVEL = 0.32

/** A button's lean toward the pointer stretches it along the pull by up to this much. */
const MAX_LEAN = 0.16

/** The longest frame the springs will count, in seconds, so a stalled frame slows the motion instead of jumping it. */
const MAX_FRAME = 1 / 30

/**
 * The squash of a press and the jelly it is let go with, from
 * `attachLiquidMotion`, at `LiquidIconButton`'s bounce: a button here gives
 * under a finger exactly as the icon buttons do everywhere else.
 */
const BOUNCE = 0.085

const AT_REST: MagneticPoint = { x: 0, y: 0 }

/** Gap from the pointer to a button's edge, 0 on it. */
const edgeGap = (rest: MagneticRest, pointer: MagneticPoint): number => Math.hypot(
  Math.max(0, Math.abs(pointer.x - rest.x) - rest.width / 2),
  Math.max(0, Math.abs(pointer.y - rest.y) - rest.height / 2),
)

/** A resting box in the shape `elasticPull` takes. It only reads the edges, so no DOM is needed. */
const restingBounds = ({ height, width, x, y }: MagneticRest): DOMRect => {
  const left = x - width / 2
  const top = y - height / 2
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({ height, left, top, width }),
    top,
    width,
    x: left,
    y: top,
  }
}

/**
 * Where each of `count` buttons of `size` rests in a row `gap` apart, measured
 * from the row's top-left corner — as a flex row with that gap lays them out.
 */
export const magneticLayout = (
  count: number,
  size: number,
  gap: number,
  orientation: MagneticOrientation = 'horizontal',
): MagneticRest[] => Array.from({ length: Math.max(0, count) }, (_, index) => {
  const along = size / 2 + index * (size + gap)
  return orientation === 'vertical'
    ? { height: size, width: size, x: size / 2, y: along }
    : { height: size, width: size, x: along, y: size / 2 }
})

/**
 * How far each button is drawn toward a pointer at `pointer` (in the row's
 * pixels): where it should be, relative to where it rests.
 *
 * The button nearest the pointer — measured from its edge, so the one under
 * the pointer always counts as nearest — is drawn the full `elasticPull` lean,
 * doubled into a magnet. The others are drawn toward the pointer too, each by
 * a share that falls off with how much further away it is than the nearest, so
 * a row gathers round the pointer: neighbours close in on the nearest button,
 * the far end barely stirs, and a pointer between two buttons draws them both
 * nearly as hard and pulls them into one. Beyond `reach` of the nearest
 * button's edge nothing moves. `pullable` leaves out buttons that should not
 * respond, such as disabled ones.
 */
export const magneticPull = (
  rests: readonly MagneticRest[],
  pointer: MagneticPoint | null,
  options: MagneticPullOptions = {},
  pullable: (index: number) => boolean = () => true,
): MagneticPoint[] => {
  const strength = clamp(options.strength ?? MAGNETIC_DEFAULTS.strength, 0, 1)
  const reach = Math.max(1, options.reach ?? MAGNETIC_DEFAULTS.reach)
  const still = rests.map(() => ({ ...AT_REST }))
  if (!pointer || strength === 0) return still

  const gaps = rests.map((rest) => edgeGap(rest, pointer))
  let nearest = -1
  let nearestGap = Number.POSITIVE_INFINITY
  let nearestDistance = Number.POSITIVE_INFINITY
  rests.forEach((rest, index) => {
    if (!pullable(index)) return
    const gap = gaps[index] ?? Number.POSITIVE_INFINITY
    const distance = Math.hypot(pointer.x - rest.x, pointer.y - rest.y)
    // Equally near by their edges — on the pointer, say — the closer centre wins.
    if (gap < nearestGap || (gap === nearestGap && distance < nearestDistance)) {
      nearest = index
      nearestGap = gap
      nearestDistance = distance
    }
  })
  const anchor = rests[nearest]
  if (!anchor || nearestGap >= reach) return still

  const falloff = NEIGHBOUR * Math.min(anchor.width, anchor.height)
  return rests.map((rest, index) => {
    if (!pullable(index)) return { ...AT_REST }
    const pull = elasticPull(restingBounds(rest), pointer.x, pointer.y, { elasticity: strength, reach })
    const share = Math.exp(-((gaps[index] ?? 0) - nearestGap) / falloff)
    const x = pull.offsetX * MAGNET * share
    const y = pull.offsetY * MAGNET * share
    const distance = Math.hypot(x, y)
    if (distance < 1e-6) return { ...AT_REST }
    // Eased into the cap rather than clipped at it, so a button nearing its
    // limit slows down instead of stopping dead.
    const cap = Math.min(rest.width, rest.height) * MAX_TRAVEL
    const eased = cap * Math.tanh(distance / cap)
    return { x: (x / distance) * eased + 0, y: (y / distance) * eased + 0 }
  })
}

type Button = {
  /** Whether a press is being held, so a release without one does not kick. */
  pressed: boolean
  pullX: SpringValue
  pullY: SpringValue
  rest: MagneticRest
  scaleX: SpringValue
  scaleY: SpringValue
}

/**
 * The motion behind a row of magnetic buttons, with no DOM attached: each
 * button's pull toward the pointer (`attract`), the squash of a press and the
 * jelly it is let go with (`press`, `release`), stepped a frame at a time.
 *
 * The pull is held in underdamped springs rather than applied straight from
 * the pointer, so a button follows a moving cursor a little behind and swings
 * past where it is going, and when the pointer goes it springs back past its
 * place and back before it rests — the same set-jelly feel as every other
 * liquefy-ui surface, at the provider's `wobbliness`.
 *
 * `frame(i)` says where a button is drawn and `shape(i)` turns that into the
 * `GlassMergeShape` that draws it, in the row's pixels. The renderer reads them
 * back after each `step`, which is what lets all of it be asserted in a unit
 * test and lets anything else with a row of glass — a dock — drive its own.
 */
export class MagneticMotion {
  private buttons: Button[] = []
  private readonly pullDamping: number
  private readonly jellyDamping: number
  private readonly wobbliness: number

  public constructor(rests: readonly MagneticRest[], options: MagneticMotionOptions = {}) {
    this.wobbliness = clamp(options.wobbliness ?? 0.1, 0, 1)
    // Looser than a press's jelly: the swing back past its place when the
    // pointer lets go is the effect.
    this.pullDamping = 12 - this.wobbliness * 6
    // As `attachLiquidMotion` damps a press's jelly.
    this.jellyDamping = 26 - this.wobbliness * 16.5
    this.place(rests)
  }

  public get count(): number {
    return this.buttons.length
  }

  /**
   * Moves the buttons' resting places — a new count, size, gap or orientation
   * — keeping the motion of the ones that stay. Their pull is aimed afresh at
   * the next `attract`.
   */
  public place(rests: readonly MagneticRest[]): void {
    while (this.buttons.length < rests.length) {
      this.buttons.push({
        pressed: false,
        pullX: new SpringValue(0, { damping: this.pullDamping, mass: 0.7, stiffness: 300 }),
        pullY: new SpringValue(0, { damping: this.pullDamping, mass: 0.7, stiffness: 300 }),
        rest: { height: 0, width: 0, x: 0, y: 0 },
        scaleX: new SpringValue(1, { damping: this.jellyDamping, mass: 0.9, stiffness: 330 }),
        scaleY: new SpringValue(1, { damping: this.jellyDamping, mass: 0.9, stiffness: 330 }),
      })
    }
    this.buttons.length = rests.length
    this.buttons.forEach((button, index) => {
      button.rest = { ...(rests[index] ?? button.rest) }
    })
  }

  /**
   * Draws the buttons toward a pointer at `pointer` (in the row's pixels) by
   * `magneticPull`, or lets them all spring home when it is `null`.
   */
  public attract(
    pointer: MagneticPoint | null,
    options: MagneticPullOptions = {},
    pullable: (index: number) => boolean = () => true,
  ): void {
    const targets = magneticPull(this.buttons.map((button) => button.rest), pointer, options, pullable)
    this.buttons.forEach((button, index) => {
      const target = targets[index] ?? AT_REST
      button.pullX.setTarget(target.x)
      button.pullY.setTarget(target.y)
    })
  }

  /** Squashes the button at `index` the way a press squashes a liquefy-ui button: wider and flatter. */
  public press(index: number): void {
    const button = this.buttons[index]
    if (!button) return
    button.pressed = true
    button.scaleX.setTarget(1 + BOUNCE * 0.55)
    button.scaleY.setTarget(1 - BOUNCE * 1.15)
  }

  /**
   * Lets a press go. With `kick` (a press let go, rather than one the browser
   * cancelled) the button springs back up past round and jiggles to rest — the
   * pull-back of every liquefy-ui button. A button that was not pressed has
   * nothing to let go of.
   */
  public release(index: number, kick = true): void {
    const button = this.buttons[index]
    if (!button?.pressed) return
    button.pressed = false
    button.scaleX.setTarget(1)
    button.scaleY.setTarget(1)
    if (!kick) return
    button.scaleY.velocity = clamp(button.scaleY.velocity + BOUNCE * (9 + this.wobbliness * 13), -4, 4)
    button.scaleX.velocity = clamp(button.scaleX.velocity - BOUNCE * (5 + this.wobbliness * 7), -4, 4)
  }

  /** Puts every button where it is headed with no motion, for motion off and for tests. */
  public settle(): void {
    for (const button of this.buttons) {
      button.pullX.set(button.pullX.target)
      button.pullY.set(button.pullY.target)
      button.scaleX.set(button.scaleX.target)
      button.scaleY.set(button.scaleY.target)
    }
  }

  /** Advances the motion by one frame of `delta` seconds. Returns whether anything is still moving. */
  public step(delta: number): boolean {
    const frame = Math.min(Math.max(delta, 0), MAX_FRAME)
    let busy = false
    for (const button of this.buttons) {
      for (const spring of [button.pullX, button.pullY, button.scaleX, button.scaleY]) {
        if (spring.step(frame)) busy = true
      }
    }
    return busy
  }

  public frame(index: number): MagneticFrame {
    const button = this.buttons[index]
    if (!button) return { angle: 0, scaleX: 1, scaleY: 1, stretch: 1, x: 0, y: 0 }

    const x = button.pullX.current
    const y = button.pullY.current
    const size = Math.max(1, Math.min(button.rest.width, button.rest.height))
    // Leaning toward the pointer, a button also reaches for it: longer along
    // the pull, by up to a sixth at the most it travels.
    const lean = Math.min(Math.hypot(x, y) / (size * MAX_TRAVEL), 1) * MAX_LEAN
    // Moving, it stretches along the way it is going, as a droplet does.
    const velocityX = button.pullX.velocity
    const velocityY = button.pullY.velocity
    const travel = Math.min(Math.hypot(velocityX, velocityY) / (size * 30), 0.2)
    // Stretches are axes rather than arrows — leaning left and swinging right
    // stretch it the same way — so the two add on doubled angles.
    const leanAngle = Math.atan2(y, x)
    const travelAngle = Math.atan2(velocityY, velocityX)
    const axisX = lean * Math.cos(2 * leanAngle) + travel * Math.cos(2 * travelAngle)
    const axisY = lean * Math.sin(2 * leanAngle) + travel * Math.sin(2 * travelAngle)
    const stretch = Math.hypot(axisX, axisY)
    return {
      angle: stretch < 1e-4 ? 0 : (Math.atan2(axisY, axisX) * 90) / Math.PI,
      scaleX: button.scaleX.current,
      scaleY: button.scaleY.current,
      stretch: 1 + Math.min(stretch, 0.3),
      x,
      y,
    }
  }

  /**
   * The button at `index` as the glass draws it, in the row's pixels: moved by
   * its pull, squashed by a press, and stretched along `angle`. The corners are
   * those of a pill, so a round button stays round and a wide one a capsule.
   */
  public shape(index: number): GlassMergeShape {
    const button = this.buttons[index]
    if (!button) return { height: 0, radius: 0, width: 0, x: 0, y: 0 }
    const frame = this.frame(index)
    const width = button.rest.width * Math.max(frame.scaleX, 0.01)
    const height = button.rest.height * Math.max(frame.scaleY, 0.01)
    return {
      angle: frame.angle,
      height,
      radius: Math.min(width, height) / 2,
      stretch: frame.stretch,
      width,
      x: button.rest.x + frame.x,
      y: button.rest.y + frame.y,
    }
  }
}
