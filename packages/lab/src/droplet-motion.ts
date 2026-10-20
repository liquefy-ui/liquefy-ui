import { clamp, elasticPull, SpringValue } from '@liquefy-ui/core'

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

/**
 * The shape the droplets make on their side: `arc` spreads them over it, `line`
 * stacks them in a straight line out of it — a column above or below the
 * trigger, a row to either side, or a diagonal from a corner.
 */
export type DropletLayout = 'arc' | 'line'

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

/** Rounded to whole hundredths of a pixel, and never -0. */
const hundredths = (value: number): number => Math.round(value * 100) / 100 + 0

/** The way a line runs out of the trigger: through the middle of its side's arc, and upward for `around`, which has no side. */
const lineAngle = (placement: DropletPlacement): number => {
  if (placement === 'around') return 270
  const [from, to] = ARCS[placement]
  return (from + to) / 2
}

/** The angle of each droplet on an arc, in screen degrees. */
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
 * the trigger overlap. Two neighbours on an arc sit a chord apart, so the
 * radius is the one whose chord over the angular step fits a droplet and a
 * gap. A line spaces its droplets by the radius, so there it is the larger of
 * clearing the trigger and clearing a neighbour.
 */
export const dropletRadius = (
  count: number,
  placement: DropletPlacement,
  dropletSize: number,
  triggerSize: number,
  layout: DropletLayout = 'arc',
): number => {
  const clearOfTrigger = triggerSize / 2 + dropletSize / 2 + GAP
  if (layout === 'line') return Math.ceil(Math.max(clearOfTrigger, dropletSize + GAP))
  if (count <= 1) return clearOfTrigger

  const angles = dropletAngles(count, placement)
  const step = toRadians(Math.abs((angles[1] ?? 0) - (angles[0] ?? 0)))
  const clearOfNeighbours = (dropletSize + GAP) / (2 * Math.sin(step / 2))
  return Math.ceil(Math.max(clearOfTrigger, clearOfNeighbours))
}

/**
 * Each droplet's resting place relative to the trigger's centre.
 *
 * On a line the droplets are `radius` apart, the nearest `radius` from the
 * trigger's centre, and they read like any list: top to bottom, then left to
 * right. A line running up or to the left therefore starts at its far end, so
 * the first item is the top of a column above the trigger, and the arrow keys
 * walk down it the way it looks.
 */
export const dropletOffsets = (
  count: number,
  placement: DropletPlacement,
  radius: number,
  layout: DropletLayout = 'arc',
): DropletPoint[] => {
  if (layout === 'line') {
    const angle = toRadians(lineAngle(placement))
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const fromFarEnd = dy < -1e-6 || (Math.abs(dy) <= 1e-6 && dx < 0)
    return Array.from({ length: count }, (_, index) => {
      const slot = fromFarEnd ? count - index : index + 1
      return { x: hundredths(dx * radius * slot), y: hundredths(dy * radius * slot) }
    })
  }
  return dropletAngles(count, placement).map((angle) => ({
    // Rounded so a droplet at three o'clock rests on a whole pixel rather
    // than at 6.1e-15 below it, which blurs the icon inside.
    x: hundredths(Math.cos(toRadians(angle)) * radius),
    y: hundredths(Math.sin(toRadians(angle)) * radius),
  }))
}

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
  /** How far it is drawn toward the pointer, on top of where it is travelling. */
  pullX: SpringValue
  pullY: SpringValue
  /** How far out it was when it was called home, which its shrinking is measured against. */
  reach: number
  recalling: boolean
  scale: SpringValue
  /** Size on top of `scale`: up a little while highlighted, a big bounce when chosen. */
  swell: SpringValue
  x: SpringValue
  y: SpringValue
}

const ORIGIN: DropletPoint = { x: 0, y: 0 }

/** A droplet smaller than this is home: it is drawn at zero and cannot be hit. */
const ABSORBED = 0.04

/** Size a droplet is born at, as a bud on the trigger's rim rather than a dot. */
const BUD = 0.32

/** The longest frame the stagger clock will count, in seconds. */
const MAX_FRAME = 1 / 30

/** A highlighted droplet swells by this much, enough to read as picked out without crowding its neighbours. */
const HIGHLIGHT = 1.12

/** The kick a chosen droplet's size gets: it bounces to about a third bigger and back. */
const CHOICE_KICK = 10

/** Milliseconds a chosen droplet bounces for before the choice is acted on — the bounce up, and most of the way back. */
const CHOICE_MS = 240

/**
 * The magnet is `elasticPull`, the lean every liquefy-ui surface has toward a
 * nearing pointer, at full elasticity. A droplet is smaller and lighter than
 * a button, so it is drawn further — up to about a sixth of its size, at its
 * rim — and only by a pointer within half its size of its edge. That keeps a
 * leaning droplet clear of a neighbour 14px away, so the glass does not melt
 * them together.
 */
const MAGNET = 1.4
const MAGNET_REACH = 1.5

/** How far a droplet's pull, in pixels, stretches it toward the pointer by its whole size; capped well short of the travel stretch. */
const LEAN = 60
const MAX_LEAN = 0.16

/** Pixels around a droplet that still count as on it, for a finger or a cursor coming to rest at its rim. */
const HIT_SLOP = 4

/** A droplet's resting square in the shape `elasticPull` takes. It only reads the edges, so no DOM is needed. */
const restingBounds = (x: number, y: number, size: number): DOMRect => {
  const left = x - size / 2
  const top = y - size / 2
  return {
    bottom: top + size,
    height: size,
    left,
    right: left + size,
    toJSON: () => ({ height: size, left, top, width: size }),
    top,
    width: size,
    x: left,
    y: top,
  }
}

/**
 * The timeline behind a droplet menu: droplets leave the trigger one at a time,
 * stretch along the way they are travelling, overshoot their place and jiggle
 * to rest, and come home one at a time in reverse.
 *
 * Laid out on a line, the droplets queue out of the trigger like beads: the far
 * end leaves first, and every droplet after it pushes the ones already out one
 * place along, so none of them flies through another. Coming home, the nearest
 * goes in first and the rest close up behind it.
 *
 * Once out, a droplet leans toward a pointer that comes near (`attract`),
 * swells a little while highlighted (`highlight`) and bounces when chosen
 * (`choose`), and the choice is handed back (`takeChoice`) only once that bounce
 * has played.
 *
 * It touches no DOM. `step` is handed each frame's delta and the renderer reads
 * `droplet(i)` and `trigger()` back out, which is what lets the whole sequence be
 * asserted in a unit test.
 *
 * The stagger runs on a clock of its own that only moves when a frame is
 * stepped, rather than on the wall clock. Mounting a handful of glass surfaces
 * at once can hold the main thread for half a second, and on the wall clock
 * every droplet would come out of that stall overdue and leave in the same
 * frame — the one thing this component exists not to do. The chosen bounce is
 * timed on the same clock, so a stalled frame cannot cut it short either.
 */
export class DropletChoreography {
  /** The droplet chosen and still bouncing, and when its choice is due to be acted on. */
  private choice: { at: number; index: number } | null = null
  /** Milliseconds of animation stepped so far. */
  private clock = 0
  private droplets: Droplet[] = []
  private line = false
  private offsets: DropletPoint[] = []
  /** Each droplet's place along a line, nearest the trigger first. */
  private rank: number[] = []
  /** A line's places, nearest the trigger first. */
  private slots: DropletPoint[] = []
  private readonly stagger: number
  private readonly squashX: SpringValue
  private readonly squashY: SpringValue
  private readonly damping: number
  private readonly pullDamping: number
  private readonly swellDamping: number

  public constructor(count: number, options: DropletChoreographyOptions = {}) {
    const wobbliness = clamp(options.wobbliness ?? 0.1, 0, 1)
    this.stagger = Math.max(0, options.stagger ?? 120)
    // Looser than the button family's jelly on purpose: the overshoot on
    // landing is the effect, so even at the provider's default the droplet
    // swings past its place once and back before it settles.
    this.damping = 17 - wobbliness * 8
    // A droplet let go by the pointer springs back past its place and back.
    this.pullDamping = 12 - wobbliness * 6
    this.swellDamping = 14 - wobbliness * 6
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
        pullX: new SpringValue(0, { damping: this.pullDamping, mass: 0.7, stiffness: 300 }),
        pullY: new SpringValue(0, { damping: this.pullDamping, mass: 0.7, stiffness: 300 }),
        reach: 0,
        recalling: false,
        // Lands about 15% oversize and settles back: plump, not a balloon.
        scale: new SpringValue(0, { damping: this.damping, mass: 0.8, stiffness: 430 }),
        swell: new SpringValue(1, { damping: this.swellDamping, mass: 1, stiffness: 520 }),
        x: new SpringValue(0, { damping: this.damping, mass: 1, stiffness: 250 }),
        y: new SpringValue(0, { damping: this.damping, mass: 1, stiffness: 250 }),
      })
    }
    this.droplets.length = count
    if (this.choice && this.choice.index >= count) this.choice = null
  }

  public get count(): number {
    return this.droplets.length
  }

  /** Sends the droplets out from the next frame: first to last on an arc, far end first on a line. */
  public open(offsets: DropletPoint[], layout: DropletLayout = 'arc'): void {
    const now = this.clock
    this.place(offsets, layout)
    let slot = 0
    for (const index of this.launchOrder()) {
      const droplet = this.droplets[index]
      if (!droplet || droplet.heading === 'out') continue
      droplet.heading = 'out'
      // One still on its way home is turned round where it is; one already
      // home queues for its turn to bud off again.
      droplet.dueAt = droplet.scale.current > ABSORBED ? now : now + slot++ * this.stagger
    }
  }

  /** Moves the resting places without replaying the launch, for a resize or a new placement. */
  public retarget(offsets: DropletPoint[], layout: DropletLayout = 'arc'): void {
    this.place(offsets, layout)
  }

  /** Calls the droplets home from the next frame, in the reverse of the order they left. */
  public close(): void {
    const now = this.clock
    let slot = 0
    for (const index of this.launchOrder().reverse()) {
      const droplet = this.droplets[index]
      if (!droplet || droplet.heading === 'in') continue
      droplet.heading = 'in'
      // One that never got to leave simply stays put.
      droplet.dueAt = now >= droplet.dueAt ? now + slot++ * this.stagger : Number.POSITIVE_INFINITY
    }
  }

  /** Puts every droplet where it is headed with no motion, for reduced motion and for tests. */
  public settle(): void {
    const places = this.restingPlaces(Number.POSITIVE_INFINITY)
    this.droplets.forEach((droplet, index) => {
      const out = droplet.heading === 'out'
      const target = places[index] ?? ORIGIN
      droplet.x.set(out ? target.x : 0)
      droplet.y.set(out ? target.y : 0)
      droplet.scale.set(out ? 1 : 0)
      droplet.pullX.set(0)
      droplet.pullY.set(0)
      droplet.swell.set(1)
      droplet.recalling = !out
      droplet.dueAt = out ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    })
    this.squashX.set(1)
    this.squashY.set(1)
    // A choice still bouncing is due now: there is no bounce left to wait for.
    if (this.choice) this.choice.at = this.clock
  }

  /**
   * Draws the droplet nearest a pointer at `pointer` (relative to the
   * trigger's centre) toward it, by `elasticPull` from its resting place, and
   * lets the others spring back — as all of them do when it is `null`. Only the
   * nearest leans, so a pointer between two droplets does not have both reach
   * for it and melt into one. `size` is a droplet's side in pixels; `pullable`
   * leaves out droplets that should not respond.
   */
  public attract(
    pointer: DropletPoint | null,
    size = 0,
    pullable: (index: number) => boolean = () => true,
  ): void {
    let nearest = -1
    if (pointer && size > 0) {
      let closest = Number.POSITIVE_INFINITY
      this.droplets.forEach((droplet, index) => {
        if (!this.isOut(droplet) || !pullable(index)) return
        const distance = Math.hypot(pointer.x - droplet.x.target, pointer.y - droplet.y.target)
        if (distance < closest) {
          closest = distance
          nearest = index
        }
      })
    }
    this.droplets.forEach((droplet, index) => {
      let x = 0
      let y = 0
      if (pointer && index === nearest) {
        const pull = elasticPull(
          restingBounds(droplet.x.target, droplet.y.target, size),
          pointer.x,
          pointer.y,
          { elasticity: 1, reach: size * MAGNET_REACH },
        )
        x = pull.offsetX * MAGNET
        y = pull.offsetY * MAGNET
      }
      droplet.pullX.setTarget(x)
      droplet.pullY.setTarget(y)
    })
  }

  /** Swells the droplet at `index` a little and lets any other go back down; -1 highlights none. */
  public highlight(index: number): void {
    this.droplets.forEach((droplet, other) => {
      // A chosen droplet's bounce is left to play out.
      if (this.choice?.index === other) return
      droplet.swell.setTarget(other === index && this.isOut(droplet) ? HIGHLIGHT : 1)
    })
  }

  /**
   * Bounces the droplet at `index` as the one chosen. Returns false, and does
   * nothing, if a choice is already bouncing or the droplet is not out; the
   * choice is acted on when `takeChoice` hands it back.
   */
  public choose(index: number): boolean {
    const droplet = this.droplets[index]
    if (this.choice || !droplet || !this.isOut(droplet)) return false
    this.choice = { at: this.clock + CHOICE_MS, index }
    droplet.swell.setTarget(1)
    droplet.swell.velocity += CHOICE_KICK
    return true
  }

  /** True while a chosen droplet is still bouncing, before its choice has been handed back. */
  public get choosing(): boolean {
    return this.choice !== null
  }

  /** The chosen droplet's index once its bounce has played, exactly once; -1 until then. */
  public takeChoice(): number {
    if (!this.choice || this.clock < this.choice.at) return -1
    const { index } = this.choice
    this.choice = null
    return index
  }

  /**
   * The droplet under `point` (relative to the trigger's centre), as it is
   * drawn this frame, or -1. Only a droplet well out counts, so one still budding
   * under the pointer on the trigger cannot be picked up by accident.
   */
  public dropletAt(point: DropletPoint, size: number): number {
    let found = -1
    let nearest = Number.POSITIVE_INFINITY
    this.droplets.forEach((droplet, index) => {
      if (!this.isOut(droplet) || droplet.scale.current < 0.6) return
      const frame = this.droplet(index)
      const distance = Math.hypot(point.x - frame.x, point.y - frame.y)
      if (distance <= (size / 2) * frame.scale + HIT_SLOP && distance < nearest) {
        found = index
        nearest = distance
      }
    })
    return found
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
    const places = this.restingPlaces(now)
    let busy = this.choice !== null

    this.droplets.forEach((droplet, index) => {
      const due = now >= droplet.dueAt
      const place = places[index] ?? ORIGIN
      if (droplet.heading === 'out') {
        if (!due) {
          busy = true
          return
        }
        if (droplet.recalling || droplet.scale.target !== 1) this.launch(droplet)
        droplet.x.setTarget(place.x)
        droplet.y.setTarget(place.y)
      } else if (due) {
        if (!droplet.recalling) this.recall(droplet)
        // It shrinks with the distance still to go, so it is a bud again by
        // the time it reaches the trigger instead of vanishing on the way.
        const home = Math.hypot(droplet.x.current, droplet.y.current)
        droplet.scale.setTarget(home < droplet.reach * 0.2 ? 0 : BUD + (1 - BUD) * clamp(home / droplet.reach, 0, 1))
      } else if (droplet.dueAt !== Number.POSITIVE_INFINITY) {
        busy = true
        // Still out and waiting its turn to come home. On a line it closes up
        // behind the ones that have already gone in.
        droplet.x.setTarget(place.x)
        droplet.y.setTarget(place.y)
      }

      // The springs run every frame even when settled: `step` is cheap and
      // short-circuits, and it keeps a droplet turned round mid-flight
      // carrying the velocity it had.
      for (const spring of [droplet.x, droplet.y, droplet.scale, droplet.pullX, droplet.pullY, droplet.swell]) {
        if (spring.step(delta)) busy = true
      }

      // Home: snapped to rest so an underdamped spring does not bring a
      // sliver of it back out through the trigger.
      if (droplet.recalling && droplet.scale.target === 0 && droplet.scale.current <= ABSORBED) {
        droplet.scale.set(0)
        droplet.x.set(0)
        droplet.y.set(0)
        droplet.pullX.set(0)
        droplet.pullY.set(0)
        droplet.swell.set(1)
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

    const scale = droplet.scale.current <= ABSORBED && droplet.scale.target === 0
      ? 0
      : Math.max(0, droplet.scale.current * droplet.swell.current)
    const velocityX = droplet.x.velocity + droplet.pullX.velocity
    const velocityY = droplet.y.velocity + droplet.pullY.velocity
    const speed = Math.hypot(velocityX, velocityY)
    // A droplet at full tilt is about a third longer than it is wide, which
    // is the most it can stretch before it reads as a capsule.
    const travel = Math.min(speed / 2600, 0.34)
    const travelAngle = Math.atan2(velocityY, velocityX)
    const pull = Math.hypot(droplet.pullX.current, droplet.pullY.current)
    const lean = Math.min(pull / LEAN, MAX_LEAN)
    const frame = { scale, x: droplet.x.current + droplet.pullX.current, y: droplet.y.current + droplet.pullY.current }
    if (lean < 1e-4) {
      return { ...frame, angle: speed > 1 ? (travelAngle * 180) / Math.PI : 0, stretch: 1 + travel }
    }

    // Drawn toward the pointer, it also reaches for it. Stretches are axes
    // rather than arrows — flying up and leaning down stretch it the same way —
    // so the two add on doubled angles.
    const leanAngle = Math.atan2(droplet.pullY.current, droplet.pullX.current)
    const axisX = travel * Math.cos(2 * travelAngle) + lean * Math.cos(2 * leanAngle)
    const axisY = travel * Math.sin(2 * travelAngle) + lean * Math.sin(2 * leanAngle)
    return {
      ...frame,
      angle: (Math.atan2(axisY, axisX) * 90) / Math.PI,
      stretch: 1 + Math.min(Math.hypot(axisX, axisY), 0.34),
    }
  }

  public trigger(): TriggerFrame {
    return { scaleX: this.squashX.current, scaleY: this.squashY.current }
  }

  /** Out, launched and not on its way home: the droplets that can be pulled, highlighted, hit and chosen. */
  private isOut(droplet: Droplet): boolean {
    return droplet.heading === 'out' && !droplet.recalling && droplet.scale.target === 1
  }

  private place(offsets: DropletPoint[], layout: DropletLayout): void {
    this.offsets = offsets
    this.line = layout === 'line'
    const byDistance = offsets
      .map((point, index) => ({ distance: Math.hypot(point.x, point.y), index }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
    this.rank = []
    byDistance.forEach(({ index }, rank) => {
      this.rank[index] = rank
    })
    this.slots = byDistance.map(({ index }) => offsets[index] ?? ORIGIN)
  }

  /** The order the droplets leave in: item order on an arc, the far end first on a line. */
  private launchOrder(): number[] {
    const order = this.droplets.map((_, index) => index)
    return this.line ? order.sort((a, b) => (this.rank[b] ?? b) - (this.rank[a] ?? a)) : order
  }

  /**
   * Where each droplet rests at `now`. On an arc that is its own place. A line
   * packs the droplets that are out against the trigger, keeping their order
   * along it, so each one leaving pushes the others outward and each one coming
   * home lets them close up.
   */
  private restingPlaces(now: number): DropletPoint[] {
    if (!this.line) return this.offsets
    const out = this.droplets.map((droplet) => droplet.heading === 'out'
      ? now >= droplet.dueAt
      : now < droplet.dueAt && droplet.dueAt !== Number.POSITIVE_INFINITY)
    return this.droplets.map((_, index) => {
      const rank = this.rank[index] ?? index
      const ahead = out.filter((isOut, other) => isOut && (this.rank[other] ?? other) < rank).length
      return this.slots[ahead] ?? this.offsets[index] ?? ORIGIN
    })
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
    // Let go of the pointer and of any highlight on the way in.
    droplet.pullX.setTarget(0)
    droplet.pullY.setTarget(0)
    droplet.swell.setTarget(1)
    // A small gulp as it is taken back in.
    this.squashX.velocity -= 1
    this.squashY.velocity += 1.3
  }
}
