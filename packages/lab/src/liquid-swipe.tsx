import { clamp } from '@liquefy-ui/core'
import { LiquidIconButton, useLiquefyConfig, useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'
import {
  Children,
  isValidElement,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  version,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { VelocityTracker } from './sheet-motion'
import { handleSize, SwipeDeck, waveShape, wavePath, type SwipeSide, type SwipeSize } from './swipe-motion'
import { useBeforePaint } from './use-before-paint'

export type LiquidSwipeProps = LiquidStyleProps & {
  /**
   * The pages, in order, one child each. Give every page its own background:
   * a turn is the next page's colour flooding in over this one, and glass on
   * a page bends that page's own background.
   */
  children?: ReactNode
  className?: string
  /** The page an uncontrolled carousel starts on. */
  defaultIndex?: number
  /** The page showing, when controlled. A new one comes in on a wave from the nearer side. */
  index?: number
  /** The carousel's accessible name. */
  label: string
  /** Whether the last page leads on to the first and the first back to the last. */
  loop?: boolean
  /** The next-page button's accessible name and tooltip. */
  nextLabel?: string
  /** Called with the page the carousel is heading for, after a swipe, a key or a press on a handle. */
  onIndexChange?: (index: number) => void
  /** Each page's accessible name, from its index and the number of pages. Defaults to "2 of 4". */
  pageLabel?: (index: number, count: number) => string
  /** The previous-page button's accessible name and tooltip. */
  previousLabel?: string
  style?: CSSProperties
  /** A colour mixed into the glass of the two handles' buttons. */
  tint?: string
}

/** The handles rest at this share of the height. */
const HANDLE_Y = 0.5
/** A finger moves this far before it counts as a swipe, a scroll or neither. */
const SLOP = 6
/** The hardest flick a wave is handed, in pixels a second. */
const MAX_RELEASE = 6000
/** The button rides this far out along its handle's bulge. */
const RIDE = 0.46
/** As its wave comes in, the button shrinks away over this much progress. */
const SHRINK_BY = 0.22
/** Where a press does not start a swipe, so text can still be selected in a field. */
const NO_DRAG = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
/** Where the arrow keys already mean something, so they do not turn the page. */
const KEY_OWNERS = [
  NO_DRAG,
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="option"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="gridcell"]',
  '[role="treeitem"]',
  '[role="toolbar"] *',
].join(', ')

const SIDES: readonly SwipeSide[] = ['right', 'left']

const CLIP = typeof CSS !== 'undefined' && CSS.supports?.('overflow', 'clip') ? 'clip' : 'hidden'

/**
 * `inert` as this React writes it: React 19 knows it as a boolean, React 18
 * passes attributes it does not know through as strings and drops `true`.
 */
const INERT = (Number.parseInt(version, 10) >= 19 ? true : '') as unknown as boolean

const defaultPageLabel = (index: number, count: number): string => `${index + 1} of ${count}`

/** The liquefy-ui chevrons, 24 × 24 with a 1.8 stroke, drawn here so lab needs no icon package. */
const Chevron = ({ side }: { side: SwipeSide }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={18}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
    width={18}
  >
    <path d={side === 'right' ? 'm9.5 6.5 5 5.5-5 5.5' : 'M14.5 6.5 9.5 12l5 5.5'} />
  </svg>
)

const px = (value: number): string => `${value.toFixed(2)}px`

type Gesture = {
  id: number
  mode: 'pending' | 'swipe' | 'off'
  /** Where the drag started, as a pull: positive on the right, negative on the left. */
  startPull: number
  startX: number
  startY: number
  target: Element
  top: number
  type: string
}

/** Whether anything from `target` up to `root` can still scroll sideways the way a finger moving by `dx` would scroll it. */
const scrollsSideways = (target: Element, root: Element, dx: number): boolean => {
  for (let node: Element | null = target; node && node !== root && root.contains(node); node = node.parentElement) {
    if (node.scrollWidth <= node.clientWidth + 1) continue
    const overflow = getComputedStyle(node).overflowX
    if (overflow !== 'auto' && overflow !== 'scroll') continue
    // A finger moving left scrolls toward the end.
    if (dx < 0 ? node.scrollLeft + node.clientWidth < node.scrollWidth - 1 : node.scrollLeft > 0) return true
  }
  return false
}

/**
 * Pages turned the way Cuberto's liquid swipe turns them. The next page peeks
 * in at the right edge as a small bulge with a glass button on it, and the
 * previous one at the left. Pull either sideways and its bulge swells like a
 * wave, following the finger's height; let go past the middle, or flick it,
 * and the page floods across the room and lands with a slosh, then the new
 * neighbours' handles pop in. Let go short of it and the wave springs back to
 * a handle.
 *
 * Each page is cut out with `clip-path: path()` — a strip along the edge and a
 * bell of two cubics — redrawn every frame. A clip makes the page a backdrop
 * root, so glass on it bends the page's own background, which is what is
 * under it anyway; the page that covers the room has no clip at all.
 *
 * It is a carousel to assistive technology: a labelled region of slides named
 * "n of total", previous and next buttons, the arrow keys, and a polite live
 * region so a new page is read out. Pages out of view are inert, except one
 * that still holds focus, which hands it to the page coming in once it has.
 */
export const LiquidSwipe = ({
  children,
  className,
  defaultIndex = 0,
  index: indexProp,
  label,
  loop = false,
  nextLabel = 'Next page',
  onIndexChange,
  pageLabel = defaultPageLabel,
  previousLabel = 'Previous page',
  style,
  styles,
  tint,
}: LiquidSwipeProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion.
  const animated = config.motion
  const root = useLiquidStyles('lq-liquid-swipe', { className, style, styles })

  const pages = useMemo(() => Children.toArray(children).filter((child) => child !== null && child !== undefined), [children])
  const count = pages.length
  const last = Math.max(0, count - 1)

  const controlled = indexProp !== undefined
  const [indexState, setIndexState] = useState(() => clamp(Math.round(defaultIndex), 0, last))
  const index = clamp(Math.round(controlled ? indexProp : indexState), 0, last)
  const [, rerender] = useReducer((tick: number) => tick + 1, 0)

  const rootRef = useRef<HTMLElement | null>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const handleRefs = useRef<Record<SwipeSide, HTMLDivElement | null>>({ left: null, right: null })
  const sizeRef = useRef<SwipeSize | null>(null)
  const frameRef = useRef(0)
  const gestureRef = useRef<Gesture | null>(null)
  const trackerRef = useRef(new VelocityTracker())
  const draggedRef = useRef(false)
  /** The way the last index change was asked for, so the wave comes in from that side. */
  const directionRef = useRef<SwipeSide | undefined>(undefined)
  const [focusedPage, setFocusedPage] = useState<number | null>(null)
  const focusedRef = useRef<number | null>(null)
  focusedRef.current = focusedPage

  const restY = () => (sizeRef.current?.height ?? 0) * HANDLE_Y

  const deckRef = useRef<SwipeDeck | null>(null)
  const deck = useMemo(() => {
    const previous = deckRef.current
    const next = new SwipeDeck(previous?.target ?? index, {
      centerY: restY(),
      count,
      liquid: animated,
      loop,
      wobbliness: config.wobbliness,
    })
    return next
    // A new feel starts from the page the last one was on; new pages are handed over below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, config.wobbliness])
  deckRef.current = deck

  const paintedBase = useRef(deck.base)

  /** Moves focus to the page that has come in, when it was on the page that went. */
  const handOverFocus = useCallback(() => {
    const from = paintedBase.current
    const to = deck.base
    paintedBase.current = to
    if (from === to || focusedRef.current !== from) return
    pageRefs.current[to]?.focus({ preventScroll: true })
  }, [deck])

  const paint = useCallback(() => {
    const size = sizeRef.current
    if (!size) return
    const shapes = Object.fromEntries(SIDES.map((side) => {
      const frame = deck.waves[side].motion.frame()
      return [side, waveShape(frame.progress, size, { bulge: frame.bulge, centerY: frame.centerY, presence: frame.presence })]
    })) as Record<SwipeSide, ReturnType<typeof waveShape>>

    pageRefs.current.forEach((element, page) => {
      if (!element) return
      let clip: string | null = null
      let layer = 0
      if (page === deck.base) {
        layer = 1
      } else {
        const outlines: string[] = []
        for (const side of SIDES) {
          if (deck.waves[side].page !== page) continue
          const outline = wavePath(shapes[side], size, side)
          if (!outline) continue
          outlines.push(outline)
          layer = Math.max(layer, side === deck.leading ? 3 : 2)
        }
        clip = outlines.length > 0 ? `path('${outlines.join(' ')}')` : null
      }
      const shown = layer > 0
      element.style.visibility = shown ? 'visible' : 'hidden'
      element.style.zIndex = String(layer)
      element.style.clipPath = clip ?? 'none'
    })

    const handle = handleSize(size)
    for (const side of SIDES) {
      const element = handleRefs.current[side]
      if (!element) continue
      const wave = deck.waves[side]
      const shape = shapes[side]
      const frame = wave.motion.frame()
      // The button rides the bulge out and shrinks away as its wave comes in.
      const away = clamp(frame.progress / SHRINK_BY, 0, 1)
      const scale = wave.page === null ? 0 : frame.presence * (1 - away * away)
      const inward = shape.edge + Math.max(0, Math.min(shape.horRadius, handle.reach * 1.4)) * RIDE
      const x = side === 'right' ? size.width - inward : inward
      // Scaled away rather than hidden: a button that turned the page keeps
      // focus while its wave goes by, and gets it back as its handle pops in.
      element.style.transform = `translate(${px(x)}, ${px(shape.centerY)}) translate(-50%, -50%) scale(${Math.max(0, scale).toFixed(4)})`
    }

    if (paintedBase.current !== deck.base) handOverFocus()
  }, [deck, handOverFocus])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [])

  const run = useCallback(() => {
    if (!animated) {
      if (!deck.waves.left.motion.held && !deck.waves.right.motion.held) deck.finish()
      paint()
      return
    }
    // Already running: the next frame picks up the new targets.
    if (frameRef.current !== 0) return
    let previous = performance.now()
    const tick = (now: number) => {
      frameRef.current = 0
      const busy = deck.step((now - previous) / 1000)
      previous = now
      paint()
      if (busy) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [animated, deck, paint])

  // A new deck — motion switched, or a new wobbliness — takes over from the
  // last one's frame loop, which would otherwise go on drawing the old one.
  useBeforePaint(() => stop, [deck, stop])

  // New pages or a new loop setting; and a page asked for that the deck is
  // not on its way to — a controlled index that moved, or one that refused
  // the page a swipe chose.
  useBeforePaint(() => {
    deck.configure(count, loop)
    if (deck.target !== index) {
      deck.goTo(index, directionRef.current)
      directionRef.current = undefined
    }
    run()
  })

  // The room is the carousel's own box.
  useBeforePaint(() => {
    const element = rootRef.current
    if (!element) return undefined
    const measure = () => {
      const width = element.clientWidth || window.innerWidth
      const height = element.clientHeight || window.innerHeight
      const previous = sizeRef.current
      if (previous?.width === width && previous.height === height) return
      sizeRef.current = { height, width }
      deck.setRest(height * HANDLE_Y)
      paint()
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [deck, paint])

  // Whatever React drew, the frame is the deck's.
  useBeforePaint(() => {
    paint()
  })

  /** Asks for page `next`, coming in from `side`: an uncontrolled carousel takes it, a controlled one reports it. */
  const request = (next: number, side?: SwipeSide) => {
    if (count === 0) return
    directionRef.current = side
    if (!controlled) setIndexState(next)
    if (next !== index) onIndexChange?.(next)
    // A controlled caller that keeps its index still gets a render, which
    // sends the deck back to the page it is on.
    rerender()
  }

  const step = (side: SwipeSide) => {
    const next = deck.neighbour(side, index)
    if (next !== null) request(next, side)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const side = event.key === 'ArrowRight' ? 'right' : event.key === 'ArrowLeft' ? 'left' : null
    if (!side) return
    if (event.target instanceof Element && event.target.closest(KEY_OWNERS)) return
    event.preventDefault()
    step(side)
  }

  /** Lets go of a swipe at `velocity`, in pixels a second along the screen, positive to the right. */
  const letGo = (velocity: number) => {
    const width = sizeRef.current?.width ?? 1
    const held = deck.waves.right.motion.held ? 'right' : deck.waves.left.motion.held ? 'left' : null
    // A wave from the right comes in as the finger moves left.
    const onward = held === 'right' ? -velocity : velocity
    const next = deck.letGo(clamp(onward, -MAX_RELEASE, MAX_RELEASE), width)
    if (rootRef.current) rootRef.current.style.userSelect = ''
    run()
    if (next !== index) request(next, held ?? undefined)
  }

  const pullAt = (gesture: Gesture, x: number) => {
    const width = sizeRef.current?.width ?? 1
    return gesture.startPull + (gesture.startX - x) / width
  }

  /** Decides what a move that has left the slop is for: turning the page, or scrolling something. */
  const decide = (gesture: Gesture, x: number, y: number, time: number) => {
    const dx = x - gesture.startX
    const dy = y - gesture.startY
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return
    const element = rootRef.current
    if (!element || Math.abs(dy) > Math.abs(dx) || scrollsSideways(gesture.target, element, dx)) {
      gesture.mode = 'off'
      return
    }
    gesture.mode = 'swipe'
    // Caught where it is, and measured from here on so the slop does not jump it.
    gesture.startPull = deck.grab()
    gesture.startX = x
    trackerRef.current.reset(time, x)
    element.style.userSelect = 'none'
    window.getSelection?.()?.removeAllRanges()
    try {
      element.setPointerCapture(gesture.id)
    } catch {
      // A pointer that is already gone has nothing to capture.
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    draggedRef.current = false
    gestureRef.current = null
    const target = event.target
    if (count < 2 || !(target instanceof Element)) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (target.closest(NO_DRAG)) return
    gestureRef.current = {
      id: event.pointerId,
      mode: 'pending',
      startPull: 0,
      startX: event.clientX,
      startY: event.clientY,
      target,
      top: rootRef.current?.getBoundingClientRect().top ?? 0,
      type: event.pointerType,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    if (gesture.mode === 'pending') decide(gesture, event.clientX, event.clientY, event.timeStamp)
    if (gesture.mode !== 'swipe') return
    deck.drag(pullAt(gesture, event.clientX), event.clientY - gesture.top)
    trackerRef.current.add(event.timeStamp, event.clientX)
    run()
  }

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    gestureRef.current = null
    if (gesture.mode !== 'swipe') return
    deck.drag(pullAt(gesture, event.clientX), event.clientY - gesture.top)
    trackerRef.current.add(event.timeStamp, event.clientX)
    draggedRef.current = true
    letGo(trackerRef.current.velocity(event.timeStamp))
  }

  const handlePointerCancel = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    gestureRef.current = null
    if (gesture.mode === 'swipe') letGo(0)
  }

  const pageOf = (node: EventTarget | null): number | null => {
    if (!(node instanceof Node)) return null
    const found = pageRefs.current.findIndex((element) => element?.contains(node))
    return found === -1 ? null : found
  }

  const handleFocus = (event: FocusEvent<HTMLElement>) => setFocusedPage(pageOf(event.target))
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (pageOf(event.relatedTarget) === null) setFocusedPage(null)
  }

  const handles: Record<SwipeSide, { label: string; page: number | null }> = {
    left: { label: previousLabel, page: deck.neighbour('left', index) },
    right: { label: nextLabel, page: deck.neighbour('right', index) },
  }

  return (
    <section
      aria-label={label}
      aria-roledescription="carousel"
      className={root.className}
      onBlur={handleBlur}
      onClickCapture={(event) => {
        // The press that ends a swipe is not a press on whatever it ended over.
        if (!draggedRef.current) return
        draggedRef.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={rootRef}
      style={{
        display: 'grid',
        isolation: 'isolate',
        overflow: CLIP,
        position: 'relative',
        // Up and down still scroll the page; sideways is the carousel's.
        touchAction: 'pan-y pinch-zoom',
        ...root.style,
      }}
    >
      <div aria-live="polite" style={{ display: 'grid', gridArea: '1 / 1', gridTemplate: '1fr / 1fr', minHeight: 0, minWidth: 0 }}>
        {pages.map((page, position) => {
          const away = position !== index && focusedPage !== position
          return (
            <div
              aria-label={pageLabel(position, count)}
              aria-roledescription="slide"
              key={isValidElement(page) && page.key !== null ? page.key : position}
              ref={(element) => {
                pageRefs.current[position] = element
              }}
              role="group"
              style={{
                display: 'grid',
                gridArea: '1 / 1',
                minHeight: 0,
                minWidth: 0,
                outline: 'none',
                position: 'relative',
                // Until the room is measured, only the page showing is drawn.
                visibility: position === index ? undefined : 'hidden',
                zIndex: position === index ? 1 : 0,
              }}
              tabIndex={-1}
              {...(away ? { inert: INERT } : {})}
            >
              {page}
            </div>
          )
        })}
      </div>
      {count > 1 && SIDES.map((side) => (
        <div
          key={side}
          ref={(element) => {
            handleRefs.current[side] = element
          }}
          style={{
            left: 0,
            pointerEvents: 'none',
            position: 'absolute',
            top: 0,
            // Until the room is measured there is nowhere to put it.
            transform: 'scale(0)',
            zIndex: 4,
          }}
        >
          <LiquidIconButton
            disabled={handles[side].page === null}
            label={handles[side].label}
            onClick={() => step(side)}
            shape="circle"
            size="sm"
            style={{ pointerEvents: 'auto' }}
            tint={tint}
          >
            <Chevron side={side} />
          </LiquidIconButton>
        </div>
      ))}
    </section>
  )
}
