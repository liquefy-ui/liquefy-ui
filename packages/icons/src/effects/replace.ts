import {
  ADDED,
  canAnimate,
  geometryOf,
  hide,
  play,
  settled,
  strokeCopy,
  strokeLength,
  subpathsOf,
  SVG_NS,
} from './dom'
import { isRelated, matchStrokes, type StrokeMatch } from './match'
import {
  atSpeed,
  dashFor,
  planDraw,
  pulseTrack,
  springAt,
  springProgress,
  settleTime,
  trackKeyframes,
  type Spring,
} from './motion'
import { blendPath, serializePath, type Subpath } from './path'

export type ReplaceTransition = 'draw' | 'magic' | 'scale'
export type ReplaceFallback = 'draw' | 'scale'

/** A replacement under way: settles to true when it ends by itself, and `stop` ends it now, on the new icon. */
export type ReplaceSession = { done: Promise<boolean>; stop: () => void }

type Stroke = { context: string; element: Element; subpath: Subpath }

/** The transforms between an element and `root`, innermost first: two strokes only match under the same ones. */
const contextOf = (element: Element, root: Element): string => {
  const transforms: string[] = []
  for (let node: Element | null = element; node && node !== root; node = node.parentElement) {
    const transform = node.getAttribute('transform')
    if (transform) transforms.push(transform)
  }
  return transforms.join('|')
}

const strokesOf = (root: Element, exclude?: Element): Stroke[] =>
  geometryOf(root, exclude).flatMap((element) =>
    subpathsOf(element).map((subpath) => ({ context: contextOf(element, root), element, subpath })),
  )

/** The presentation attributes an icon can set on its `<svg>` for everything inside to inherit. */
const INHERITED = [
  'color', 'fill', 'fill-opacity', 'fill-rule', 'opacity', 'stroke', 'stroke-linecap',
  'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width',
]

/**
 * A copy of the outgoing icon's drawing, put inside the incoming `<svg>` for
 * the length of the change, so both can be animated in one coordinate space
 * without either one needing a box of its own.
 */
const layerOf = (previous: Element, next: Element): SVGGElement => {
  const layer = next.ownerDocument.createElementNS(SVG_NS, 'g')
  for (const name of INHERITED) {
    const value = previous.getAttribute(name)
    if (value !== null) layer.setAttribute(name, value)
  }
  layer.setAttribute(ADDED, 'previous')
  for (const child of [...previous.childNodes]) {
    // A second title would rename the incoming icon while the change runs.
    if (child.nodeType === 1 && ['desc', 'title'].includes((child as Element).localName)) continue
    layer.appendChild(child.cloneNode(true))
  }
  next.appendChild(layer)
  return layer
}

/** Supports `d` as an animatable CSS property; Safari does not, and morphs fall back to drawing there. */
const canMorph = (): boolean =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('d', 'path("M0 0")')

const MORPH_SPRING: Spring = { damping: 0.6, response: 0.42 }
const GROW_SPRING: Spring = { damping: 0.55, response: 0.38 }
const SHRINK_TO = 0.6

/** Everything a replacement started, and how to take it all back down. */
class Change {
  public readonly animations: Animation[] = []
  private readonly undo: (() => void)[] = []
  private stopped = false

  public constructor(private readonly layer: Element) {}

  public add(animation: Animation | null): void {
    if (animation) this.animations.push(animation)
  }

  public onStop(undo: () => void): void {
    this.undo.push(undo)
  }

  /** A copy of `subpath` drawn like `element`, placed after it and after any copy of it placed before. */
  public copy(element: Element, subpath: Subpath, after: Map<Element, Element>): SVGPathElement {
    const copy = strokeCopy(element, serializePath(subpath))
    ;(after.get(element) ?? element).after(copy)
    after.set(element, copy)
    this.onStop(() => copy.remove())
    return copy
  }

  public stop = (): void => {
    if (this.stopped) return
    this.stopped = true
    for (const animation of this.animations) animation.cancel()
    this.layer.remove()
    for (const undo of this.undo.splice(0).reverse()) undo()
  }

  public session(): ReplaceSession {
    const done = settled(this.animations).then((finished) => {
      if (finished) this.stop()
      return finished
    })
    return { done, stop: this.stop }
  }
}

/**
 * The stroke-by-stroke change: the strokes only the outgoing icon has draw
 * off, last first; strokes in both stay exactly where they are; strokes
 * written alike turn into each other on a spring that overshoots a little and
 * settles; and the strokes only the incoming icon has draw on, starting
 * `overlap` of the way through the drawing off.
 */
const redraw = (
  change: Change,
  outgoing: Stroke[],
  incoming: Stroke[],
  match: StrokeMatch,
  { morph, overlap, speed }: { morph: boolean; overlap: number; speed: number },
): void => {
  const morphs = morph ? match.morphs : []
  const removed = morph ? match.removed : [...match.removed, ...match.morphs.map(([from]) => from)].sort((a, b) => a - b)
  const added = morph ? match.added : [...match.added, ...match.morphs.map(([, to]) => to)].sort((a, b) => a - b)

  // Nothing of the outgoing icon shows but what is drawn off; the layer goes when the change does.
  for (const element of new Set(outgoing.map((stroke) => stroke.element))) hide(element)

  // An incoming element only stays as it is if all of it is shared; any other
  // is hidden and stood in for, a copy per subpath, while the change runs.
  const shared = new Set(match.shared.map(([, to]) => to))
  const stand = new Map<number, Element>()
  const after = new Map<Element, Element>()
  const byElement = new Map<Element, number[]>()
  incoming.forEach((stroke, index) => byElement.set(stroke.element, [...(byElement.get(stroke.element) ?? []), index]))
  for (const [element, indices] of byElement) {
    if (indices.every((index) => shared.has(index))) continue
    change.onStop(hide(element))
    for (const index of indices) stand.set(index, change.copy(element, incoming[index]!.subpath, after))
  }

  // Lengths come from the copies: a path with two subpaths measures as both.
  const erasing = removed.map((index) => {
    const stroke = outgoing[index]!
    const copy = change.copy(stroke.element, stroke.subpath, after)
    return { copy, length: strokeLength(copy, stroke.subpath) }
  })
  const off = planDraw(erasing.map(({ length }) => ({ from: 1, length, to: 0 })), { speed })
  erasing.forEach(({ copy, length }, position) => {
    const { delay, duration } = off.timings[position]!
    change.add(play(copy, [dashFor(length, 1), dashFor(length, 0)], {
      delay, duration: Math.max(duration, 1), easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'both',
    }))
  })

  if (morphs.length > 0) {
    const { duration, samples } = springProgress(MORPH_SPRING)
    for (const [from, to] of morphs) {
      const keyframes = samples.map((progress, frame) => ({
        d: `path("${serializePath(blendPath(outgoing[from]!.subpath, incoming[to]!.subpath, progress))}")`,
        offset: frame / (samples.length - 1),
      }))
      change.add(play(stand.get(to)!, keyframes, { duration: duration / speed, easing: 'linear', fill: 'both' }))
    }
  }

  const drawing = added.map((index) => {
    const copy = stand.get(index)!
    return { copy, length: strokeLength(copy, incoming[index]!.subpath) }
  })
  const on = planDraw(drawing.map(({ length }) => ({ from: 0, length, to: 1 })), { speed })
  const start = off.total * overlap
  drawing.forEach(({ copy, length }, position) => {
    const { delay, duration } = on.timings[position]!
    change.add(play(copy, [dashFor(length, 0), dashFor(length, 1)], {
      delay: start + delay, duration: Math.max(duration, 1), easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'both',
    }))
  })
}

/** The middle of the icon's drawing area, which the scale change grows and shrinks about. */
const centreOf = (svg: Element): [number, number] => {
  const box = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  if (box.length === 4 && box.every(Number.isFinite)) return [box[0]! + box[2]! / 2, box[1]! + box[3]! / 2]
  return [12, 12]
}

/**
 * The plain change, SF Symbols' down-up: the outgoing icon shrinks away and
 * fades, the incoming one grows in from the same size on a spring, swelling a
 * touch past full size before it settles.
 */
const rescale = (change: Change, layer: Element, next: Element, speed: number): void => {
  const [x, y] = centreOf(next)
  const about = (scale: number) => `translate(${x}px, ${y}px) scale(${scale}) translate(${-x}px, ${-y}px)`
  change.add(play(layer, [{ opacity: 1, transform: about(1) }, { opacity: 0, transform: about(SHRINK_TO) }], {
    duration: 160 / speed, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards',
  }))

  const duration = settleTime(GROW_SPRING, -1, 0, 0.002) * 1000
  const frames = Math.max(1, Math.ceil((duration / 1000) * 60))
  const grow = Array.from({ length: frames + 1 }, (_, frame) => {
    const progress = frame === frames ? 1 : 1 + springAt(GROW_SPRING, -1, 0, (frame / frames) * (duration / 1000)).value
    return { offset: frame / frames, transform: about(SHRINK_TO + (1 - SHRINK_TO) * progress) }
  })
  const delay = 60 / speed
  for (const child of [...next.children]) {
    if (child === layer || ['defs', 'desc', 'title'].includes(child.localName)) continue
    change.add(play(child, grow, { composite: 'add', delay, duration: duration / speed, easing: 'linear', fill: 'backwards' }))
    change.add(play(child, [{ opacity: 0 }, { opacity: 1 }], { delay, duration: 140 / speed, easing: 'linear', fill: 'backwards' }))
  }
}

/**
 * Changes the icon on screen from `previous` (the `<svg>` that was there, now
 * off the page) to `next` (the one React has just put in its place), and
 * hands back the change, or nothing when there is nothing to animate with or
 * the two do not share a drawing area.
 */
export const replaceIcon = (
  previous: Element,
  next: Element,
  { fallback, speed, transition }: { fallback: ReplaceFallback; speed: number; transition: ReplaceTransition },
): ReplaceSession | null => {
  if (!canAnimate(next)) return null
  if ((previous.getAttribute('viewBox') ?? '') !== (next.getAttribute('viewBox') ?? '')) return null
  const rate = speed > 0 && Number.isFinite(speed) ? speed : 1

  const layer = layerOf(previous, next)
  const change = new Change(layer)
  const outgoing = strokesOf(layer)
  const incoming = strokesOf(next, layer)

  let kind: ReplaceTransition = transition
  let match: StrokeMatch | undefined
  if (kind === 'magic') {
    match = matchStrokes(outgoing, incoming)
    if (!isRelated(match)) kind = fallback
  }

  if (kind === 'scale') {
    rescale(change, layer, next, rate)
  } else if (kind === 'draw') {
    const everything: StrokeMatch = {
      added: incoming.map((_, index) => index),
      morphs: [],
      removed: outgoing.map((_, index) => index),
      shared: [],
    }
    redraw(change, outgoing, incoming, everything, { morph: false, overlap: 0.85, speed: rate })
  } else {
    redraw(change, outgoing, incoming, match!, { morph: canMorph(), overlap: 0.45, speed: rate })
    const give = atSpeed(pulseTrack(0.06), rate)
    change.add(play(next, trackKeyframes(give), { composite: 'add', duration: give.duration, easing: 'linear' }))
  }

  return change.session()
}
