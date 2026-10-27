import { Dialog } from '@base-ui/react/dialog'
import { clamp, type GlassMergeShape } from '@liquefy-ui/core'
import {
  LiquidIconButton,
  useLiquefyConfig,
  useLiquefyPortalContainer,
  useLiquidStyles,
  type LiquidStyleProps,
} from '@liquefy-ui/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import { GlassMerge, type GlassMergeHandle } from './glass-merge'
import {
  chooseStop,
  SheetMotion,
  sheetBox,
  sheetStops,
  VelocityTracker,
  type ElasticSheetSnapPoint,
  type SheetLimits,
  type SheetStop,
} from './sheet-motion'
import { useBeforePaint } from './use-before-paint'

export type ElasticSheetProps = LiquidStyleProps & {
  /** The content, in a body that scrolls once the sheet is at its tallest. */
  children?: ReactNode
  className?: string
  /**
   * Whether a dismissible sheet shows a close button in its header. Off, it is
   * put away as a maps app's sheet is: a flick down, Escape, or a press outside
   * a modal one.
   */
  closeButton?: boolean
  /** The close button's accessible name and tooltip. */
  closeLabel?: string
  /**
   * The element the sheet moves in, instead of the viewport. Give it a
   * position and clip its overflow; snap points are measured against its
   * height. It must be inside the `LiquefyProvider`.
   */
  container?: HTMLElement | RefObject<HTMLElement | null> | null
  defaultOpen?: boolean
  /** The snap point an uncontrolled sheet opens at. Defaults to the first one. */
  defaultSnap?: ElasticSheetSnapPoint
  /**
   * Whether the person can put the sheet away: a flick down, Escape, the close
   * button (unless `closeButton` is off), and a press outside a modal one. Off,
   * the lowest snap point holds against a rubber band and only `open` closes it.
   */
  dismissible?: boolean
  /** The grabber's accessible name. */
  grabberLabel?: string
  /** The sheet's accessible name when it has no `title`. */
  label?: string
  /** The widest the sheet gets, in pixels. It is centred in anything wider. */
  maxWidth?: number
  /**
   * Dims what is behind, keeps focus inside and locks the page's scroll. Off,
   * the page stays live around the sheet, as a map does under its sheet.
   */
  modal?: boolean
  onOpenChange?: (open: boolean) => void
  /** Called with the snap point the sheet is heading for, after a drag, a key or a press on the grabber. */
  onSnapChange?: (snap: ElasticSheetSnapPoint) => void
  open?: boolean
  /** The snap point it rests at, when controlled. */
  snap?: ElasticSheetSnapPoint
  /**
   * The heights it rests at: `'50%'` or `0.5` is half the room, `'320px'` or
   * `320` is exact. The room is the container's height less `topInset`.
   */
  snapPoints?: readonly ElasticSheetSnapPoint[]
  style?: CSSProperties
  /** A colour mixed into the glass. */
  tint?: string
  title?: ReactNode
  /** Space kept clear above the sheet at its tallest, in pixels. */
  topInset?: number
  /** An element that opens the sheet, rendered where the sheet is. Focus goes back to it on close. */
  trigger?: ReactElement
}

const DEFAULT_SNAP_POINTS: readonly ElasticSheetSnapPoint[] = ['50%', '100%']

/** The height the top edge sits at while the sheet is out of view: far enough under the room for the rim to go too. */
const HIDDEN = -64
/** A finger moves this far before it counts as dragging, scrolling or neither. */
const SLOP = 5
/** The hardest flick the spring is handed, in pixels a second. */
const MAX_RELEASE = 5000
/** Gap the glass bridges between the sheet and the tongue reaching out of it. */
const SPACING = 18
const BEZEL = 16
/** The tongue's width where it leaves the sheet. */
const TONGUE_WIDTH = 64
/**
 * Room for the glass's cast shadow, which the lens draws inside the surface:
 * it falls up to 40px below the shape and 30px to either side (see
 * `attachGlassMerge`).
 */
const SHADOW_ROOM = { above: 22, below: 40, side: 30 }
/** Where a press does not start a drag, so text can still be selected in a field. */
const NO_DRAG = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * The thick glass under the content: `LiquidDrawer`'s panel, blurred hard
 * enough to read over a photograph with the backdrop still colouring through.
 * The lens over it bends this rather than the bare page.
 */
const frostStyle = (transparency: boolean): CSSProperties => ({
  WebkitBackdropFilter: transparency ? 'blur(calc(20px + var(--lq-frost, 0px))) saturate(1.7) brightness(1.06)' : undefined,
  backdropFilter: transparency ? 'blur(calc(20px + var(--lq-frost, 0px))) saturate(1.7) brightness(1.06)' : undefined,
  background: transparency
    ? 'color-mix(in srgb, var(--lq-solid-fill, rgb(30, 38, 60)) 56%, transparent)'
    : 'var(--lq-solid-fill, rgb(30, 38, 60))',
  pointerEvents: 'none',
  position: 'absolute',
  top: '100%',
})

const CloseGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={14}
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
    width={14}
  >
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </svg>
)

const px = (value: number): string => `${value.toFixed(2)}px`

const CLIP = typeof CSS !== 'undefined' && CSS.supports?.('overflow', 'clip') ? 'clip' : 'hidden'

type Size = { height: number; width: number }

type Gesture = {
  /** Whether the press began inside the scrolling body, where the body may want the move instead. */
  fromBody: boolean
  id: number
  mode: 'pending' | 'sheet' | 'off'
  roomLeft: number
  startRaw: number
  startX: number
  startY: number
  target: Element
  type: string
}

/** Whether anything from `target` up to `body` is scrolled down, so a pull down would scroll it back first. */
const scrolledDown = (target: Element, body: HTMLElement): boolean => {
  for (let node: Element | null = target; node && body.contains(node); node = node.parentElement) {
    if (node.scrollTop > 0) return true
  }
  return false
}

const resolveContainer = (container: ElasticSheetProps['container']): HTMLElement | null =>
  container && 'current' in container ? container.current : container ?? null

/**
 * A sheet pulled up from the bottom, as in a maps app: it follows the finger,
 * stretches against a rubber band past its tallest and lowest heights, and
 * when let go coasts to the snap point the flick carries it to, swinging past
 * and settling with a quiver. A hard flick up runs it to the top; a hard flick
 * down puts it away.
 *
 * Short, it floats in from the edges with all four corners round; tall, it
 * anchors to them. It is drawn by one `GlassMerge` surface that follows it
 * frame by frame, over a layer of thick frost that keeps the content
 * legible, and pulled past the top its sides draw in while a tongue of glass
 * reaches for the finger.
 *
 * Behaviour is Base UI's dialog — focus moved in and given back, Escape, a
 * modal one's backdrop, focus trap and scroll lock — and the sheet stays
 * mounted until it is out of view. The grabber is a slider: arrow keys, Home
 * and End move between snap points, and a press steps up through them.
 */
export const ElasticSheet = ({
  children,
  className,
  closeButton = true,
  closeLabel = 'Close',
  container,
  defaultOpen = false,
  defaultSnap,
  dismissible = true,
  grabberLabel = 'Sheet height',
  label,
  maxWidth = 640,
  modal = true,
  onOpenChange,
  onSnapChange,
  open: openProp,
  snap: snapProp,
  snapPoints = DEFAULT_SNAP_POINTS,
  style,
  styles,
  tint,
  title,
  topInset = 48,
  trigger,
}: ElasticSheetProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion.
  const animated = config.motion
  const portal = useLiquefyPortalContainer()
  const root = useLiquidStyles('lq-elastic-sheet', { className, style, styles })
  const grabber = useLiquidStyles('lq-elastic-sheet__grabber', {
    styles: {
      // The same ring as `.lq-button:focus-visible`.
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: 2 },
    },
  })

  const openControlled = openProp !== undefined
  const [open, setOpen] = useState(openProp ?? defaultOpen)
  const openRef = useRef(open)
  const closingRef = useRef(false)
  const silentRef = useRef(false)

  const initialSnap = defaultSnap ?? snapPoints[0] ?? '100%'
  const snapControlled = snapProp !== undefined
  const [snapState, setSnapState] = useState<ElasticSheetSnapPoint>(initialSnap)
  const activeSnap = snapProp ?? snapState

  const [containerElement, setContainerElement] = useState<HTMLElement | null>(() => resolveContainer(container))
  // A ref's element is only there once the whole tree has committed — after
  // this component's own layout effects, when the ref is on an ancestor. The
  // sheet starts out of view, so the frame it spends elsewhere shows nothing.
  useEffect(() => {
    setContainerElement(resolveContainer(container))
  }, [container])
  const inContainer = containerElement !== null

  const [size, setSize] = useState<Size | null>(null)
  const [roomElement, setRoomElement] = useState<HTMLDivElement | null>(null)
  const room = size ? Math.max(0, size.height - topInset) : 0
  const stops = useMemo<SheetStop[]>(() => {
    const resolved = sheetStops(snapPoints, room)
    return resolved.length > 0 ? resolved : [{ height: Math.max(1, room), point: '100%' }]
  }, [room, snapPoints])
  const found = stops.findIndex((stop) => stop.point === activeSnap)
  const activeIndex = found === -1 ? 0 : found
  const lowest = stops[0]!.height
  const ceiling = stops.at(-1)!.height

  const limits = useMemo<SheetLimits>(() => {
    const holds = open && !dismissible
    return {
      ceiling,
      elasticFloor: holds,
      floor: holds ? lowest : HIDDEN,
      reach: clamp((size?.height ?? 0) * 0.1, 36, 80),
    }
  }, [ceiling, dismissible, lowest, open, size])

  const motionRef = useRef<SheetMotion | null>(null)
  const motion = useMemo(() => {
    const raw = motionRef.current?.raw ?? HIDDEN
    return new SheetMotion(raw, limits, { liquid: animated, wobbliness: config.wobbliness })
    // A new feel starts from where the last one was; new limits are handed over below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, config.wobbliness])
  motionRef.current = motion
  motion.setLimits(limits)

  const target = open ? stops[activeIndex]!.height : HIDDEN

  const actionsRef = useRef<Dialog.Root.Actions | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const frostRef = useRef<HTMLDivElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const glassRef = useRef<GlassMergeHandle | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef(0)
  const gestureRef = useRef<Gesture | null>(null)
  const trackerRef = useRef(new VelocityTracker())
  const fingerRef = useRef(0)
  const draggedRef = useRef(false)

  // What the frame loop and the event handlers read, current as of the last render.
  const latest = useRef({ ceiling, dismissible, lowest, maxWidth, size, stops })
  latest.current = { ceiling, dismissible, lowest, maxWidth, size, stops }

  const paint = useCallback(() => {
    const { ceiling: top, lowest: bottom, maxWidth: widest, size: measured } = latest.current
    if (!measured) return
    const frame = motionRef.current!.frame()
    const box = sheetBox(frame, { ceiling: top, height: measured.height, lowest: bottom, maxWidth: widest, width: measured.width })
    const height = box.bottom - box.top

    for (const element of [frostRef.current, popupRef.current]) {
      if (!element) continue
      element.style.left = px(box.left)
      element.style.top = px(box.top)
      element.style.width = px(box.width)
      element.style.height = px(height)
      element.style.borderRadius = px(box.radius)
    }
    const popup = popupRef.current
    if (popup) {
      // `clip` rather than `hidden`: a hidden overflow can still be scrolled,
      // and focus moving to a field below the fold would slide the content.
      if (popup.style.overflow !== CLIP) popup.style.overflow = CLIP
      if (popup.scrollTop !== 0 || popup.scrollLeft !== 0) popup.scrollTo(0, 0)
    }
    // The content holds still sideways — where the sheet's edges are at its
    // widest — and only the clip around it moves, so nothing reflows while
    // the sheet quivers.
    const content = contentRef.current
    if (content) content.style.left = px((measured.width - Math.min(measured.width, widest)) / 2 - box.left)

    const surface = surfaceRef.current
    if (surface) {
      // Never out through the top of the room, where it would only be cut off.
      const clear = Math.min(frame.tongue, box.top - 2)
      const reach = clear > 0.5 ? clear : 0
      const left = Math.floor(box.left - SHADOW_ROOM.side)
      const surfaceTop = Math.floor(box.top - reach - SHADOW_ROOM.above)
      surface.style.left = `${left}px`
      surface.style.top = `${surfaceTop}px`
      surface.style.width = `${Math.ceil(box.left + box.width + SHADOW_ROOM.side) - left}px`
      surface.style.height = `${Math.ceil(box.bottom + SHADOW_ROOM.below) - surfaceTop}px`
      const shapes: GlassMergeShape[] = [{
        height,
        radius: box.radius,
        width: box.width,
        x: box.left + box.width / 2 - left,
        y: box.top + height / 2 - surfaceTop,
      }]
      if (reach > 0) {
        // Thinner the further it reaches, as a pulled thread of syrup is.
        const width = TONGUE_WIDTH * (1 - 0.3 * Math.min(1, reach / 36))
        const margin = box.radius + width / 2
        const x = clamp(fingerRef.current, box.left + margin, box.left + box.width - margin)
        const tongueTop = box.top - reach
        const tongueBottom = box.top + width / 2
        shapes.push({
          height: tongueBottom - tongueTop,
          radius: width / 2,
          width,
          x: x - left,
          y: (tongueTop + tongueBottom) / 2 - surfaceTop,
        })
      }
      glassRef.current?.setShapes(shapes)
    }

    // A modal backdrop fades with the sheet as it is pulled down and away.
    const backdrop = backdropRef.current
    if (backdrop) backdrop.style.opacity = clamp((frame.height - HIDDEN) / (bottom - HIDDEN), 0, 1).toFixed(3)
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [])

  const finishClosing = useCallback(() => {
    if (openRef.current || !closingRef.current) return
    const current = motionRef.current!
    const frame = current.frame()
    if (current.dragging || frame.height > HIDDEN + 0.5 || frame.tongue > 0.5) return
    closingRef.current = false
    stop()
    // Out of view, it starts the next opening from rest.
    current.jumpTo(HIDDEN)
    actionsRef.current?.unmount()
  }, [stop])

  const run = useCallback(() => {
    // Already running: the next frame picks up the new targets.
    if (frameRef.current !== 0) return
    let last = performance.now()
    const tick = (now: number) => {
      frameRef.current = 0
      const busy = motionRef.current!.step((now - last) / 1000)
      last = now
      paint()
      if (busy) frameRef.current = requestAnimationFrame(tick)
      finishClosing()
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [finishClosing, paint])

  useEffect(() => stop, [stop])

  // Where the sheet is headed: a new stop, opening, closing, or a room that
  // changed size. A drag in progress keeps the sheet until it lets go.
  useBeforePaint(() => {
    // Nothing to aim at until the room has been measured.
    if (!size || motion.dragging) return
    if (!animated) {
      stop()
      motion.jumpTo(target)
      paint()
      finishClosing()
      return
    }
    motion.moveTo(target)
    run()
  }, [animated, finishClosing, motion, paint, run, size, stop, target])

  useEffect(() => {
    const wasOpen = openRef.current
    openRef.current = open
    // Keyed on having been open: a sheet closed before it got far still has a popup held mounted to release.
    closingRef.current = !open && wasOpen
    // An uncontrolled sheet opens fresh at its first height again, as a presented sheet does.
    if (!open && wasOpen && !snapControlled) setSnapState(initialSnap)
    finishClosing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // A controlled caller that closes the sheet goes through Base UI's own
  // close, so it still slides away rather than vanishing.
  useEffect(() => {
    if (!openControlled) return
    if (openProp && !openRef.current) setOpen(true)
    else if (!openProp && openRef.current) {
      silentRef.current = true
      actionsRef.current?.close()
      silentRef.current = false
    }
  }, [openControlled, openProp])

  // The room is the container, or the viewport: whatever box the sheet's layer fills.
  useBeforePaint(() => {
    if (!roomElement) return undefined
    const measure = () => {
      const width = roomElement.clientWidth || window.innerWidth
      const height = roomElement.clientHeight || window.innerHeight
      setSize((previous) => (previous?.width === width && previous.height === height ? previous : { height, width }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(roomElement)
    return () => observer.disconnect()
  }, [roomElement])

  // A new size or a new set of stops redraws in place before paint.
  useBeforePaint(() => {
    paint()
  }, [paint, size, stops])

  const changeSnap = useCallback((point: ElasticSheetSnapPoint) => {
    if (!snapControlled) setSnapState(point)
    if (point !== activeSnap) onSnapChange?.(point)
  }, [activeSnap, onSnapChange, snapControlled])

  const handleOpenChange = (next: boolean, details: Dialog.Root.ChangeEventDetails) => {
    if (!next && !dismissible && details.reason !== 'imperative-action') {
      details.cancel()
      return
    }
    if (!next && animated) details.preventUnmountOnClose()
    if (!next || !openControlled) setOpen(next)
    if (!silentRef.current) onOpenChange?.(next)
  }

  /** Lets go of a drag at `velocity`, toward the stop the flick carries it to, or out of view. */
  const letGo = (velocity: number) => {
    const current = motionRef.current!
    const { dismissible: away, stops: resting } = latest.current
    const speed = clamp(velocity, -MAX_RELEASE, MAX_RELEASE)
    const choice = chooseStop(current.frame().height, speed, resting.map((stop) => stop.height), away)
    if (!animated) {
      current.jumpTo(choice === -1 ? HIDDEN : resting[choice]!.height)
      paint()
    } else {
      current.release(choice === -1 ? HIDDEN : resting[choice]!.height, speed)
      run()
    }
    if (choice === -1) actionsRef.current?.close()
    else changeSnap(resting[choice]!.point)
  }

  /** Decides what a move that has left the slop is for: the sheet, the body's own scrolling, or neither. */
  const decide = (gesture: Gesture, x: number, y: number, time: number) => {
    const dx = x - gesture.startX
    const dy = y - gesture.startY
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return
    const body = bodyRef.current
    if (Math.abs(dx) > Math.abs(dy)) {
      gesture.mode = 'off'
    } else if (gesture.fromBody && body) {
      // Pulled up, a sheet below its tallest grows before its content
      // scrolls; pulled down, content scrolled down goes back to its top
      // before the sheet moves.
      const current = motionRef.current!
      gesture.mode = (dy < 0 ? current.target < latest.current.ceiling - 0.5 : !scrolledDown(gesture.target, body)) ? 'sheet' : 'off'
    } else {
      gesture.mode = 'sheet'
    }
    if (gesture.mode !== 'sheet') return

    // Caught where it is, wherever it was heading, and measured from here on
    // so the slop does not jump it.
    const current = motionRef.current!
    gesture.startY = y
    gesture.startRaw = current.raw
    current.hold(current.raw)
    trackerRef.current.reset(time, current.raw)
    try {
      popupRef.current?.setPointerCapture(gesture.id)
    } catch {
      // A pointer that is already gone has nothing to capture.
    }
    run()
  }

  /**
   * Listens on the window for a mouse or pen drag that has not been decided
   * yet, until it is decided or let go. A finger is held to what it pressed; a
   * mouse is not. The grabber sits just under the sheet's top edge, so a quick
   * drag up off it leaves the sheet with its first move, which the sheet's own
   * handlers would never hear.
   */
  const listenOffSheet = (gesture: Gesture) => {
    const offSheet = (event: globalThis.PointerEvent) =>
      event.pointerId === gesture.id && !(event.target instanceof Node && popupRef.current?.contains(event.target))
    const move = (event: globalThis.PointerEvent) => {
      if (gestureRef.current === gesture && gesture.mode === 'pending' && offSheet(event)) {
        decideRef.current(gesture, event.clientX, event.clientY, event.timeStamp)
      }
      if (gestureRef.current !== gesture || gesture.mode !== 'pending') stop()
    }
    const end = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== gesture.id) return
      // Let go off the sheet before it was a drag: nothing is left pending for the next hover to pick up.
      if (gestureRef.current === gesture && gesture.mode === 'pending') gestureRef.current = null
      stop()
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggedRef.current = false
    gestureRef.current = null
    const popup = popupRef.current
    const target = event.target
    if (!popup || !(target instanceof Element) || !popup.contains(target)) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (target.closest(NO_DRAG)) return
    const fromBody = bodyRef.current?.contains(target) ?? false
    // A mouse dragged across content selects text; it moves the sheet by the
    // grabber and the header.
    if (event.pointerType === 'mouse' && fromBody) return
    gestureRef.current = {
      fromBody,
      id: event.pointerId,
      mode: 'pending',
      roomLeft: roomElement?.getBoundingClientRect().left ?? 0,
      startRaw: motionRef.current!.raw,
      startX: event.clientX,
      startY: event.clientY,
      target,
      type: event.pointerType,
    }
    fingerRef.current = event.clientX - gestureRef.current.roomLeft
    if (event.pointerType !== 'touch') listenOffSheet(gestureRef.current)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    if (gesture.mode === 'pending') decide(gesture, event.clientX, event.clientY, event.timeStamp)
    if (gesture.mode !== 'sheet') return
    const raw = gesture.startRaw + (gesture.startY - event.clientY)
    motionRef.current!.hold(raw)
    trackerRef.current.add(event.timeStamp, raw)
    fingerRef.current = event.clientX - gesture.roomLeft
    run()
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    gestureRef.current = null
    if (gesture.mode !== 'sheet') return
    const raw = gesture.startRaw + (gesture.startY - event.clientY)
    motionRef.current!.hold(raw)
    trackerRef.current.add(event.timeStamp, raw)
    draggedRef.current = true
    letGo(trackerRef.current.velocity(event.timeStamp))
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    gestureRef.current = null
    if (gesture.mode === 'sheet') letGo(0)
  }

  // A touch decided as a drag must not also scroll the body, and only a
  // non-passive native listener can stop that.
  const popupElement = useRef<HTMLDivElement | null>(null)
  const decideRef = useRef(decide)
  decideRef.current = decide
  const setPopup = useCallback((element: HTMLDivElement | null) => {
    popupRef.current = element
    const previous = popupElement.current
    if (previous === element) return
    popupElement.current = element
    if (!element) return
    element.addEventListener('touchmove', (event: TouchEvent) => {
      const gesture = gestureRef.current
      const touch = event.touches[0]
      if (!gesture || gesture.type !== 'touch' || !touch) return
      if (gesture.mode === 'pending') decideRef.current(gesture, touch.clientX, touch.clientY, event.timeStamp)
      if (gesture.mode === 'sheet' && event.cancelable) event.preventDefault()
    }, { passive: false })
  }, [])

  const goTo = (index: number) => {
    const next = stops[clamp(index, 0, stops.length - 1)]
    if (next) changeSnap(next.point)
  }

  const handleGrabberKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = stops.length - 1
    const next = {
      ArrowDown: activeIndex - 1,
      ArrowLeft: activeIndex - 1,
      ArrowRight: activeIndex + 1,
      ArrowUp: activeIndex + 1,
      End: last,
      Home: 0,
      PageDown: activeIndex - 1,
      PageUp: activeIndex + 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    goTo(next)
  }

  const percent = (height: number) => Math.round((height / Math.max(1, room)) * 100)
  const active = stops[activeIndex]!
  const shown = typeof active.point === 'string' && size === null ? active.point : `${percent(active.height)}%`

  return (
    <Dialog.Root
      actionsRef={actionsRef}
      // Off a modal sheet, the page around it is the point: pressing it must not close the sheet.
      disablePointerDismissal={!modal}
      modal={modal}
      onOpenChange={handleOpenChange}
      open={open}
    >
      {trigger && <Dialog.Trigger render={trigger} />}
      <Dialog.Portal container={containerElement ?? portal ?? undefined}>
        {modal && (
          <Dialog.Backdrop
            className="lq-drawer__backdrop"
            ref={backdropRef}
            style={{ opacity: 0, position: inContainer ? 'absolute' : 'fixed', transition: 'none' }}
          />
        )}
        <div
          className="lq-elastic-sheet__room"
          ref={setRoomElement}
          style={{ inset: 0, overflow: CLIP, pointerEvents: 'none', position: inContainer ? 'absolute' : 'fixed', zIndex: 80 }}
        >
          <div aria-hidden="true" ref={frostRef} style={frostStyle(config.transparency)} />
          <div ref={surfaceRef} style={{ pointerEvents: 'none', position: 'absolute', top: '100%' }}>
            <GlassMerge bezel={BEZEL} ref={glassRef} spacing={SPACING} style={{ inset: 0, position: 'absolute' }} tint={tint} />
          </div>
          <Dialog.Popup
            aria-label={title ? undefined : label}
            className={root.className}
            // Moved in only when someone opened it. A non-modal sheet that is
            // simply there, open from the start or opened by the page, leaves
            // focus where it was — not scrolled to and grabbed. It goes to the
            // sheet itself, which Base UI focuses without scrolling: the sheet
            // starts below its room, and focusing a control in it there would
            // scroll the page to it when the room is part of the page.
            initialFocus={(type) => (modal || type ? popupRef.current : false)}
            onDragStart={(event) => {
              // Pressed on the grabber or the header, a mouse moves the sheet: it
              // does not pick up a selection that happens to lie under it.
              if (!(event.target instanceof Node && bodyRef.current?.contains(event.target))) event.preventDefault()
            }}
            onClickCapture={(event) => {
              // The press that ends a drag is not a press on whatever it ended over.
              if (!draggedRef.current) return
              draggedRef.current = false
              event.preventDefault()
              event.stopPropagation()
            }}
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={setPopup}
            style={{
              color: 'var(--lq-foreground, inherit)',
              outline: 'none',
              pointerEvents: 'auto',
              position: 'absolute',
              top: '100%',
              touchAction: 'none',
              ...root.style,
            }}
          >
            <div
              ref={contentRef}
              style={{ display: 'flex', flexDirection: 'column', height: ceiling, position: 'absolute', top: 0, width: Math.min(size?.width ?? maxWidth, maxWidth) }}
            >
              {/* The grabber and the header are handles, not text: a mouse
                  dragging the sheet by them does not select the content it passes. */}
              <div style={{ display: 'flex', flex: 'none', justifyContent: 'center', paddingTop: 6, userSelect: 'none', WebkitUserSelect: 'none' }}>
                <div
                  aria-label={grabberLabel}
                  aria-orientation="vertical"
                  aria-valuemax={percent(ceiling)}
                  aria-valuemin={percent(lowest)}
                  aria-valuenow={percent(active.height)}
                  aria-valuetext={shown}
                  className={grabber.className}
                  onClick={() => goTo(activeIndex === stops.length - 1 ? 0 : activeIndex + 1)}
                  onKeyDown={handleGrabberKey}
                  role="slider"
                  style={{ alignItems: 'center', borderRadius: 8, cursor: 'grab', display: 'flex', height: 18, justifyContent: 'center', width: 56 }}
                  tabIndex={0}
                >
                  <span
                    aria-hidden="true"
                    style={{ background: 'color-mix(in srgb, currentColor 34%, transparent)', borderRadius: 3, height: 5, width: 36 }}
                  />
                </div>
              </div>
              {(title || (dismissible && closeButton)) && (
                <div style={{ alignItems: 'center', display: 'flex', flex: 'none', gap: 12, justifyContent: 'space-between', minHeight: 44, padding: '0 14px 6px 20px', userSelect: 'none', WebkitUserSelect: 'none' }}>
                  {title
                    ? <Dialog.Title style={{ fontSize: '1.15rem', fontWeight: 680, letterSpacing: '-0.02em', margin: 0 }}>{title}</Dialog.Title>
                    : <span />}
                  {dismissible && closeButton && (
                    <Dialog.Close
                      render={(
                        <LiquidIconButton label={closeLabel} shape="circle" size="sm">
                          <CloseGlyph />
                        </LiquidIconButton>
                      )}
                    />
                  )}
                </div>
              )}
              <div
                ref={bodyRef}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 20px 24px', touchAction: 'pan-y' }}
              >
                {children}
              </div>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
