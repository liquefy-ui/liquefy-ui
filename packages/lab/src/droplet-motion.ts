import { clamp, SpringValue } from '@liquefy-ui/core'

/** Where the droplets settle, named for the side of the trigger they land on. */
export type DropletPlacement =
  | 'around'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type DropletPoint = { x: number; y: number }

/**
 * Arcs in screen degrees: 0 points right and the angle grows clockwise, because
 * y grows downward. Every arc is listed in clockwise order so the first droplet
 * out is always the one a reader would call first.
 */
const ARCS: Record<Exclude<DropletPlacement, 'around'>, readonly [number, number]> = {
  bottom: [0, 180],
  'bottom-left': [90, 180],
  'bottom-right': [0, 90],
  left: [90, 270],
  right: [-90, 90],
  top: [180, 360],
  'top-left': [180, 270],
  'top-right': [270, 360],
}

/** Clear space between two neighbouring droplets, and between a droplet and the trigger. */
const GAP = 14

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** The angle of each droplet, in screen degrees. */
export const dropletAngles = (count: number, placement: DropletPlacement): number[] => {
  if (count <= 0) return []
  // A full ring starts at twelve o'clock and spaces the droplets evenly, so
  // the last one does not land on top of the first.
  if (placement === 'around') return Array.from({ length: count }, (_, index) => -90 + (360 * index) / count)

  const [from, to] = ARCS[placement]
  if (count === 1) return [(from + to) / 2]
  return Array.from({ length: count }, (_, index) => from + ((to - from) * index) / (count - 1))
}

/**
 * The smallest radius at which neither neighbouring droplets nor a droplet and
 * the trigger overlap. Two neighbours sit a chord apart, so the radius is the
 * one whose chord over the angular step fits a droplet and a gap.
 */
export const dropletRadius = (
  count: number,
  placement: DropletPlacement,
  dropletSize: number,
  triggerSize: number,
): number => {
  const clearOfTrigger = triggerSize / 2 + dropletSize / 2 + GAP
  if (count <= 1) return clearOfTrigger

  const angles = dropletAngles(count, placement)
  const step = toRadians(Math.abs((angles[1] ?? 0) - (angles[0] ?? 0)))
  const clearOfNeighbours = (dropletSize + GAP) / (2 * Math.sin(step / 2))
  return Math.ceil(Math.max(clearOfTrigger, clearOfNeighbours))
}

/** Each droplet's resting place relative to the trigger's centre. */
export const dropletOffsets = (count: number, placement: DropletPlacement, radius: number): DropletPoint[] =>
  dropletAngles(count, placement).map((angle) => ({
    // Rounded so a droplet at three o'clock rests on a whole pixel rather
    // than at 6.1e-15 below it, which blurs the icon inside.
    x: Math.round(Math.cos(toRadians(angle)) * radius * 100) / 100,
    y: Math.round(Math.sin(toRadians(angle)) * radius * 100) / 100,
  }))

export type DropletFrame = {
  /** Direction of travel in degrees, which the stretch is laid along. */
  angle: number
  /** Overall size, 0 while the droplet is still inside the trigger. */
  scale: number
  /** Elongation along the direction of travel; the cross axis gives it back. */
  stretch: number
  x: number
  y: number
}

export type TriggerFrame = { scaleX: number; scaleY: number }

export type DropletChoreographyOptions = {
  /** Milliseconds between one droplet leaving and the next. */
  stagger?: number
  /** 0 to 1, the provider's `wobbliness`: how long a droplet keeps jiggling once it lands. */
  wobbliness?: number
}

type Droplet = {
  /** When this droplet is due to leave (or come home), on the timeline's own clock. */
  dueAt: number
  /** The direction it was last scheduled to travel, so a droplet leaves only once per open. */
  heading: 'in' | 'out'
  /** How far out it was when it was called home, which its shrinking is measured against. */
  reach: number
  recalling: boolean
  scale: SpringValue
  x: SpringValue
  y: SpringValue
}

/** A droplet smaller than this is home: it is drawn at zero and cannot be hit. */
const ABSORBED = 0.04

/** Size a droplet is born at, as a bud on the trigger's rim rather than a dot. */
const BUD = 0.32

/** The longest frame the stagger clock will count, in seconds. */
const MAX_FRAME = 1 / 30

/**
 * The timeline behind a droplet menu: droplets leave the trigger one at a time,
 * stretch along the way they are travelling, overshoot their place and jiggle
 * to rest, and come home one at a time in reverse.
 *
 * It touches no DOM. `step` is handed each frame's delta and the renderer reads
 * `droplet(i)` and `trigger()` back out, which is what lets the whole sequence be
 * asserted in a unit test.
 *
 * The stagger runs on a clock of its own that only moves when a frame is
 * stepped, rather than on the wall clock. Mounting a handful of glass surfaces
 * at once can hold the main thread for half a second, and on the wall clock
 * every droplet would come out of that stall overdue and leave in the same
 * frame — the one thing this component exists not to do.
 */
export class DropletChoreography {
  /** Milliseconds of animation stepped so far. */
  private clock = 0
  private droplets: Droplet[] = []
  private offsets: DropletPoint[] = []
  private readonly stagger: number
  private readonly squashX: SpringValue
  private readonly squashY: SpringValue
  private readonly damping: number

  public constructor(count: number, options: DropletChoreographyOptions = {}) {
    this.stagger = Math.max(0, options.stagger ?? 120)
    // Looser than the button family's jelly on purpose: the overshoot on
    // landing is the effect, so even at the provider's default the droplet
    // swings past its place once and back before it settles.
    this.damping = 17 - clamp(options.wobbliness ?? 0.1, 0, 1) * 8
    this.squashX = new SpringValue(1, { damping: 11, mass: 1, stiffness: 420 })
    this.squashY = new SpringValue(1, { damping: 11, mass: 1, stiffness: 420 })
    this.resize(count)
  }

  /** Adds or drops droplets to match the item count, keeping the ones already in flight. */
  public resize(count: number): void {
    while (this.droplets.length < count) {
      this.droplets.push({
        dueAt: Number.POSITIVE_INFINITY,
        heading: 'in',
        reach: 0,
        recalling: false,
        // Lands about 15% oversize and settles back: plump, not a balloon.
        scale: new SpringValue(0, { damping: this.damping, mass: 0.8, stiffness: 430 }),
        x: new SpringValue(0, { damping: this.damping, mass: 1, stiffness: 250 }),
        y: new SpringValue(0, { damping: this.damping, mass: 1, stiffness: 250 }),
      })
    }
    this.droplets.length = count
  }

  public get count(): number {
    return this.droplets.length
  }

  /** Sends the droplets out, first to last, from the next frame. */
  public open(offsets: DropletPoint[]): void {
    const now = this.clock
    this.offsets = offsets
    let slot = 0
    this.droplets.forEach((droplet) => {
      if (droplet.heading === 'out') return
      droplet.heading = 'out'
      // One still on its way home is turned round where it is; one already
      // home queues for its turn to bud off again.
      droplet.dueAt = droplet.scale.current > ABSORBED ? now : now + slot++ * this.stagger
    })
  }

  /** Moves the resting places without replaying the launch, for a resize or a new placement. */
  public retarget(offsets: DropletPoint[]): void {
    this.offsets = offsets
  }

  /** Calls the droplets home, last to first, from the next frame. */
  public close(): void {
    const now = this.clock
    let slot = 0
    for (let index = this.droplets.length - 1; index >= 0; index -= 1) {
      const droplet = this.droplets[index]
      if (!droplet || droplet.heading === 'in') continue
      droplet.heading = 'in'
      // One that never got to leave simply stays put.
      droplet.dueAt = now >= droplet.dueAt ? now + slot++ * this.stagger : Number.POSITIVE_INFINITY
    }
  }

  /** Puts every droplet where it is headed with no motion, for reduced motion and for tests. */
  public settle(): void {
    this.droplets.forEach((droplet, index) => {
      const out = droplet.heading === 'out'
      const target = this.offsets[index] ?? { x: 0, y: 0 }
      droplet.x.set(out ? target.x : 0)
      droplet.y.set(out ? target.y : 0)
      droplet.scale.set(out ? 1 : 0)
      droplet.recalling = !out
      droplet.dueAt = out ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    })
    this.squashX.set(1)
    this.squashY.set(1)
  }

  /**
   * Advances the timeline by one frame of `delta` seconds. Returns whether
   * anything is still moving or still waiting for its turn.
   */
  public step(delta: number): boolean {
    // A long frame counts as a short one, so a stall slows the sequence down
    // instead of skipping a droplet's turn.
    this.clock += Math.min(Math.max(delta, 0), MAX_FRAME) * 1000
    const now = this.clock
    let busy = false

    this.droplets.forEach((droplet, index) => {
      const due = now >= droplet.dueAt
      if (droplet.heading === 'out') {
        if (!due) {
          busy = true
          return
        }
        if (droplet.recalling || droplet.scale.target !== 1) this.launch(droplet)
        const target = this.offsets[index] ?? { x: 0, y: 0 }
        droplet.x.setTarget(target.x)
        droplet.y.setTarget(target.y)
      } else if (due) {
        if (!droplet.recalling) this.recall(droplet)
        // It shrinks with the distance still to go, so it is a bud again by
        // the time it reaches the trigger instead of vanishing on the way.
        const home = Math.hypot(droplet.x.current, droplet.y.current)
        droplet.scale.setTarget(home < droplet.reach * 0.2 ? 0 : BUD + (1 - BUD) * clamp(home / droplet.reach, 0, 1))
      } else if (droplet.dueAt !== Number.POSITIVE_INFINITY) {
        busy = true
      }

      // The springs run every frame even when settled: `step` is cheap and
      // short-circuits, and it keeps a droplet turned round mid-flight
      // carrying the velocity it had.
      if (droplet.x.step(delta)) busy = true
      if (droplet.y.step(delta)) busy = true
      if (droplet.scale.step(delta)) busy = true

      // Home: snapped to rest so an underdamped spring does not bring a
      // sliver of it back out through the trigger.
      if (droplet.recalling && droplet.scale.target === 0 && droplet.scale.current <= ABSORBED) {
        droplet.scale.set(0)
        droplet.x.set(0)
        droplet.y.set(0)
      }
    })

    if (this.squashX.step(delta)) busy = true
    if (this.squashY.step(delta)) busy = true
    return busy
  }

  /** True once every droplet is home, which is when the popup may unmount. */
  public get absorbed(): boolean {
    return this.droplets.every((droplet) => droplet.heading === 'in' && droplet.scale.current <= ABSORBED)
  }

  public droplet(index: number): DropletFrame {
    const droplet = this.droplets[index]
    if (!droplet) return { angle: 0, scale: 0, stretch: 1, x: 0, y: 0 }

    const velocityX = droplet.x.velocity
    const velocityY = droplet.y.velocity
    const speed = Math.hypot(velocityX, velocityY)
    const scale = droplet.scale.current <= ABSORBED && droplet.scale.target === 0
      ? 0
      : Math.max(0, droplet.scale.current)
    return {
      angle: speed > 1 ? (Math.atan2(velocityY, velocityX) * 180) / Math.PI : 0,
      scale,
      // A droplet at full tilt is about a third longer than it is wide, which
      // is the most it can stretch before it reads as a capsule.
      stretch: 1 + Math.min(speed / 2600, 0.34),
      x: droplet.x.current,
      y: droplet.y.current,
    }
  }

  public trigger(): TriggerFrame {
    return { scaleX: this.squashX.current, scaleY: this.squashY.current }
  }

  private launch(droplet: Droplet): void {
    // Born as a bud at the centre rather than at zero, so it reads as
    // something pinched off the trigger rather than something appearing.
    if (droplet.scale.current <= ABSORBED) {
      droplet.scale.set(BUD)
      droplet.x.set(0)
      droplet.y.set(0)
    }
    droplet.recalling = false
    droplet.scale.setTarget(1)
    // The trigger gives as each droplet leaves: it flattens and widens for a
    // moment, which is what makes the droplets read as pushed out one by one.
    this.squashX.velocity += 2.1
    this.squashY.velocity -= 2.6
  }

  private recall(droplet: Droplet): void {
    droplet.recalling = true
    droplet.reach = Math.max(1, Math.hypot(droplet.x.current, droplet.y.current))
    droplet.x.setTarget(0)
    droplet.y.setTarget(0)
    // A small gulp as it is taken back in.
    this.squashX.velocity -= 1
    this.squashY.velocity += 1.3
  }
}
