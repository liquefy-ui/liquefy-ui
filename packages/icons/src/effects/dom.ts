import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { dashFor, planDraw, progressAt, type DrawOrder } from './motion'
import { pathLength, serializePath, shapeCommands, splitSubpaths, type PathCommand, type Subpath } from './path'

export const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Set on every element an effect adds to an icon, so a later pass never takes
 * one for part of the icon itself.
 */
export const ADDED = 'data-lq-effect'

/** A layout effect in the browser, so nothing is painted half-set-up; a plain one on the server, which would warn. */
export const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** The icon inside a wrapper: its first `<svg>`. */
export const iconOf = (wrapper: Element | null): SVGSVGElement | null => wrapper?.querySelector('svg') ?? null

/** Whether this browser can play the effects at all. Without the Web Animations API the icon just stays still. */
export const canAnimate = (element: Element | null): element is Element =>
  typeof (element as Element | null)?.animate === 'function'

/**
 * The attribute `LiquefyProvider` writes with its `motion` setting. Reading it
 * off the page is how the effects follow the provider without this package
 * depending on `@liquefy-ui/react`.
 */
const MOTION_ATTRIBUTE = 'data-liquid-motion'

/** Whether the nearest provider above `node` lets things move; true when there is none. */
export const motionAround = (node: Element | null): boolean =>
  node?.closest(`[${MOTION_ATTRIBUTE}]`)?.getAttribute(MOTION_ATTRIBUTE) !== 'off'

/**
 * Whether an effect may move, and a number that changes when that might have.
 *
 * An explicit `motion` decides it. Without one, the nearest `LiquefyProvider`
 * does, read from the page at the moment of playing — never from
 * `prefers-reduced-motion` — and watched so a running loop stops the moment the
 * provider turns motion off.
 */
export const useMotionGate = (ref: RefObject<Element | null>, motion: boolean | undefined) => {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (motion !== undefined || typeof MutationObserver === 'undefined') return
    const provider = ref.current?.closest(`[${MOTION_ATTRIBUTE}]`)
    if (!provider) return
    const observer = new MutationObserver(() => setRevision((value) => value + 1))
    observer.observe(provider, { attributeFilter: [MOTION_ATTRIBUTE], attributes: true })
    return () => observer.disconnect()
  }, [motion, ref])

  return {
    allowed: (): boolean => motion ?? motionAround(ref.current),
    revision,
  }
}

const GEOMETRY = 'path, circle, ellipse, line, polyline, polygon, rect'
/** Containers whose contents are referenced rather than drawn where they stand. */
const UNDRAWN = 'clipPath, defs, marker, mask, pattern, symbol'
const SHAPE_ATTRIBUTES = ['cx', 'cy', 'd', 'height', 'points', 'r', 'rx', 'ry', 'width', 'x', 'x1', 'x2', 'y', 'y1', 'y2']

/** The elements an icon draws with, in the order they were written, leaving out anything an effect added. */
export const geometryOf = (root: Element, exclude?: Element): Element[] =>
  [...root.querySelectorAll(GEOMETRY)].filter(
    (element) => !element.hasAttribute(ADDED) && !element.closest(UNDRAWN) && !(exclude?.contains(element) ?? false),
  )

/** An element's outline as subpaths, each one a stroke a pen would draw without lifting. */
export const subpathsOf = (element: Element): Subpath[] =>
  splitSubpaths(shapeCommands(element.localName, Object.fromEntries(SHAPE_ATTRIBUTES.map((name) => [name, element.getAttribute(name)]))))

/**
 * How long a stroke is in the units its dashes are measured in: `pathLength`
 * when the element declares one, the browser's own measure when it has one,
 * and the outline worked out by hand otherwise.
 */
export const strokeLength = (element: Element, commands: readonly PathCommand[]): number => {
  const declared = Number.parseFloat(element.getAttribute('pathLength') ?? '')
  if (declared > 0) return declared
  const measure = (element as SVGGeometryElement).getTotalLength
  if (typeof measure === 'function') {
    try {
      const length = measure.call(element)
      if (Number.isFinite(length) && length > 0) return length
    } catch {
      // Not rendered (display: none): fall through to the hand measure.
    }
  }
  return pathLength(commands)
}

/**
 * A `<path>` drawing `d` that looks like `source`: every attribute it has but
 * its geometry is copied over, and it goes straight after `source`, so it
 * picks up the same inherited stroke and transforms.
 */
export const strokeCopy = (source: Element, d: string): SVGPathElement => {
  const path = source.ownerDocument.createElementNS(SVG_NS, 'path')
  for (const { name, value } of [...source.attributes]) {
    if (name === 'id' || name === 'pathLength' || SHAPE_ATTRIBUTES.includes(name)) continue
    path.setAttribute(name, value)
  }
  path.setAttribute('d', d)
  path.setAttribute(ADDED, '')
  // The source may already be hidden for the copy to stand in for it.
  path.style.removeProperty('visibility')
  return path
}

/** Hides an element and returns what puts it back. */
export const hide = (element: Element): (() => void) => {
  const style = (element as SVGElement).style
  const before = style.visibility
  style.visibility = 'hidden'
  return () => {
    style.visibility = before
  }
}

/** Resolves true when every animation has finished, false as soon as one is cancelled. */
export const settled = (animations: readonly Animation[]): Promise<boolean> =>
  Promise.all(animations.map((animation) => animation.finished)).then(
    () => true,
    () => false,
  )

const STROKE_EASING = 'cubic-bezier(0.45, 0, 0.3, 1)'

/** One stroke being drawn: the element its dashes go on, how long it is, and how much of it shows. */
type Piece = { element: Element; length: number; progress: number }

/**
 * An icon's strokes, ready to be drawn on and off.
 *
 * A browser starts the dash pattern again at every moveto, so a path with two
 * subpaths would draw both at once. While it is in use, every such path is
 * hidden and stood in for by one copy per subpath; a circle, a line or a
 * single-stroke path is dashed where it is. `dispose` puts the icon back as it
 * was written.
 */
export class StrokeDrawing {
  private animations: Animation[] = []
  private readonly pieces: Piece[] = []
  private readonly undo: (() => void)[] = []

  public constructor(icon: Element, progress: number) {
    for (const element of geometryOf(icon)) {
      const subpaths = subpathsOf(element)
      if (subpaths.length === 0) continue
      if (subpaths.length === 1) {
        this.pieces.push({ element, length: strokeLength(element, subpaths[0]!), progress })
        continue
      }
      let previous: Element = element
      for (const subpath of subpaths) {
        const copy = strokeCopy(element, serializePath(subpath))
        previous.after(copy)
        previous = copy
        this.pieces.push({ element: copy, length: strokeLength(copy, subpath), progress })
        this.undo.push(() => copy.remove())
      }
      this.undo.push(hide(element))
    }
  }

  /** How much of each stroke shows right now, read off the running dashes where they are running. */
  public progress(): number[] {
    return this.pieces.map((piece) => {
      if (this.animations.length === 0) return piece.progress
      const offset = Number.parseFloat(getComputedStyle(piece.element).strokeDashoffset)
      return Number.isFinite(offset) ? progressAt(piece.length, offset) : piece.progress
    })
  }

  /**
   * Draws every stroke to `to` (1 all shown, 0 none) from wherever it is, and
   * resolves true once there — false if something stopped it first.
   */
  public run(to: number, { order, speed }: { order: DrawOrder; speed: number }): Promise<boolean> {
    const from = this.progress()
    this.stop()
    const { timings } = planDraw(
      this.pieces.map((piece, index) => ({ from: from[index]!, length: piece.length, to })),
      { order, speed },
    )
    this.animations = this.pieces.map((piece, index) => {
      piece.progress = to
      const { delay, duration } = timings[index]!
      return piece.element.animate([dashFor(piece.length, from[index]!), dashFor(piece.length, to)], {
        delay,
        // A stroke already there still needs its dash held for the others' sake.
        duration: Math.max(duration, 1),
        easing: STROKE_EASING,
        fill: 'both',
      })
    })
    return settled(this.animations)
  }

  private stop(): void {
    for (const animation of this.animations) animation.cancel()
    this.animations = []
  }

  public dispose(): void {
    this.stop()
    for (const undo of this.undo.splice(0).reverse()) undo()
  }
}

/** Plays keyframes on `element` and hands back the animation, or nothing where there is no Web Animations. */
export const play = (
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null => (canAnimate(element) ? element.animate(keyframes, options) : null)

/** Milliseconds into its run an animation is, 0 when it has not started. */
export const elapsed = (animation: Animation): number => {
  const time = animation.currentTime
  return typeof time === 'number' ? time : 0
}
