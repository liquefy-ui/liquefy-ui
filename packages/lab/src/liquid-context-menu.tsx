import { ContextMenu } from '@base-ui/react/context-menu'
import {
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
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  ContextMenuMotion,
  contextMenuLayout,
  type ContextMenuLayout,
  type ContextMenuRect,
  type ContextMenuSide,
} from './context-menu-motion'
import { GlassMerge, type GlassMergeHandle } from './glass-merge'
import { useBeforePaint } from './use-before-paint'
import { frostStyle } from './use-glass-morph'

export type LiquidContextMenuItem = {
  /** Drawn in red, for an action that destroys something. */
  danger?: boolean
  disabled?: boolean
  icon?: ReactNode
  /** The row's text: its accessible name, and what typeahead matches. */
  label: string
  /** Runs once the chosen row has popped, just before the menu closes. */
  onSelect?: () => void
}

export type LiquidContextMenuProps = LiquidStyleProps & {
  /** What is pressed: a photo, a card, a message. It lifts off the page while the menu is open. */
  children: ReactNode
  className?: string
  /** Milliseconds a finger or pen has to rest on it before the menu opens. */
  delay?: number
  disabled?: boolean
  items: LiquidContextMenuItem[]
  /** The menu's accessible name. */
  label?: string
  onOpenChange?: (open: boolean) => void
  /** What lifts off the page while the menu is open. Defaults to a second copy of `children`. */
  preview?: ReactNode
  /** Corner radius of the lifted preview, which is cut to it. */
  radius?: number
  /** Which side of the preview the menu comes out of. `auto` is below, then above, then beside — whichever fits. */
  side?: ContextMenuSide | 'auto'
  /** Milliseconds between one row arriving and the next. */
  stagger?: number
  style?: CSSProperties
  tint?: string
  /** The menu's width, in pixels. */
  width?: number
}

const ROW_HEIGHT = 44
const PADDING = 6
/** The menu's corners are rounder than the highlight's by the padding between them. */
const PILL_RADIUS = 16
/** The largest gap the glass still bridges: the neck out of the preview lets go before the menu reaches its place. */
const SPACING = 10
/**
 * Room for the glass's cast shadow, which the lens draws inside the surface:
 * it falls up to 40px below the shapes and 30px to either side (see
 * `attachGlassMerge`).
 */
const SHADOW_ROOM = { above: 22, below: 40, side: 30 }
/** How far a press may wander and still be a press rather than the start of a scroll. */
const SLOP = 10

const HIGHLIGHT = 'color-mix(in srgb, var(--lq-text, white) 16%, transparent)'
const HIGHLIGHT_DANGER = 'color-mix(in srgb, #ff5d73 22%, transparent)'

/** The scrim: the dialog's, so a lifted preview reads like anything else brought to the front. */
const SCRIM: CSSProperties = {
  WebkitBackdropFilter: 'blur(7px) saturate(0.86)',
  backdropFilter: 'blur(7px) saturate(0.86)',
  background: 'rgba(2, 5, 16, 0.42)',
  inset: 0,
  opacity: 0,
  pointerEvents: 'auto',
  position: 'fixed',
  // A finger on the scrim closes the menu; it does not scroll the page behind.
  touchAction: 'none',
}

const px = (value: number): string => `${value.toFixed(2)}px`

const CLIP = typeof CSS !== 'undefined' && CSS.supports?.('overflow', 'clip') ? 'clip' : 'hidden'

const menuHeight = (count: number): number => count * ROW_HEIGHT + 2 * PADDING

const rectOf = (element: Element): ContextMenuRect => {
  const bounds = element.getBoundingClientRect()
  return { height: bounds.height, width: bounds.width, x: bounds.left, y: bounds.top }
}

/** The box fixed elements are laid out in: the window, less its scrollbars. */
const viewportSize = () => {
  const root = document.documentElement
  return { height: root.clientHeight || window.innerHeight, width: root.clientWidth || window.innerWidth }
}

const shadowOf = (amount: number): string => amount <= 0.001
  ? ''
  : `0 ${px(20 * amount)} ${px(48 * amount)} color-mix(in srgb, var(--lq-shadow-color, rgba(4, 9, 24, 0.28)) ${(amount * 140).toFixed(1)}%, transparent)`

type Placement = { layout: ContextMenuLayout; rest: ContextMenuRect }

type KeepMounted = { preventUnmountOnClose?: () => void }

/** A finger or pen resting on the preview, which opens the menu if it stays. Positions are in client pixels. */
type Press = {
  /** Past the slop since the menu opened: letting go now chooses the row under it, or closes the menu. */
  moved: boolean
  /** The menu opened while it was held. */
  opened: boolean
  /** Where it was when the menu opened. */
  openX: number
  openY: number
  /** The row under it, or -1. */
  over: number
  pointerId: number
  startX: number
  startY: number
  timer: number
  x: number
  y: number
}

/**
 * A context menu in the manner of iOS, made of liquid glass. A long press —
 * or a right click, or the context-menu key — lifts what was pressed off the
 * page over a darkening scrim, and the menu buds out from under its edge: a
 * drop of glass that pulls a neck out of the preview, spreads, drops into a
 * panel and swings past its shape before it settles, its rows arriving one at
 * a time.
 *
 * A press that opened it can keep going: sliding over the rows highlights
 * them — the highlight slides after the finger, stretching as it goes and
 * leaning toward it — and letting go on one chooses it, which pops before it
 * runs. Let go off the menu and it closes; let go without moving and it stays
 * open, as it does on iOS, for a tap.
 *
 * Behaviour is Base UI's context menu: roving focus with the arrow keys,
 * typeahead, Escape, focus handed back, right-click handling. The long press,
 * the slide and the lift are what this adds. The menu stays mounted until the
 * preview is back on the page.
 */
export const LiquidContextMenu = ({
  children,
  className,
  delay = 450,
  disabled = false,
  items,
  label,
  onOpenChange,
  preview,
  radius = 18,
  side = 'auto',
  stagger = 45,
  style,
  styles,
  tint,
  width = 240,
}: LiquidContextMenuProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion: mapping the OS setting
  // to `motion` is the app's call.
  const animated = config.motion
  const animatedRef = useRef(animated)
  animatedRef.current = animated
  const portalContainer = useLiquefyPortalContainer()
  const root = useLiquidStyles('lq-context-menu', {
    className,
    style,
    styles: {
      // The same ring as `.lq-button:focus-visible`, which this is not.
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: 3 },
      ...styles,
    },
  })
  const row = useLiquidStyles('lq-context-menu__item', {
    styles: {
      _disabled: { cursor: 'not-allowed', opacity: 0.45 },
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: -2 },
    },
  })
  const danger = useLiquidStyles('lq-context-menu__item--danger', {
    // Both conditional: a plain colour would be written inline and outrank the dark one.
    styles: { _dark: { color: '#ff8296' }, _light: { color: '#d8334c' } },
  })

  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const closingRef = useRef(false)
  // The preview stays lifted, and the menu mounted, from the moment it opens
  // until the preview is back on the page, which outlasts `open`.
  const [placement, setPlacement] = useState<Placement | null>(null)

  const actionsRef = useRef<ContextMenu.Root.Actions | null>(null)
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const glassRef = useRef<GlassMergeHandle | null>(null)
  const elements = useRef({
    clip: null as HTMLElement | null,
    clone: null as HTMLElement | null,
    frost: null as HTMLElement | null,
    list: null as HTMLElement | null,
    pill: null as HTMLElement | null,
    scrim: null as HTMLElement | null,
    surface: null as HTMLElement | null,
  })
  const rowRefs = useRef<(HTMLElement | null)[]>([])
  const frameRef = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items
  // One choice per opening: set by the first row chosen, cleared when the menu opens again.
  const choiceRef = useRef(false)
  const pressRef = useRef<Press | null>(null)
  const endPressRef = useRef<(() => void) | null>(null)
  // The row with focus, which Base UI moves with the arrow keys and the cursor alike.
  const focusedRef = useRef(-1)
  // Opened from the keyboard: focus goes to the first row, as it does for a menu button.
  const keyboardRef = useRef(false)

  const placementRef = useRef(placement)
  placementRef.current = placement
  // Opens a held press early, when the browser has already decided it is a long press.
  const openNowRef = useRef<(() => void) | null>(null)
  // How the menu is being opened while this component's own `contextmenu` event is on its way.
  const openingRef = useRef<'keyboard' | 'pointer' | null>(null)

  const motion = useMemo(
    () => new ContextMenuMotion(items.length, { padding: PADDING, rowHeight: ROW_HEIGHT, stagger, wobbliness: config.wobbliness }),
    // Rebuilt only when the feel changes; a new item count is a resize below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stagger, config.wobbliness],
  )

  const paint = useCallback(() => {
    const frame = motion.preview()
    const content = contentRef.current
    if (content) {
      // While lifted, the copy over the scrim stands in for it.
      const lifted = motion.lifted
      content.style.visibility = lifted ? 'hidden' : ''
      content.style.transform = !lifted && Math.abs(frame.scale - 1) > 0.0005 ? `scale(${frame.scale.toFixed(4)})` : ''
    }
    const { clip, clone, frost, list, pill, scrim, surface } = elements.current
    if (clone) {
      clone.style.transform = `translate(${px(frame.x)}, ${px(frame.y)}) scale(${frame.scale.toFixed(4)})`
      clone.style.boxShadow = shadowOf(frame.shadow)
    }
    if (scrim) scrim.style.opacity = motion.scrimOpacity().toFixed(3)

    const shapes = motion.shapes()
    if (surface) {
      if (shapes.length === 0) {
        glassRef.current?.setShapes([])
      } else {
        let left = Number.POSITIVE_INFINITY
        let top = Number.POSITIVE_INFINITY
        let right = Number.NEGATIVE_INFINITY
        let bottom = Number.NEGATIVE_INFINITY
        for (const shape of shapes) {
          left = Math.min(left, shape.x - shape.width / 2)
          top = Math.min(top, shape.y - shape.height / 2)
          right = Math.max(right, shape.x + shape.width / 2)
          bottom = Math.max(bottom, shape.y + shape.height / 2)
        }
        // The surface hugs the glass and its shadow, so the filter covers no
        // more of the page than it has to on any frame.
        const surfaceLeft = Math.floor(left - SHADOW_ROOM.side)
        const surfaceTop = Math.floor(top - SHADOW_ROOM.above)
        surface.style.left = `${surfaceLeft}px`
        surface.style.top = `${surfaceTop}px`
        surface.style.width = `${Math.ceil(right + SHADOW_ROOM.side) - surfaceLeft}px`
        surface.style.height = `${Math.ceil(bottom + SHADOW_ROOM.below) - surfaceTop}px`
        glassRef.current?.setShapes(shapes.map((shape) => ({ ...shape, x: shape.x - surfaceLeft, y: shape.y - surfaceTop })))
      }
    }

    const panel = motion.panel()
    const menu = placementRef.current?.layout.menu
    if (frost) {
      const amount = panel ? panel.frost : 0
      if (panel) {
        frost.style.left = px(panel.x)
        frost.style.top = px(panel.y)
        frost.style.width = px(panel.width)
        frost.style.height = px(panel.height)
        frost.style.borderRadius = px(panel.radius)
      }
      frost.style.opacity = amount >= 1 ? '' : amount.toFixed(3)
      // Not drawn at all while clear: a backdrop filter at zero opacity still costs its blur.
      frost.style.visibility = amount <= 0.001 ? 'hidden' : ''
    }
    if (clip && menu) {
      // The rows are cut to the glass: the clip is laid exactly over it, in
      // the popup's pixels, and the list inside holds still against the menu.
      const clipLeft = panel ? panel.x - menu.x : 0
      const clipTop = panel ? panel.y - menu.y : 0
      clip.style.left = px(clipLeft)
      clip.style.top = px(clipTop)
      clip.style.width = px(panel?.width ?? 0)
      clip.style.height = px(panel?.height ?? 0)
      clip.style.borderRadius = px(panel?.radius ?? 0)
      if (list) {
        const offset = motion.menuOffset()
        list.style.transform = `translate(${px(offset.x - clipLeft)}, ${px(offset.y - clipTop)})`
      }
    }
    if (pill) {
      const highlight = motion.pill()
      pill.style.width = px(highlight.width)
      pill.style.height = px(highlight.height)
      pill.style.transform = `translate(${px(highlight.x - highlight.width / 2)}, ${px(highlight.y - highlight.height / 2)})`
      pill.style.opacity = highlight.opacity.toFixed(3)
      pill.style.background = itemsRef.current[motion.highlighted]?.danger ? HIGHLIGHT_DANGER : HIGHLIGHT
    }
    rowRefs.current.forEach((element, index) => {
      if (!element) return
      const rowFrame = motion.row(index)
      element.style.opacity = rowFrame.opacity >= 1 ? '' : rowFrame.opacity.toFixed(3)
      element.style.transform = Math.abs(rowFrame.scale - 1) < 0.0005 && rowFrame.x === 0 && rowFrame.y === 0
        ? ''
        : `translate(${px(rowFrame.x)}, ${px(rowFrame.y)}) scale(${rowFrame.scale.toFixed(4)})`
    })
  }, [motion])
  const paintRef = useRef(paint)
  paintRef.current = paint

  /** A ref callback that keeps the element and draws it in place as soon as it exists. */
  const keep = useCallback((key: keyof typeof elements.current) => (element: HTMLElement | null) => {
    elements.current[key] = element
    if (element) paintRef.current()
  }, [])
  const refs = useMemo(() => ({
    clip: keep('clip'),
    clone: (element: HTMLElement | null) => {
      // A copy for show: nothing in it can be reached, by pointer, keyboard or screen reader.
      element?.setAttribute('inert', '')
      keep('clone')(element)
    },
    frost: keep('frost'),
    list: keep('list'),
    pill: keep('pill'),
    scrim: keep('scrim'),
    surface: keep('surface'),
  }), [keep])

  const finishClosing = useCallback(() => {
    if (openRef.current || !closingRef.current || !motion.closed) return
    closingRef.current = false
    actionsRef.current?.unmount()
    setPlacement(null)
  }, [motion])

  // Acting on a choice: the item's own action first, then the menu closes as
  // if it had been clicked — through Base UI, so focus goes back where it was.
  const commit = useCallback((index: number) => {
    try {
      itemsRef.current[index]?.onSelect?.()
    } finally {
      actionsRef.current?.close()
    }
  }, [])

  const run = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    let last = performance.now()
    const tick = (now: number) => {
      const self = frameRef.current
      const busy = motion.step((now - last) / 1000)
      last = now
      paint()
      const chosen = motion.takeChoice()
      if (chosen >= 0) commit(chosen)
      // Acting on a choice closes the menu, which starts a run of its own:
      // this one stops rather than step the motion a second time each frame.
      if (frameRef.current !== self) return
      if (busy) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = 0
        finishClosing()
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [commit, finishClosing, motion, paint])

  // For a change that does not restart the motion — the pointer moving, a
  // highlight — that should not cancel the frame already on its way either.
  const wake = useCallback(() => {
    if (!frameRef.current) run()
  }, [run])

  const settle = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    motion.settle()
    paint()
    const chosen = motion.takeChoice()
    if (chosen >= 0) commit(chosen)
  }, [commit, motion, paint])

  const play = useCallback(() => {
    if (animatedRef.current) {
      run()
      return
    }
    settle()
    finishClosing()
  }, [finishClosing, run, settle])

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [motion])

  useEffect(() => () => endPressRef.current?.(), [])

  useEffect(() => {
    motion.resize(items.length)
    rowRefs.current.length = items.length
  }, [motion, items.length])

  // Turning motion off mid-way lands everything where it was heading.
  useEffect(() => {
    if (animated) return
    settle()
    finishClosing()
  }, [animated, finishClosing, settle])

  // The preview and the overlay are drawn in place before paint whenever the overlay mounts or goes.
  useBeforePaint(() => {
    paint()
  }, [paint, placement])

  /** Swells the row under a sliding press, or else the one with focus. */
  const refreshHighlight = useCallback(() => {
    const press = pressRef.current
    const index = press?.opened ? press.over : focusedRef.current
    const item = itemsRef.current[index]
    motion.highlight(item && !item.disabled ? index : -1)
    if (animatedRef.current) wake()
    else paint()
  }, [motion, paint, wake])

  const choose = useCallback((index: number) => {
    const item = itemsRef.current[index]
    // Once per opening: a second row pressed while the first is still popping does nothing.
    if (!item || item.disabled || !openRef.current || choiceRef.current) return
    choiceRef.current = true
    if (animatedRef.current && motion.choose(index)) wake()
    else commit(index)
  }, [commit, motion, wake])

  /** Measures the preview, works out where everything goes and starts the lift. */
  const lift = (how: 'keyboard' | 'pointer'): boolean => {
    const trigger = triggerRef.current
    if (!trigger) return false
    const rest = rectOf(trigger)
    const layout = contextMenuLayout({
      menu: { height: menuHeight(itemsRef.current.length), width },
      preview: rest,
      side,
      viewport: viewportSize(),
    })
    const next = { layout, rest }
    placementRef.current = next
    setPlacement(next)
    setOpen(true)
    openRef.current = true
    closingRef.current = false
    choiceRef.current = false
    keyboardRef.current = how === 'keyboard'
    motion.open(layout, rest)
    play()
    onOpenChange?.(true)
    return true
  }

  /**
   * Opens the menu from this component's own gestures — a long press, the
   * keyboard — the way Base UI opens it for a right click: with a
   * `contextmenu` event on the trigger. Base UI keeps its open state to
   * itself; a controlled `open` would race its own close and let the popup go
   * before the preview is home.
   */
  const requestOpen = (how: 'keyboard' | 'pointer', x: number, y: number) => {
    const trigger = triggerRef.current
    if (openRef.current || disabled || !trigger) return
    openingRef.current = how
    try {
      trigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2, cancelable: true, clientX: x, clientY: y }))
    } finally {
      openingRef.current = null
    }
  }

  const handleOpenChange = (next: boolean, details: ContextMenu.Root.ChangeEventDetails) => {
    if (next) {
      if (openRef.current || !lift(openingRef.current ?? 'pointer')) details.cancel()
      return
    }
    // A chosen row is still popping: the menu closes when it is done, not before.
    if (motion.choosing) {
      details.cancel()
      return
    }
    // The context menu's types leave it out, but its root is Base UI's menu, whose details carry it.
    if (animatedRef.current) (details as KeepMounted).preventUnmountOnClose?.()
    openRef.current = false
    closingRef.current = true
    setOpen(false)
    endPressRef.current?.()
    // Set down wherever the preview is on the page now, should the page have moved.
    const trigger = triggerRef.current
    motion.close(trigger ? rectOf(trigger) : undefined)
    play()
    onOpenChange?.(false)
  }

  // A finger or pen held on the preview sinks it a little and, once it has
  // been held for `delay`, lifts it and opens the menu. It is followed until it
  // lets go: on a row it chooses it; off the menu after sliding it closes it;
  // where it was, it leaves the menu open for a tap. A mouse opens the menu
  // with its right button instead, which Base UI handles.
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !event.isPrimary || event.pointerType === 'mouse' || openRef.current || pressRef.current) return
    const press: Press = {
      moved: false,
      opened: false,
      openX: 0,
      openY: 0,
      over: -1,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer: 0,
      x: event.clientX,
      y: event.clientY,
    }
    pressRef.current = press
    if (animatedRef.current) {
      motion.press()
      wake()
    }

    const open = () => {
      if (pressRef.current !== press || press.opened) return
      window.clearTimeout(press.timer)
      press.opened = true
      press.openX = press.x
      press.openY = press.y
      requestOpen('pointer', press.x, press.y)
      if (!openRef.current) end()
    }
    const move = (moving: PointerEvent) => {
      if (moving.pointerId !== press.pointerId) return
      press.x = moving.clientX
      press.y = moving.clientY
      if (!press.opened) {
        // Wandering off before the menu opens is a scroll or a drag, not a press.
        if (Math.hypot(press.x - press.startX, press.y - press.startY) > SLOP) {
          end()
          motion.release()
          wake()
        }
        return
      }
      if (Math.hypot(press.x - press.openX, press.y - press.openY) > SLOP) press.moved = true
      const point = { x: press.x, y: press.y }
      motion.lean(point)
      const over = motion.rowAt(point)
      if (over !== press.over) {
        press.over = over
        refreshHighlight()
      } else if (animatedRef.current) {
        wake()
      }
    }
    const up = (lifted: PointerEvent) => {
      if (lifted.pointerId !== press.pointerId) return
      end()
      if (!press.opened) {
        motion.release()
        wake()
        return
      }
      motion.lean(null)
      if (!press.moved) {
        refreshHighlight()
        return
      }
      const over = motion.rowAt({ x: lifted.clientX, y: lifted.clientY })
      // A disabled row does nothing when let go on, as it does when clicked.
      if (over >= 0) choose(over)
      else actionsRef.current?.close()
      refreshHighlight()
    }
    const cancel = (cancelled: PointerEvent) => {
      if (cancelled.pointerId !== press.pointerId) return
      end()
      if (!press.opened) motion.release()
      motion.lean(null)
      refreshHighlight()
    }
    // Once the menu is open the finger is choosing a row: it does not scroll
    // the page, and letting go does not click whatever it is over.
    const hold = (touch: TouchEvent) => {
      if (press.opened && touch.cancelable) touch.preventDefault()
    }
    const end = () => {
      window.clearTimeout(press.timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', hold)
      // The finger's touchend comes just after its pointerup, so it is still
      // listened for a moment longer — and no longer, or it would swallow the
      // next tap's.
      window.setTimeout(() => window.removeEventListener('touchend', hold), 100)
      if (pressRef.current === press) pressRef.current = null
      if (endPressRef.current === end) endPressRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', hold, { passive: false })
    window.addEventListener('touchend', hold, { passive: false })
    endPressRef.current = end
    press.timer = window.setTimeout(open, delay)
    openNowRef.current = open
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    requestOpen('keyboard', bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
  }

  // Opened from the keyboard, focus goes to the first row that can take it.
  useEffect(() => {
    if (!open || !keyboardRef.current) return
    let frame = 0
    const focusFirst = () => {
      const first = rowRefs.current.find((element, index) => element && !itemsRef.current[index]?.disabled)
      if (first) first.focus()
      else frame = requestAnimationFrame(focusFirst)
    }
    // After Base UI has moved focus into the popup, which it does as it mounts.
    frame = requestAnimationFrame(focusFirst)
    return () => cancelAnimationFrame(frame)
  }, [open])

  const anchor = useMemo(() => {
    const menu = placement?.layout.menu
    return menu ? { getBoundingClientRect: () => DOMRect.fromRect(menu) } : undefined
  }, [placement])
  const menu = placement?.layout.menu

  return (
    <ContextMenu.Root actionsRef={actionsRef} disabled={disabled} onOpenChange={handleOpenChange}>
      <ContextMenu.Trigger
        aria-haspopup="menu"
        className={root.className}
        onContextMenu={(event) => {
          // This component's own, opening the menu through Base UI.
          if (openingRef.current) return
          const press = pressRef.current
          // The browser's own long press: the menu opens now if it has not already.
          if (press || openRef.current) {
            event.preventDefault()
            event.preventBaseUIHandler()
            if (press && !press.opened) openNowRef.current?.()
          }
        }}
        // A photo held down is not being dragged out of the page.
        onDragStart={(event) => event.preventDefault()}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        // The long press is this component's own, with its own delay and its slide.
        onTouchStart={(event) => event.preventBaseUIHandler()}
        ref={triggerRef}
        style={{
          borderRadius: radius,
          display: 'inline-block',
          position: 'relative',
          userSelect: 'none',
          verticalAlign: 'middle',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          ...root.style,
        }}
        tabIndex={disabled ? undefined : 0}
      >
        <div ref={contentRef} style={{ borderRadius: 'inherit', transformOrigin: 'center', willChange: animated ? 'transform' : undefined }}>
          {children}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal container={portalContainer ?? undefined}>
        {/* Its own stacking context at the popover layer, so the scrim, the
            glass, the lifted preview and the rows keep their order. Nothing
            here has opacity or a filter above the glass. */}
        <div style={{ inset: 0, isolation: 'isolate', pointerEvents: 'none', position: 'fixed', zIndex: 85 }}>
          <ContextMenu.Backdrop ref={refs.scrim} style={SCRIM} />
          <span aria-hidden="true" ref={refs.frost} style={{ ...frostStyle('top-left'), position: 'fixed' }} />
          <span aria-hidden="true" ref={refs.surface} style={{ pointerEvents: 'none', position: 'fixed' }}>
            <GlassMerge bezel={12} ref={glassRef} spacing={SPACING} style={{ height: '100%', width: '100%' }} tint={tint} />
          </span>
          {placement && (
            <div
              aria-hidden="true"
              ref={refs.clone}
              style={{
                borderRadius: radius,
                height: placement.rest.height,
                left: placement.rest.x,
                overflow: CLIP,
                pointerEvents: 'none',
                position: 'fixed',
                top: placement.rest.y,
                transformOrigin: 'center',
                width: placement.rest.width,
              }}
            >
              {preview ?? children}
            </div>
          )}
          <ContextMenu.Positioner
            align="start"
            anchor={anchor}
            // The popup is laid exactly over the menu's place, which the layout
            // has already kept on screen, so it must never flip or shift.
            collisionAvoidance={{ align: 'none', fallbackAxisSide: 'none', side: 'none' }}
            side="bottom"
            sideOffset={({ anchor: box }) => -box.height}
            style={{ pointerEvents: 'none' }}
          >
            <ContextMenu.Popup
              aria-label={label}
              onPointerLeave={() => {
                motion.lean(null)
                wake()
              }}
              onPointerMove={(event) => {
                if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
                motion.lean({ x: event.clientX, y: event.clientY })
                wake()
              }}
              style={{ height: menu?.height, outline: 'none', position: 'relative', width: menu?.width }}
            >
              <div ref={refs.clip} style={{ height: 0, left: 0, overflow: CLIP, pointerEvents: 'auto', position: 'absolute', top: 0, width: 0 }}>
                <div
                  ref={refs.list}
                  style={{
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    height: menu?.height,
                    left: 0,
                    padding: PADDING,
                    position: 'absolute',
                    top: 0,
                    width: menu?.width,
                  }}
                >
                  <span
                    aria-hidden="true"
                    ref={refs.pill}
                    style={{ borderRadius: PILL_RADIUS, left: 0, opacity: 0, pointerEvents: 'none', position: 'absolute', top: 0 }}
                  />
                  {items.map((item, index) => (
                    <ContextMenu.Item
                      className={[row.className, item.danger ? danger.className : undefined].filter(Boolean).join(' ')}
                      // Closed here, once the chosen row has popped.
                      closeOnClick={false}
                      disabled={item.disabled}
                      key={index}
                      label={item.label}
                      onBlur={() => {
                        if (focusedRef.current === index) focusedRef.current = -1
                        refreshHighlight()
                      }}
                      onClick={() => choose(index)}
                      onFocus={() => {
                        focusedRef.current = index
                        refreshHighlight()
                      }}
                      ref={(element: HTMLElement | null) => {
                        rowRefs.current[index] = element
                        if (element) paintRef.current()
                      }}
                      style={{
                        alignItems: 'center',
                        borderRadius: PILL_RADIUS,
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        display: 'flex',
                        flex: `0 0 ${ROW_HEIGHT}px`,
                        fontSize: '0.94rem',
                        fontWeight: 520,
                        gap: 12,
                        justifyContent: 'space-between',
                        padding: '0 14px',
                        position: 'relative',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        ...row.style,
                        ...(item.danger ? danger.style : undefined),
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      {item.icon && <span aria-hidden="true" style={{ display: 'inline-flex', flex: '0 0 auto' }}>{item.icon}</span>}
                    </ContextMenu.Item>
                  ))}
                </div>
              </div>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </div>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
