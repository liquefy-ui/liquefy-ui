import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { GlassMergeHandle } from './glass-merge'
import {
  GlassMorph,
  morphDirection,
  type MorphBox,
  type MorphFrame,
  type MorphOrigin,
} from './morph-motion'
import { useBeforePaint } from './use-before-paint'

/** A shape's size, or the size of its content wherever width or height is left out. */
export type MorphSize = {
  height?: number
  /** Corner radius. Never more than half the shorter side. */
  radius?: number
  width?: number
}

export type MorphPoint = { x: number; y: number }

/**
 * Room for the glass's cast shadow, which the lens draws inside the surface:
 * it falls up to 40px below the shape and 30px to either side (see
 * `attachGlassMerge`).
 */
const SHADOW_ROOM = { above: 22, below: 40, side: 30 }

/** Below this the glass is not drawn at all: a sliver would still bulge from the blur. */
const VISIBLE = 0.5

const originEdge = (direction: number): string => (direction === 1 ? '0' : direction === 0 ? '50%' : '100%')

/**
 * Where a layer of content sits inside its clip: pinned to the edges the glass
 * grows away from, so the glass opens around content that holds still. A
 * bounce scales it about the same point.
 */
export const layerPlacement = (origin: MorphOrigin): CSSProperties => {
  const [dx, dy] = morphDirection(origin)
  return {
    bottom: dy === -1 ? 0 : undefined,
    left: dx === 1 ? 0 : dx === 0 ? '50%' : undefined,
    position: 'absolute',
    right: dx === -1 ? 0 : undefined,
    top: dy === 1 ? 0 : dy === 0 ? '50%' : undefined,
    transformOrigin: `${dx === 1 ? 'left' : dx === 0 ? 'center' : 'right'} ${dy === 1 ? 'top' : dy === 0 ? 'center' : 'bottom'}`,
    translate: `${dx === 0 ? '-50%' : '0'} ${dy === 0 ? '-50%' : '0'}`,
  }
}

/**
 * A clip as it is first rendered: a point at the origin that cuts nothing, so
 * on the server, before there is a frame, the content still shows where it
 * will be. The first paint replaces all of it. Handed to React once and never
 * changed, so a re-render does not undo what the frames write.
 */
export const clipPlacement = (origin: MorphOrigin): CSSProperties => {
  const [dx, dy] = morphDirection(origin)
  return { height: 0, left: originEdge(dx), position: 'absolute', top: originEdge(dy), width: 0 }
}

/** The origin point on a box of `width` × `height`, in its own pixels. */
export const originPoint = (origin: MorphOrigin, width: number, height: number): MorphPoint => {
  const [dx, dy] = morphDirection(origin)
  return { x: ((1 - dx) * width) / 2, y: ((1 - dy) * height) / 2 }
}

type Shown = { current: string; previous: string | null }

/** The frost a swap started from and is heading to. */
type FrostSpan = { from: number; to: number }

/** It moves from one to the other as the new content comes in. */
const frostAt = ({ from, to }: FrostSpan, frame: MorphFrame): number => from + (to - from) * frame.reveal

type Request = { bounce: boolean; handoff: (() => HTMLElement | null | undefined) | undefined; layer: string; size: MorphSize }

export type ShowOptions = {
  /** Ends the morph with a pop. */
  bounce?: boolean
  /**
   * Hands focus on when it was inside the layer on its way out: to the first
   * thing in the new layer that takes it, or failing that to what this
   * returns. Left out, focus stays put until whatever owns it moves it — the
   * way a popover hands it back to its trigger when it closes, which a handoff
   * here would fight.
   */
  handoff?: () => HTMLElement | null | undefined
}

/** What can take focus by Tab, in the order Tab reaches it. */
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), '
  + 'textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

/**
 * The material under the glass while it holds content: the thick glass of
 * `LiquidDialog`'s panel, blurred hard enough to read over a photograph, with
 * the backdrop still moving and colouring through it. The lens over it bends
 * this rather than the bare page.
 */
const FROST: CSSProperties = {
  WebkitBackdropFilter: 'blur(calc(18px + var(--lq-frost, 0px))) saturate(1.6) brightness(1.04)',
  backdropFilter: 'blur(calc(18px + var(--lq-frost, 0px))) saturate(1.6) brightness(1.04)',
  background: 'color-mix(in srgb, var(--lq-solid-fill, rgb(30, 38, 60)) 44%, transparent)',
  pointerEvents: 'none',
  position: 'absolute',
}

export const frostStyle = (origin: MorphOrigin): CSSProperties => ({ ...clipPlacement(origin), ...FROST, visibility: 'hidden' })

type GlassMorphHookOptions = {
  animated: boolean
  /** The origin point, in the root's own pixels. Clips are laid out in the same pixels. */
  anchor: MorphPoint
  /** The corner radius for a size that does not give one. */
  defaultRadius: (height: number) => number
  /** How thick the glass is under each layer, from 0 (clear, like an icon button) to 1 (a panel's thick glass). */
  frost: (layer: string) => number
  /** The layer showing at first. */
  layer: string
  /** Called whenever the glass comes to rest, which is when an outgoing layer may go. */
  onRest: () => void
  origin: MorphOrigin
  /** The shape the glass starts in. */
  start: MorphBox
  wobbliness: number
}

export type GlassMorphHandle = {
  /** Elements registered as clips are laid exactly over the glass each frame, corners and all. */
  clipRef: (key: string) => (element: HTMLElement | null) => void
  /** The thick glass under the content, laid out like a clip and faded with the layers' `frost`. Render it before the surface, styled with `frostStyle`. */
  frostRef: (element: HTMLElement | null) => void
  glassRef: RefObject<GlassMergeHandle | null>
  /** Layers fade in and out with the content they hold and scale with a bounce. One that is not showing is inert. */
  layerRef: (key: string) => (element: HTMLElement | null) => void
  /**
   * Morphs the glass to `size`, bringing in `layer` with it if that is not the
   * one showing. A side `size` leaves open is measured from the layer, which
   * is waited for if it has not mounted yet, and followed as it changes.
   */
  show: (layer: string, size: MorphSize, options?: ShowOptions) => void
  /** The element the glass surface lives in, moved and sized around the shape each frame. */
  surfaceRef: (element: HTMLElement | null) => void
}

/** Registers elements under keys, with one stable ref callback per key. */
const useRegistry = (onAdd: (key: string) => void) => {
  const elements = useRef(new Map<string, HTMLElement>())
  const callbacks = useRef(new Map<string, (element: HTMLElement | null) => void>())
  const onAddRef = useRef(onAdd)
  onAddRef.current = onAdd
  const refFor = useCallback((key: string) => {
    let callback = callbacks.current.get(key)
    if (!callback) {
      callback = (element: HTMLElement | null) => {
        if (!element) {
          elements.current.delete(key)
          return
        }
        elements.current.set(key, element)
        onAddRef.current(key)
      }
      callbacks.current.set(key, callback)
    }
    return callback
  }, [])
  return [elements, refFor] as const
}

const px = (value: number): string => `${value.toFixed(2)}px`

const CLIP = typeof CSS !== 'undefined' && CSS.supports?.('overflow', 'clip') ? 'clip' : 'hidden'

const sameBox = (a: MorphBox, b: MorphBox): boolean =>
  a.width === b.width && a.height === b.height && a.radius === b.radius

/**
 * The machinery LiquidMorph and LiquidIsland share: one `GlassMerge` surface
 * that follows a `GlassMorph` frame by frame, clips laid exactly over the glass
 * so content is cut to its shape, and layers of content that fade across
 * whenever the glass changes what it holds. Nothing re-renders per frame.
 */
export const useGlassMorph = ({
  animated,
  anchor,
  defaultRadius,
  frost,
  layer,
  onRest,
  origin,
  start,
  wobbliness,
}: GlassMorphHookOptions): GlassMorphHandle => {
  const latestRef = useRef(start)
  const morph = useMemo(
    () => new GlassMorph(latestRef.current, { origin, wobbliness }),
    // A new feel starts from wherever the last one was heading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin, wobbliness],
  )
  const morphRef = useRef(morph)
  morphRef.current = morph
  const anchorRef = useRef(anchor)
  anchorRef.current = anchor
  const animatedRef = useRef(animated)
  animatedRef.current = animated
  const onRestRef = useRef(onRest)
  onRestRef.current = onRest
  const radiusRef = useRef(defaultRadius)
  radiusRef.current = defaultRadius
  const frostOfRef = useRef(frost)
  frostOfRef.current = frost
  const [initialFrost] = useState(() => frost(layer))
  const frostSpanRef = useRef<FrostSpan>({ from: initialFrost, to: initialFrost })
  const frostElement = useRef<HTMLElement | null>(null)

  const shownRef = useRef<Shown>({ current: layer, previous: null })
  /** The size the layer showing asked for, kept to measure it again when its content changes size. */
  const sizeRef = useRef<MorphSize>(start)
  /** A morph waiting for the layer it brings in to mount, so it can be measured. */
  const waitingRef = useRef<Request | null>(null)
  const glassRef = useRef<GlassMergeHandle | null>(null)
  const surfaceElement = useRef<HTMLElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const frameRef = useRef(0)
  const paintRef = useRef<() => void>(() => {})
  const performRef = useRef<(request: Request) => void>(() => {})

  const [clips, clipRef] = useRegistry(() => paintRef.current())
  const [layers, layerRef] = useRegistry((key) => {
    const waiting = waitingRef.current
    if (waiting?.layer === key) performRef.current(waiting)
    else paintRef.current()
  })

  const fade = useCallback((element: HTMLElement, key: string, frame: MorphFrame) => {
    const { current, previous } = shownRef.current
    const opacity = key === current ? frame.reveal : key === previous ? frame.conceal : 0
    // Left unset at full strength rather than written as 1, so that glass
    // inside the content — a button in a panel — refracts once it has arrived.
    element.style.opacity = opacity >= 1 ? '' : opacity.toFixed(3)
    element.style.transform = Math.abs(frame.bounce - 1) < 0.0005 ? '' : `scale(${frame.bounce.toFixed(4)})`
    // Only the layer showing can be reached, by pointer, keyboard or screen
    // reader — except that a layer still holding focus keeps it until whatever
    // owns focus moves it, rather than dropping it on the page.
    const away = key !== current && !element.contains(document.activeElement)
    if (element.hasAttribute('inert') !== away) element.toggleAttribute('inert', away)
    if (away) element.setAttribute('aria-hidden', 'true')
    else element.removeAttribute('aria-hidden')
  }, [])

  const paint = useCallback(() => {
    const frame = morphRef.current.frame()
    const { x, y } = anchorRef.current
    const left = x + frame.x - frame.width / 2
    const top = y + frame.y - frame.height / 2
    const visible = frame.width > VISIBLE && frame.height > VISIBLE

    const surface = surfaceElement.current
    if (surface) {
      // The surface hugs the shape and its shadow, so the filter covers no
      // more of the page than it has to on any frame.
      const surfaceLeft = Math.floor(left - SHADOW_ROOM.side)
      const surfaceTop = Math.floor(top - SHADOW_ROOM.above)
      surface.style.left = `${surfaceLeft}px`
      surface.style.top = `${surfaceTop}px`
      surface.style.width = `${Math.ceil(left + frame.width + SHADOW_ROOM.side) - surfaceLeft}px`
      surface.style.height = `${Math.ceil(top + frame.height + SHADOW_ROOM.below) - surfaceTop}px`
      glassRef.current?.setShapes(visible
        ? [{ height: frame.height, radius: frame.radius, width: frame.width, x: x + frame.x - surfaceLeft, y: y + frame.y - surfaceTop }]
        : [])
    }

    const place = (element: HTMLElement) => {
      element.style.left = px(left)
      element.style.top = px(top)
      element.style.width = px(Math.max(0, frame.width))
      element.style.height = px(Math.max(0, frame.height))
      element.style.borderRadius = px(frame.radius)
    }
    for (const clip of clips.current.values()) {
      place(clip)
      // `clip` rather than `hidden`: a hidden overflow can still be scrolled,
      // and focus moving to an input in a panel only half open scrolls the
      // content sideways to show it.
      if (clip.style.overflow !== CLIP) clip.style.overflow = CLIP
      if (clip.scrollLeft !== 0 || clip.scrollTop !== 0) clip.scrollTo(0, 0)
    }
    const thick = frostElement.current
    if (thick) {
      place(thick)
      const amount = visible ? frostAt(frostSpanRef.current, frame) : 0
      thick.style.opacity = amount >= 1 ? '' : amount.toFixed(3)
      // Not drawn at all while clear: a backdrop filter at zero opacity still costs its blur.
      thick.style.visibility = amount <= 0.001 ? 'hidden' : ''
    }
    for (const [key, element] of layers.current) fade(element, key, frame)
  }, [clips, fade, layers])
  paintRef.current = paint

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [])

  const rest = useCallback(() => {
    shownRef.current = { ...shownRef.current, previous: null }
    onRestRef.current()
  }, [])

  const run = useCallback(() => {
    // Already running: the next frame picks up the new targets.
    if (frameRef.current !== 0) return
    let last = performance.now()
    const tick = (now: number) => {
      const busy = morphRef.current.step((now - last) / 1000)
      last = now
      paintRef.current()
      if (busy) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = 0
        rest()
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [rest])

  const play = useCallback(() => {
    if (animatedRef.current) {
      run()
      return
    }
    stop()
    morphRef.current.settle()
    paintRef.current()
    rest()
  }, [rest, run, stop])

  /** Measures the layer showing again and moves the glass to fit, content unchanged. */
  const refit = useCallback((element: HTMLElement) => {
    if (shownRef.current.current === undefined || layers.current.get(shownRef.current.current) !== element) return
    const box = resolveBox(sizeRef.current, element, radiusRef.current)
    if (sameBox(box, morphRef.current.target)) return
    latestRef.current = box
    morphRef.current.resize(box)
    play()
  }, [layers, play])

  const perform = useCallback(({ bounce, handoff, layer: next, size }: Request) => {
    waitingRef.current = null
    const element = layers.current.get(next)
    const box = resolveBox(size, element, radiusRef.current)
    const swap = next !== shownRef.current.current
    const leaving = layers.current.get(shownRef.current.current)
    if (swap) {
      shownRef.current = { current: next, previous: shownRef.current.current }
      frostSpanRef.current = { from: frostAt(frostSpanRef.current, morphRef.current.frame()), to: frostOfRef.current(next) }
    }
    sizeRef.current = size
    latestRef.current = box
    morphRef.current.morphTo(box, { bounce, swap })

    // Focus inside content on its way out moves into the content coming in,
    // so a keyboard user is not left on an element that is fading away.
    if (swap && handoff && leaving?.contains(document.activeElement)) {
      const target = element?.querySelector<HTMLElement>(TABBABLE) ?? handoff()
      target?.focus({ preventScroll: true })
    }

    // A side left to the content follows it: a list that fills in as someone
    // types grows the glass under it.
    observerRef.current?.disconnect()
    if (element && (size.width === undefined || size.height === undefined) && typeof ResizeObserver !== 'undefined') {
      observerRef.current ??= new ResizeObserver((entries) => {
        for (const entry of entries) refit(entry.target as HTMLElement)
      })
      observerRef.current.observe(element)
    }
    play()
  }, [layers, play, refit])
  performRef.current = perform

  const show = useCallback((next: string, size: MorphSize, options: ShowOptions = {}) => {
    const request = { bounce: options.bounce === true, handoff: options.handoff, layer: next, size }
    const measured = size.width === undefined || size.height === undefined
    // A popup can mount its content a frame after it is opened. The morph
    // waits for it rather than heading for a size it cannot know yet.
    if (measured && !layers.current.has(next)) {
      waitingRef.current = request
      return
    }
    perform(request)
  }, [layers, perform])

  const surfaceRef = useCallback((element: HTMLElement | null) => {
    surfaceElement.current = element
    if (element) paintRef.current()
  }, [])

  const frostRefCallback = useCallback((element: HTMLElement | null) => {
    frostElement.current = element
    if (element) paintRef.current()
  }, [])

  // A new morph (a new feel) and a moved origin are drawn in place before paint.
  useBeforePaint(() => {
    paint()
  }, [anchor.x, anchor.y, morph, paint])

  // Turning motion off mid-morph lands it where it was heading.
  useEffect(() => {
    if (animated) return
    stop()
    morph.settle()
    paint()
  }, [animated, morph, paint, stop])

  useEffect(() => () => {
    stop()
    observerRef.current?.disconnect()
  }, [stop])

  return { clipRef, frostRef: frostRefCallback, glassRef, layerRef, show, surfaceRef }
}

/** The size `size` asks for, filled in from `element`'s laid-out box wherever it leaves a side open. */
export const resolveBox = (
  size: MorphSize,
  element: HTMLElement | null | undefined,
  defaultRadius: (height: number) => number,
): MorphBox => {
  const width = size.width ?? element?.offsetWidth ?? 0
  const height = size.height ?? element?.offsetHeight ?? 0
  return { height, radius: Math.max(0, Math.min(size.radius ?? defaultRadius(height), width / 2, height / 2)), width }
}

/**
 * The layer coming in and the one going out. The outgoing one stays mounted
 * until the glass is at rest; it is worked out during render rather than in an
 * effect, so a layer on its way out is never unmounted and mounted again for a
 * frame in between. `release` lets it go.
 */
export const useLayers = (current: string) => {
  const [layers, setLayers] = useState<Shown>({ current, previous: null })
  let shown = layers
  if (layers.current !== current) {
    shown = { current, previous: layers.current }
    setLayers(shown)
  }
  const release = useCallback(() => {
    setLayers((state) => (state.previous === null ? state : { ...state, previous: null }))
  }, [])
  return [shown, release] as const
}
