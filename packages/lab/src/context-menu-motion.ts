import { clamp, SpringValue, type GlassMergeShape } from '@liquefy-ui/core'
import { GlassMorph, type MorphBox, type MorphOrigin } from './morph-motion'

/** The side of the preview the menu comes out of. */
export type ContextMenuSide = 'top' | 'right' | 'bottom' | 'left'

/** A box in viewport pixels: its top-left corner, and its size. */
export type ContextMenuRect = { height: number; width: number; x: number; y: number }

export type ContextMenuPoint = { x: number; y: number }

export type ContextMenuLayoutOptions = {
  /** Clear space between the lifted preview and the menu. */
  gap?: number
  /** How much bigger the preview is drawn while lifted. */
  lift?: number
  /** Closest either may come to the edge of the viewport. */
  margin?: number
  menu: { height: number; width: number }
  /** The preview where it sits on the page. */
  preview: ContextMenuRect
  /** `auto` tries below, above, to the right and to the left, in that order. */
  side?: ContextMenuSide | 'auto'
  viewport: { height: number; width: number }
}

export type ContextMenuLayout = {
  /**
   * Which end of the preview's edge the menu lines up with: `start` is its left
   * end (above or below it) or its top end (beside it), `end` the other.
   */
  align: 'start' | 'end'
  gap: number
  menu: ContextMenuRect
  /** The preview as it is drawn lifted: moved to make room for the menu, at `scale`. */
  preview: ContextMenuRect
  /** The lift, less whatever the preview had to give up to fit beside the menu. */
  scale: number
  side: ContextMenuSide
}

const DEFAULT_GAP = 12
const DEFAULT_LIFT = 1.04
const DEFAULT_MARGIN = 12
/** A preview is never drawn smaller than this to make room, however little there is. */
const MIN_SCALE = 0.3
/**
 * Shrinking the preview costs far more than moving it, so a side that needs it
 * loses to any side that only needs a move.
 */
const SHRINK_COST = 2000

const AUTO: readonly ContextMenuSide[] = ['bottom', 'top', 'right', 'left']

type Plan = { cost: number; layout: ContextMenuLayout }

const centreOf = (rect: ContextMenuRect): ContextMenuPoint => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })

/** `value` moved into `[low, high]`, or to `low` when the range is empty. */
const fit = (value: number, low: number, high: number): number => Math.max(low, Math.min(value, high))

const plan = (
  side: ContextMenuSide,
  { gap, lift, margin, menu, preview, viewport }: Required<Omit<ContextMenuLayoutOptions, 'side'>>,
): Plan => {
  const centre = centreOf(preview)
  const vertical = side === 'top' || side === 'bottom'
  const roomX = viewport.width - 2 * margin - (vertical ? 0 : gap + menu.width)
  const roomY = viewport.height - 2 * margin - (vertical ? gap + menu.height : 0)
  const fitted = Math.min(lift, roomX / Math.max(preview.width, 1), roomY / Math.max(preview.height, 1))
  const scale = Math.max(fitted, MIN_SCALE)
  const width = preview.width * scale
  const height = preview.height * scale
  // Lifted where it is, before anything moves it.
  const left = centre.x - width / 2
  const top = centre.y - height / 2

  let x: number
  let y: number
  let menuX: number
  let menuY: number
  let align: 'start' | 'end'
  if (vertical) {
    x = fit(left, margin, viewport.width - margin - width)
    y = side === 'bottom'
      ? fit(top, margin, viewport.height - margin - menu.height - gap - height)
      : fit(top, margin + menu.height + gap, viewport.height - margin - height)
    // Lined up with the end of the preview nearer the middle of the screen,
    // so the menu opens toward the room.
    align = centre.x <= viewport.width / 2 ? 'start' : 'end'
    menuX = fit(align === 'start' ? x : x + width - menu.width, margin, viewport.width - margin - menu.width)
    menuY = side === 'bottom' ? y + height + gap : y - gap - menu.height
  } else {
    x = side === 'right'
      ? fit(left, margin, viewport.width - margin - menu.width - gap - width)
      : fit(left, margin + menu.width + gap, viewport.width - margin - width)
    y = fit(top, margin, viewport.height - margin - height)
    align = centre.y <= viewport.height / 2 ? 'start' : 'end'
    menuX = side === 'right' ? x + width + gap : x - gap - menu.width
    menuY = fit(align === 'start' ? y : y + height - menu.height, margin, viewport.height - margin - menu.height)
  }

  const moved = Math.abs(x - left) + Math.abs(y - top)
  return {
    cost: moved + (lift - scale) * SHRINK_COST,
    layout: {
      align,
      gap,
      menu: { height: menu.height, width: menu.width, x: menuX, y: menuY },
      preview: { height, width, x, y },
      scale,
      side,
    },
  }
}

/**
 * Where the lifted preview and its menu go. Like iOS, the menu goes below the
 * preview if it fits there, else above it, else beside it; where it fits
 * nowhere as things stand, the preview moves as little as it can to make room,
 * and only shrinks when moving is not enough. The menu lines up with the end of
 * the preview nearer the middle of the screen.
 */
export const contextMenuLayout = ({
  gap = DEFAULT_GAP,
  lift = DEFAULT_LIFT,
  margin = DEFAULT_MARGIN,
  menu,
  preview,
  side = 'auto',
  viewport,
}: ContextMenuLayoutOptions): ContextMenuLayout => {
  const options = { gap, lift, margin, menu, preview, viewport }
  const plans = (side === 'auto' ? AUTO : [side]).map((candidate) => plan(candidate, options))
  // Below if it fits as it is, then above, then beside; otherwise whichever disturbs the preview least.
  const inPlace = plans.find((candidate) => candidate.cost < 0.5)
  if (inPlace) return inPlace.layout
  return plans.reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best)).layout
}

export type ContextMenuMotionOptions = {
  /** Inset from the menu's edge to its first and last rows. */
  padding?: number
  /** Height of one row. */
  rowHeight?: number
  /** Milliseconds between one row arriving and the next. */
  stagger?: number
  /** 0 to 1, the provider's `wobbliness`. */
  wobbliness?: number
}

export type ContextMenuPreviewFrame = {
  /** Size, about the preview's centre: under 1 while a press is held, the lift once open. */
  scale: number
  /** 0 to 1, how far it has risen off the page: its shadow. */
  shadow: number
  /** How far its centre has moved from where it sits on the page. */
  x: number
  y: number
}

export type ContextMenuPanelFrame = {
  /** 0 to 1, how much of the thick glass under the rows is there. */
  frost: number
  height: number
  radius: number
  width: number
  /** Top-left corner, in viewport pixels. */
  x: number
  y: number
}

export type ContextMenuRowFrame = {
  opacity: number
  scale: number
  /** Offset from the row's place in the menu. */
  x: number
  y: number
}

export type ContextMenuPillFrame = {
  height: number
  opacity: number
  width: number
  /** Centre, from the menu's top-left. */
  x: number
  y: number
}

type Phase = 'idle' | 'pressing' | 'open' | 'closing'

type Row = {
  /** When this row is due to arrive, on the motion's own clock. */
  dueAt: number
  /** Linear opacity, eased on the way out. */
  fade: number
  fadeTarget: number
  scale: SpringValue
  /** Slide along the way the menu came out. */
  slide: SpringValue
}

/** The longest frame the clock will count, in seconds. */
const MAX_FRAME = 1 / 30
/** A held press sinks the preview by this much before it lifts. */
const PRESS = 0.955
/** The menu buds out as a circle of this size before it spreads. */
const BUD = 30
/** How far inside the preview's edge the bud starts. It is hidden under the preview until it comes out. */
const START = 32
/** Glass hidden under the preview's edge for the menu to pull a neck out of. */
const ANCHOR = 26
/** How far inside the edge the anchor sits. */
const ANCHOR_INSET = 3
const RADIUS = 22
const SCRIM_IN = 220
const SCRIM_OUT = 260
/** The menu has spread a little before the first row arrives. */
const ROW_DELAY = 90
const ROW_IN = 150
const ROW_OUT = 90
/** Rows slide out of the preview by this much. */
const ROW_SLIDE = 12
/** Milliseconds a chosen row pops for before the choice is acted on. */
const CHOICE_MS = 200
/** The highlight leans this far toward a pointer inside its row, at most. */
const LEAN_X = 6
const LEAN_Y = 7

const ORIGINS: Record<ContextMenuSide, Record<'start' | 'end', MorphOrigin>> = {
  bottom: { end: 'top-right', start: 'top-left' },
  left: { end: 'bottom-right', start: 'top-right' },
  right: { end: 'bottom-left', start: 'top-left' },
  top: { end: 'bottom-right', start: 'bottom-left' },
}

const NORMALS: Record<ContextMenuSide, ContextMenuPoint> = {
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
}

const ZERO: MorphBox = { height: 0, radius: 0, width: 0 }

const smoothstep = (value: number): number => {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

/** A spring with the damping ratio given, rather than the raw damping. */
const spring = (value: number, stiffness: number, ratio: number, mass = 1) =>
  new SpringValue(value, { damping: 2 * Math.sqrt(stiffness * mass) * ratio, mass, stiffness })

const atRest = (value: SpringValue): boolean => value.velocity === 0 && value.current === value.target

/** Closer than this, in pixels and pixels a second, a pixel spring is at rest: the eye stopped seeing it long before. */
const REST_DISTANCE = 0.05
const REST_SPEED = 0.5

/** Steps a spring measured in pixels, and puts it to rest once it is too close to its target to see. */
const stepPixels = (value: SpringValue, seconds: number): void => {
  if (value.step(seconds) && Math.abs(value.target - value.current) < REST_DISTANCE && Math.abs(value.velocity) < REST_SPEED) {
    value.set(value.target)
  }
}

/** The corner (or edge end) of the menu a morph from `origin` keeps still. */
const cornerOf = (rect: ContextMenuRect, origin: MorphOrigin): ContextMenuPoint => ({
  x: origin.endsWith('left') ? rect.x : origin.endsWith('right') ? rect.x + rect.width : rect.x + rect.width / 2,
  y: origin.startsWith('top') ? rect.y : origin.startsWith('bottom') ? rect.y + rect.height : rect.y + rect.height / 2,
})

/**
 * The motion behind a context menu: a held press sinks the preview a little,
 * then it lifts — bigger, shadowed, moved to make room — over a darkening
 * scrim, and the menu buds out from under its edge as a drop of glass that
 * spreads, drops into a panel and swings past its shape before it settles. The
 * rows arrive one at a time. A highlight slides from row to row, stretching as
 * it goes and leaning toward the pointer; a chosen row pops before its choice
 * is handed back. Closing draws the menu back under the preview and sets the
 * preview down where it was.
 *
 * The menu is a `GlassMorph`, and a second piece of glass sits hidden under the
 * preview's edge: while the menu is close to it the two melt together, so the
 * menu pulls a neck of glass out from under the preview that thins and lets go.
 *
 * It touches no DOM. `step` is handed each frame's delta, the renderer reads the
 * frames back, and the clock only moves when a frame is stepped — a stalled
 * frame slows the menu down rather than making every row arrive at once.
 */
export class ContextMenuMotion {
  private choice: { at: number; index: number } | null = null
  /** Milliseconds of animation stepped so far. */
  private clock = 0
  private layout: ContextMenuLayout | null = null
  private morph: GlassMorph | null = null
  private morphOrigin: MorphOrigin = 'top-left'
  private phase: Phase = 'idle'
  /** The preview where it sits on the page. */
  private rest: ContextMenuRect | null = null
  private rows: Row[] = []
  private scrim = 0
  private scrimTarget = 0
  private pointer: ContextMenuPoint | null = null
  /** The menu has been drawn all the way back in since it was last opened. */
  private gone = false
  private pillIndex = -1

  private readonly padding: number
  private readonly rowHeight: number
  private readonly stagger: number
  private readonly wobbliness: number
  private readonly ratio: number

  private readonly sink = spring(1, 150, 1)
  private readonly lift: SpringValue
  private readonly shiftX: SpringValue
  private readonly shiftY: SpringValue
  private readonly detach: SpringValue
  private readonly pillY: SpringValue
  private readonly pillOpacity = spring(0, 420, 1)
  private readonly pillSwell: SpringValue
  private readonly leanX: SpringValue
  private readonly leanY: SpringValue

  public constructor(count: number, options: ContextMenuMotionOptions = {}) {
    this.padding = options.padding ?? 6
    this.rowHeight = options.rowHeight ?? 44
    this.stagger = Math.max(0, options.stagger ?? 45)
    this.wobbliness = clamp(options.wobbliness ?? 0.1, 0, 1)
    // About 0.5 at the provider's default: everything swings past once and
    // comes back. Full wobbliness takes it down to 0.25, where it rings.
    this.ratio = 0.53 - this.wobbliness * 0.28
    this.lift = spring(1, 340, this.ratio)
    this.shiftX = spring(0, 230, this.ratio + 0.2)
    this.shiftY = spring(0, 230, this.ratio + 0.2)
    this.detach = spring(0, 260, this.ratio + 0.05)
    this.pillY = spring(0, 520, this.ratio + 0.15)
    this.pillSwell = spring(1, 520, this.ratio)
    this.leanX = spring(0, 300, this.ratio + 0.1, 0.7)
    this.leanY = spring(0, 300, this.ratio + 0.1, 0.7)
    this.resize(count)
  }

  /** Adds or drops rows to match the item count. */
  public resize(count: number): void {
    while (this.rows.length < count) {
      this.rows.push({
        dueAt: Number.POSITIVE_INFINITY,
        fade: 0,
        fadeTarget: 0,
        scale: spring(1, 420, this.ratio),
        slide: spring(0, 380, this.ratio + 0.1),
      })
    }
    this.rows.length = count
    if (this.choice && this.choice.index >= count) this.choice = null
    if (this.pillIndex >= count) this.highlight(-1)
  }

  public get count(): number {
    return this.rows.length
  }

  /** True from `open` until `close`. */
  public get isOpen(): boolean {
    return this.phase === 'open'
  }

  /** True while the preview is up off the page, from `open` until it is set down again. */
  public get lifted(): boolean {
    return this.phase === 'open' || this.phase === 'closing'
  }

  /** True once the menu is gone and the preview is back on the page, still: the overlay may go. */
  public get closed(): boolean {
    return this.phase === 'idle'
  }

  /** A press has gone down on the preview: it sinks a little while it is held. */
  public press(): void {
    if (this.phase !== 'idle') return
    this.phase = 'pressing'
    this.sink.setTarget(PRESS)
  }

  /** The press let go, or turned into a scroll, before the menu opened. */
  public release(): void {
    if (this.phase !== 'pressing') return
    this.phase = 'idle'
    this.sink.setTarget(1)
  }

  /**
   * Lifts the preview from `rest` (where it sits on the page) into `layout`
   * and grows the menu out of it. Opened again while closing, it turns round
   * from wherever it is.
   */
  public open(layout: ContextMenuLayout, rest: ContextMenuRect): void {
    this.rebase(rest)
    this.layout = layout
    this.phase = 'open'
    this.choice = null
    this.scrimTarget = 1

    // The press hands over to the lift, so the preview springs up from as
    // far down as it had sunk, and swings past its lift on the way.
    this.lift.current *= this.sink.current
    this.sink.set(1)
    this.lift.setTarget(layout.scale)
    // A little pop as it comes off the page.
    this.lift.velocity += 0.6
    const from = centreOf(rest)
    const to = centreOf(layout.preview)
    this.shiftX.setTarget(to.x - from.x)
    this.shiftY.setTarget(to.y - from.y)

    const origin = ORIGINS[layout.side][layout.align]
    const fresh = !this.morph || origin !== this.morphOrigin || this.gone || this.morph.frame().width < 1
    this.gone = false
    if (fresh) {
      this.morphOrigin = origin
      this.morph = new GlassMorph({ height: BUD, radius: BUD / 2, width: BUD }, { origin, wobbliness: this.wobbliness })
      this.detach.set(-START)
    }
    this.morph?.morphTo({ height: layout.menu.height, radius: Math.min(RADIUS, layout.menu.height / 2), width: layout.menu.width })
    this.detach.setTarget(0)

    this.rows.forEach((row, index) => {
      row.fadeTarget = 1
      row.dueAt = this.clock + ROW_DELAY + index * this.stagger
      if (row.fade <= 0) {
        row.slide.set(-ROW_SLIDE)
        row.scale.set(0.84)
      }
    })
    this.highlight(-1)
  }

  /**
   * Draws the menu back under the preview and sets the preview down. `rest` is
   * where the preview sits on the page now, if the page has moved under it.
   */
  public close(rest?: ContextMenuRect): void {
    if (this.phase === 'idle') return
    if (rest) this.rebase(rest)
    this.phase = 'closing'
    this.scrimTarget = 0
    this.sink.setTarget(1)
    this.lift.setTarget(1)
    this.shiftX.setTarget(0)
    this.shiftY.setTarget(0)
    if (this.morph && this.layout) {
      this.morph.morphTo(ZERO)
      this.detach.setTarget(-START)
    }
    for (const row of this.rows) {
      row.fadeTarget = 0
      row.dueAt = this.clock
    }
    this.highlight(-1)
  }

  /** Puts everything where it is heading with no motion, for motion off and for tests. */
  public settle(): void {
    // A press held with motion off does not sink: that is motion too.
    this.sink.set(1)
    const open = this.phase === 'open' && this.layout && this.rest
    if (open && this.layout && this.rest) {
      this.lift.set(this.layout.scale)
      const from = centreOf(this.rest)
      const to = centreOf(this.layout.preview)
      this.shiftX.set(to.x - from.x)
      this.shiftY.set(to.y - from.y)
      this.scrim = 1
      this.detach.set(0)
    } else {
      this.lift.set(1)
      this.shiftX.set(0)
      this.shiftY.set(0)
      this.scrim = 0
      this.detach.set(-START)
    }
    this.morph?.settle()
    for (const row of this.rows) {
      row.fade = open ? 1 : 0
      row.dueAt = Number.NEGATIVE_INFINITY
      row.slide.set(0)
      row.scale.set(1)
    }
    this.pillY.set(this.pillY.target)
    this.pillOpacity.set(this.pillOpacity.target)
    this.pillSwell.set(1)
    this.leanX.set(this.leanX.target)
    this.leanY.set(this.leanY.target)
    if (this.phase === 'closing') this.finish()
    // A choice still popping is due now: there is no pop left to wait for.
    if (this.choice) this.choice.at = this.clock
  }

  /** Slides the highlight to the row at `index`, or fades it out where it is for -1. */
  public highlight(index: number): void {
    // A chosen row keeps the highlight while it pops.
    if (this.choice) return
    const target = this.phase === 'open' && index >= 0 && index < this.rows.length ? index : -1
    if (target === this.pillIndex) return
    // Arriving from nowhere it appears on its row; from another row it slides.
    if (this.pillIndex < 0 || this.pillOpacity.current < 0.05) this.pillY.set(this.rowCentre(target))
    if (target >= 0) this.pillY.setTarget(this.rowCentre(target))
    this.pillIndex = target
    this.pillOpacity.setTarget(target >= 0 ? 1 : 0)
    this.updateLean()
  }

  /** The highlighted row, or -1. */
  public get highlighted(): number {
    return this.pillIndex
  }

  /** Where a pointer over the menu is, in viewport pixels: the highlight leans toward it. `null` lets it go. */
  public lean(point: ContextMenuPoint | null): void {
    this.pointer = point
    this.updateLean()
  }

  /**
   * Pops the row at `index` as the one chosen. Returns false, and does
   * nothing, if a choice is already popping or the menu is not open; the
   * choice is acted on once `takeChoice` hands it back.
   */
  public choose(index: number): boolean {
    const row = this.rows[index]
    if (this.choice || !row || this.phase !== 'open') return false
    this.highlight(index)
    this.choice = { at: this.clock + CHOICE_MS, index }
    this.pillSwell.velocity += 2.4
    row.scale.velocity += 1.6
    return true
  }

  /** True while a chosen row is still popping, before its choice has been handed back. */
  public get choosing(): boolean {
    return this.choice !== null
  }

  /** The chosen row's index once its pop has played, exactly once; -1 until then. */
  public takeChoice(): number {
    if (!this.choice || this.clock < this.choice.at) return -1
    const { index } = this.choice
    this.choice = null
    return index
  }

  /** The row under `point` (viewport pixels) while the menu is open, or -1. */
  public rowAt(point: ContextMenuPoint): number {
    const menu = this.layout?.menu
    if (!menu || this.phase !== 'open') return -1
    const x = point.x - menu.x
    const y = point.y - menu.y
    if (x < 0 || x > menu.width || y < 0 || y > menu.height) return -1
    return clamp(Math.floor((y - this.padding) / this.rowHeight), 0, this.rows.length - 1)
  }

  /** Advances the motion by one frame of `delta` seconds. Returns whether anything is still moving. */
  public step(delta: number): boolean {
    const seconds = Math.min(Math.max(delta, 0), MAX_FRAME)
    if (seconds === 0) return !this.atRest() || this.choice !== null
    this.clock += seconds * 1000
    const now = this.clock

    for (const value of [this.sink, this.lift, this.pillOpacity, this.pillSwell]) value.step(seconds)
    for (const value of [this.shiftX, this.shiftY, this.detach, this.pillY, this.leanX, this.leanY]) stepPixels(value, seconds)
    this.morph?.step(seconds)
    // Drawn back in, it stays gone: a spring swinging back past nothing
    // would otherwise bring a sliver of it out again.
    const shrunk = this.morph?.frame()
    if (this.phase === 'closing' && shrunk && (shrunk.width < 1 || shrunk.height < 1)) this.gone = true

    const scrimRate = (seconds * 1000) / (this.scrimTarget > this.scrim ? SCRIM_IN : SCRIM_OUT)
    this.scrim = this.scrimTarget > this.scrim
      ? Math.min(this.scrimTarget, this.scrim + scrimRate)
      : Math.max(this.scrimTarget, this.scrim - scrimRate)

    for (const row of this.rows) {
      if (now >= row.dueAt && row.fade !== row.fadeTarget) {
        const arriving = row.fadeTarget > row.fade
        if (arriving && row.fade === 0) {
          // Each row lands with a little pop of its own.
          row.slide.setTarget(0)
          row.scale.setTarget(1)
        }
        const rate = (seconds * 1000) / (arriving ? ROW_IN : ROW_OUT)
        row.fade = arriving ? Math.min(row.fadeTarget, row.fade + rate) : Math.max(row.fadeTarget, row.fade - rate)
      }
      stepPixels(row.slide, seconds)
      row.scale.step(seconds)
    }

    if (this.phase === 'closing' && this.atRest()) this.finish()
    return !this.atRest() || this.choice !== null
  }

  public preview(): ContextMenuPreviewFrame {
    return {
      scale: Math.max(0, this.sink.current * this.lift.current),
      shadow: smoothstep(this.scrim),
      x: this.shiftX.current,
      y: this.shiftY.current,
    }
  }

  /** The preview as it is drawn this frame, in viewport pixels. */
  public previewRect(): ContextMenuRect | null {
    if (!this.rest) return null
    const { scale, x, y } = this.preview()
    const centre = centreOf(this.rest)
    const width = this.rest.width * scale
    const height = this.rest.height * scale
    return { height, width, x: centre.x + x - width / 2, y: centre.y + y - height / 2 }
  }

  /** 0 to 1, how dark the page behind is. */
  public scrimOpacity(): number {
    return smoothstep(this.scrim)
  }

  /** The menu's glass this frame, or null while there is none to draw. */
  public panel(): ContextMenuPanelFrame | null {
    const layout = this.layout
    const morph = this.morph
    const drawn = this.previewRect()
    if (!layout || !morph || !drawn || this.phase === 'idle') return null
    const frame = morph.frame()
    if (this.gone || frame.width < 0.5 || frame.height < 0.5) return null
    const point = this.attachment(layout, drawn)
    const centreX = point.x + frame.x
    const centreY = point.y + frame.y
    return {
      frost: this.phase === 'open' ? frame.reveal : frame.conceal,
      height: frame.height,
      radius: frame.radius,
      width: frame.width,
      x: centreX - frame.width / 2,
      y: centreY - frame.height / 2,
    }
  }

  /**
   * Every piece of glass this frame, centred in viewport pixels: the menu, and
   * while the menu is still close to the preview the piece hidden under the
   * preview's edge that it pulls its neck out of.
   */
  public shapes(): GlassMergeShape[] {
    const panel = this.panel()
    const layout = this.layout
    const drawn = this.previewRect()
    if (!panel || !layout || !drawn) return []
    const shapes: GlassMergeShape[] = []
    // Full size until the menu is nearly out, then gone; it grows back as the menu is drawn in.
    const size = ANCHOR * clamp(-this.detach.current / 4, 0, 1)
    if (size > 1) {
      const normal = NORMALS[layout.side]
      const vertical = normal.x === 0
      const corner = cornerOf({ ...layout.menu, ...this.attachedCorner(layout, drawn) }, this.morphOrigin)
      const sign = layout.align === 'start' ? 1 : -1
      // Along the edge: level with the bud the menu starts as, kept within the preview.
      const along = vertical
        ? fit(corner.x + (sign * BUD) / 2, drawn.x + ANCHOR / 2, drawn.x + drawn.width - ANCHOR / 2)
        : fit(corner.y + (sign * BUD) / 2, drawn.y + ANCHOR / 2, drawn.y + drawn.height - ANCHOR / 2)
      const edge = layout.side === 'bottom'
        ? drawn.y + drawn.height
        : layout.side === 'top'
          ? drawn.y
          : layout.side === 'right' ? drawn.x + drawn.width : drawn.x
      const across = edge - (vertical ? normal.y : normal.x) * (ANCHOR / 2 + ANCHOR_INSET)
      shapes.push({
        height: size,
        radius: size / 2,
        width: size,
        x: vertical ? along : across,
        y: vertical ? across : along,
      })
    }
    shapes.push({
      height: panel.height,
      radius: panel.radius,
      width: panel.width,
      x: panel.x + panel.width / 2,
      y: panel.y + panel.height / 2,
    })
    return shapes
  }

  /**
   * How far the menu is drawn from its place this frame: it rides on the
   * preview's edge while the preview moves, and slides out of it. The rows go
   * with it.
   */
  public menuOffset(): ContextMenuPoint {
    const layout = this.layout
    const drawn = this.previewRect()
    if (!layout || !drawn) return { x: 0, y: 0 }
    const point = this.attachment(layout, drawn)
    const corner = cornerOf(layout.menu, this.morphOrigin)
    return { x: point.x - corner.x, y: point.y - corner.y }
  }

  public row(index: number): ContextMenuRowFrame {
    const row = this.rows[index]
    if (!row) return { opacity: 0, scale: 1, x: 0, y: 0 }
    // A row never shows ahead of the glass it sits on.
    const gate = this.phase === 'open' ? (this.morph?.frame().reveal ?? 1) : 1
    const normal = this.layout ? NORMALS[this.layout.side] : NORMALS.bottom
    return {
      opacity: Math.min(row.fade < 1 && row.fadeTarget === 0 ? smoothstep(row.fade) : row.fade, gate),
      scale: Math.max(0, row.scale.current),
      x: normal.x * row.slide.current,
      y: normal.y * row.slide.current,
    }
  }

  public pill(): ContextMenuPillFrame {
    const menu = this.layout?.menu
    const width = (menu?.width ?? 0) - 2 * this.padding
    // Stretched along the way it is sliding, the way a drop pulled along does.
    const stretch = 1 + Math.min(Math.abs(this.pillY.velocity) / 1700, 0.3)
    const swell = Math.max(0, this.pillSwell.current)
    return {
      height: this.rowHeight * stretch * swell,
      opacity: clamp(this.pillOpacity.current, 0, 1),
      width: (width / Math.sqrt(stretch)) * (1 + (swell - 1) * 0.35),
      x: (menu?.width ?? 0) / 2 + this.leanX.current,
      y: this.pillY.current + this.leanY.current,
    }
  }

  /** The row's centre, from the menu's top. */
  private rowCentre(index: number): number {
    return this.padding + this.rowHeight * (Math.max(index, 0) + 0.5)
  }

  private updateLean(): void {
    const menu = this.layout?.menu
    const point = this.pointer
    if (!menu || !point || this.pillIndex < 0) {
      this.leanX.setTarget(0)
      this.leanY.setTarget(0)
      return
    }
    this.leanX.setTarget(clamp((point.x - menu.x - menu.width / 2) * 0.04, -LEAN_X, LEAN_X))
    this.leanY.setTarget(clamp((point.y - menu.y - this.rowCentre(this.pillIndex)) * 0.3, -LEAN_Y, LEAN_Y))
  }

  /**
   * Moves the preview's resting place to `rest` without moving what is drawn:
   * the offsets are measured from the new place, so the preview carries on
   * from where it is.
   */
  private rebase(rest: ContextMenuRect): void {
    if (this.rest) {
      const before = centreOf(this.rest)
      const after = centreOf(rest)
      this.shiftX.current += before.x - after.x
      this.shiftY.current += before.y - after.y
    }
    this.rest = { ...rest }
  }

  /**
   * The menu's still corner this frame. It is fixed to the preview's edge as
   * the preview lifts and moves, and slides out of it along the side's normal
   * as the menu detaches.
   */
  private attachment(layout: ContextMenuLayout, drawn: ContextMenuRect): ContextMenuPoint {
    const corner = this.attachedCorner(layout, drawn)
    const normal = NORMALS[layout.side]
    const point = cornerOf({ ...layout.menu, ...corner }, this.morphOrigin)
    return { x: point.x + normal.x * this.detach.current, y: point.y + normal.y * this.detach.current }
  }

  /** The menu's top-left as it would be for the preview drawn at `drawn`, at rest against it. */
  private attachedCorner(layout: ContextMenuLayout, drawn: ContextMenuRect): ContextMenuPoint {
    const final = layout.preview
    const start = layout.align === 'start'
    let dx: number
    let dy: number
    if (layout.side === 'top' || layout.side === 'bottom') {
      dy = layout.side === 'bottom' ? drawn.y + drawn.height - (final.y + final.height) : drawn.y - final.y
      dx = start ? drawn.x - final.x : drawn.x + drawn.width - (final.x + final.width)
    } else {
      dx = layout.side === 'right' ? drawn.x + drawn.width - (final.x + final.width) : drawn.x - final.x
      dy = start ? drawn.y - final.y : drawn.y + drawn.height - (final.y + final.height)
    }
    return { x: layout.menu.x + dx, y: layout.menu.y + dy }
  }

  private atRest(): boolean {
    const springs = [this.sink, this.lift, this.shiftX, this.shiftY, this.detach, this.pillY, this.pillOpacity, this.pillSwell, this.leanX, this.leanY]
    return springs.every(atRest)
      && (this.morph?.settled ?? true)
      && this.scrim === this.scrimTarget
      && this.rows.every((row) => row.fade === row.fadeTarget && atRest(row.slide) && atRest(row.scale))
  }

  private finish(): void {
    this.phase = 'idle'
    this.layout = null
    this.morph = null
    this.rest = null
    this.pointer = null
    this.gone = false
    this.pillIndex = -1
    this.pillOpacity.set(0)
    this.leanX.set(0)
    this.leanY.set(0)
    this.detach.set(-START)
    this.sink.set(1)
    this.lift.set(1)
    this.shiftX.set(0)
    this.shiftY.set(0)
    this.scrim = 0
    for (const row of this.rows) {
      row.fade = 0
      row.fadeTarget = 0
      row.dueAt = Number.POSITIVE_INFINITY
      row.slide.set(0)
      row.scale.set(1)
    }
  }
}
