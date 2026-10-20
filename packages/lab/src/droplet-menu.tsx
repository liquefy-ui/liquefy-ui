import { Menu } from '@base-ui/react/menu'
import { observeElasticPointer, type GlassMergeShape } from '@liquefy-ui/core'
import {
  useLiquefyConfig,
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
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  DropletChoreography,
  dropletOffsets,
  dropletRadius,
  type DropletFrame,
  type DropletLayout,
  type DropletPlacement,
  type DropletPoint,
  type TriggerFrame,
} from './droplet-motion'
import { GlassMerge, type GlassMergeHandle } from './glass-merge'
import { useBeforePaint } from './use-before-paint'

export type DropletMenuItem = {
  disabled?: boolean
  icon: ReactNode
  /** Names the droplet: its accessible name, its tooltip, and what typeahead matches. */
  label: string
  /** Runs once the chosen droplet has bounced, just before the menu closes. */
  onSelect?: () => void
}

export type DropletMenuProps = LiquidStyleProps & {
  className?: string
  defaultOpen?: boolean
  /** The trigger's icon. */
  icon: ReactNode
  /** Degrees the trigger's icon turns while the menu is open. 45 turns a plus into a close mark. */
  iconTurn?: number
  items: DropletMenuItem[]
  /** The trigger's accessible name and tooltip. */
  label: string
  /**
   * `arc` spreads the droplets over the side `placement` names; `line` stacks
   * them in a straight line out of it — a column for `top` or `bottom`, a row for
   * `left` or `right`. A line reads top to bottom, then left to right.
   */
  layout?: DropletLayout
  onOpenChange?: (open: boolean) => void
  open?: boolean
  /** Which side of the trigger the droplets land on. `around` rings it (and, for a line, counts as `top`). */
  placement?: DropletPlacement
  /**
   * Distance from the trigger's centre to each droplet's, in pixels — on a
   * line, to the nearest one and between neighbours. Defaults to the closest
   * that keeps them apart.
   */
  radius?: number
  /** The trigger's size; the droplets are one size down. */
  size?: 'sm' | 'md' | 'lg'
  /** Milliseconds between one droplet leaving and the next. */
  stagger?: number
  style?: CSSProperties
  tint?: string
}

/** The icon button's side at each size — kept in step with `.lq-icon-button` in @liquefy-ui/react. */
const PIXELS = { lg: 56, md: 46, sm: 36 } as const
const DROPLET_SIZE = { lg: 'md', md: 'sm', sm: 'sm' } as const

/**
 * The largest gap the glass still bridges. Kept under the 14px droplets rest
 * apart (GAP in droplet-motion.ts), so the neck forms as a droplet leaves and
 * snaps before it lands, and neighbours at rest stay separate.
 */
const SPACING = 10
/** How far past its place a droplet may swing, as a share of the distance — the springs at full wobbliness. */
const OVERSHOOT = 1.45
/** How much wider than itself a droplet may get on the way: landing plump, at full stretch. */
const SWELL = 1.6
/** The trigger squashes by up to about a fifth either way. */
const TRIGGER_SWELL = 1.25
/**
 * Room for the glass's cast shadow, which the lens draws inside the surface:
 * it falls up to 40px below the shapes and 30px to either side (see
 * `attachGlassMerge`).
 */
const SHADOW_ROOM = { above: 22, below: 40, side: 30 }

const AT_HOME = 'translate(-50%, -50%) scale(0)'

/**
 * How far a press on the trigger may wander and still be a tap rather than a
 * slide: about what a finger drifts by on glass.
 */
const DRAG_SLOP = 10

/** A press on the trigger that may become a slide onto a droplet. Positions are in client pixels. */
type Drag = {
  centreX: number
  centreY: number
  /** Past the slop: letting go now chooses the droplet under the pointer, or closes the menu. */
  moved: boolean
  /** The droplet under the pointer, or -1. */
  over: number
  pointerId: number
  startX: number
  startY: number
}

/**
 * Rotating into the direction of travel, stretching, and rotating back lays
 * the stretch along the path while the icon stays upright.
 */
const dropletTransform = ({ angle, scale, stretch, x, y }: DropletFrame): string => scale === 0
  ? AT_HOME
  : `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg) `
    + `scale(${(scale * stretch).toFixed(4)}, ${(scale / stretch).toFixed(4)}) rotate(${(-angle).toFixed(2)}deg)`

type GlassBox = { height: number, left: number, top: number, width: number }

/**
 * Where the glass surface sits relative to the trigger's top-left corner. While
 * the droplets are out it covers everywhere they can reach, overshoot
 * included, on the side they land on; otherwise only the trigger, so an
 * invisible box widens the page no more than the trigger's shadow does.
 */
const glassBox = (offsets: readonly DropletPoint[], triggerPixels: number, dropletPixels: number, out: boolean): GlassBox => {
  const reach = Math.ceil((triggerPixels / 2) * TRIGGER_SWELL) + 2
  let left = -reach
  let top = -reach
  let right = reach
  let bottom = reach
  if (out) {
    const pad = (dropletPixels / 2) * SWELL + 2
    for (const { x, y } of offsets) {
      left = Math.min(left, x * OVERSHOOT - pad)
      top = Math.min(top, y * OVERSHOOT - pad)
      right = Math.max(right, x * OVERSHOOT + pad)
      bottom = Math.max(bottom, y * OVERSHOOT + pad)
    }
  }
  left = Math.floor(left - SHADOW_ROOM.side)
  top = Math.floor(top - SHADOW_ROOM.above)
  right += SHADOW_ROOM.side
  bottom += SHADOW_ROOM.below
  return {
    height: Math.ceil(bottom) - top,
    left: triggerPixels / 2 + left,
    top: triggerPixels / 2 + top,
    width: Math.ceil(right) - left,
  }
}

/** The trigger as a glass shape: a circle squashed by the choreography, area kept as the transform keeps it. */
const triggerShape = (x: number, y: number, pixels: number, { scaleX, scaleY }: TriggerFrame): GlassMergeShape => {
  const sx = Math.max(scaleX, 0.01)
  const sy = Math.max(scaleY, 0.01)
  const side = pixels * Math.sqrt(sx * sy)
  return { angle: 0, height: side, radius: side / 2, stretch: Math.sqrt(sx / sy), width: side, x, y }
}

/** A droplet as a glass shape, stretched along its travel exactly as `dropletTransform` stretches its button. */
const dropletShape = (x: number, y: number, pixels: number, frame: DropletFrame): GlassMergeShape => {
  const side = pixels * frame.scale
  return { angle: frame.angle, height: side, radius: side / 2, stretch: frame.stretch, width: side, x: x + frame.x, y: y + frame.y }
}

/**
 * The trigger and the droplets are clear buttons over the glass, which is
 * drawn underneath all of them by one surface. These are the only marks of
 * their own: the focus ring every liquefy-ui button shows, and a disabled
 * droplet's faded icon.
 */
const BUTTON: CSSProperties = {
  alignItems: 'center',
  appearance: 'none',
  background: 'transparent',
  border: 0,
  borderRadius: '50%',
  color: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  font: 'inherit',
  justifyContent: 'center',
  padding: 0,
}

/**
 * A round glass trigger that buds its items off one at a time. Each droplet
 * stretches along the way it is travelling, swings past its place and jiggles
 * to rest, and they come home in reverse when the menu closes.
 *
 * The trigger and every droplet are one body of glass, drawn by a single
 * `GlassMerge` surface: a droplet leaving pulls a neck of glass out of the
 * trigger that thins and lets go. The buttons themselves are clear.
 *
 * Out, the droplet nearest a pointer leans toward it, and the highlighted one
 * swells a little; a chosen one bounces before its `onSelect` runs and the
 * menu closes. A press on the trigger can slide straight onto a droplet and
 * let go there to choose it.
 *
 * Behaviour is Base UI's menu — roving focus with the arrow keys, typeahead,
 * Escape, focus returned to the trigger — so the motion and the slide are the
 * only things this adds. The popup stays mounted until the last droplet is home.
 */
export const DropletMenu = ({
  className,
  defaultOpen = false,
  icon,
  iconTurn = 0,
  items,
  label,
  layout = 'arc',
  onOpenChange,
  open: openProp,
  placement = 'around',
  radius,
  size = 'lg',
  stagger = 120,
  style,
  styles,
  tint,
}: DropletMenuProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion: mapping the OS setting
  // to `motion` is the app's call.
  const animated = config.motion
  const animatedRef = useRef(animated)
  animatedRef.current = animated
  const root = useLiquidStyles('lq-droplet-menu', { className, style, styles })
  const button = useLiquidStyles('lq-droplet-menu__button', {
    styles: {
      _disabled: { cursor: 'not-allowed', opacity: 0.45 },
      // The same ring as `.lq-button:focus-visible`, which these are not.
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: 3 },
    },
  })

  const controlled = openProp !== undefined
  // What Base UI is told. Opening follows the caller when controlled; closing
  // is always applied here first, because Base UI has already begun to close.
  const [open, setOpen] = useState(openProp ?? defaultOpen)
  const openRef = useRef(open)
  const closingRef = useRef(false)
  const silentRef = useRef(false)
  // The droplets' glass and buttons stay up from the moment the menu opens
  // until the last droplet is home, which outlasts `open`.
  const [returning, setReturning] = useState(false)
  const out = open || returning

  const actionsRef = useRef<Menu.Root.Actions | null>(null)
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const dropletRefs = useRef<(HTMLSpanElement | null)[]>([])
  const glassRef = useRef<GlassMergeHandle | null>(null)
  const portalRef = useRef<HTMLSpanElement | null>(null)
  const frameRef = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items
  // One choice per opening: set by the first droplet chosen, cleared when the menu opens again.
  const choiceRef = useRef(false)
  const dragRef = useRef<Drag | null>(null)
  const endDragRef = useRef<(() => void) | null>(null)
  // The droplet with focus, which Base UI moves with the arrow keys and the cursor alike.
  const focusedRef = useRef(-1)

  const dropletSize = DROPLET_SIZE[size]
  const triggerPixels = PIXELS[size]
  const dropletPixels = PIXELS[dropletSize]
  const choreography = useMemo(
    () => new DropletChoreography(items.length, { stagger, wobbliness: config.wobbliness }),
    // Rebuilt only when the feel changes; a new item count is a resize below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stagger, config.wobbliness],
  )
  const resolvedRadius = radius ?? dropletRadius(items.length, placement, dropletPixels, triggerPixels, layout)
  const offsets = useMemo(
    () => dropletOffsets(items.length, placement, resolvedRadius, layout),
    [items.length, layout, placement, resolvedRadius],
  )
  const offsetsRef = useRef(offsets)
  offsetsRef.current = offsets
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const box = useMemo(
    () => glassBox(offsets, triggerPixels, dropletPixels, out),
    [dropletPixels, offsets, out, triggerPixels],
  )
  const boxRef = useRef(box)
  boxRef.current = box

  const paint = useCallback(() => {
    const trigger = choreography.trigger()
    if (triggerRef.current) {
      triggerRef.current.style.transform = `scale(${trigger.scaleX.toFixed(4)}, ${trigger.scaleY.toFixed(4)})`
    }
    // The trigger's centre, in the glass surface's own pixels.
    const centreX = triggerPixels / 2 - boxRef.current.left
    const centreY = triggerPixels / 2 - boxRef.current.top
    const shapes = [triggerShape(centreX, centreY, triggerPixels, trigger)]
    for (let index = 0; index < choreography.count; index += 1) {
      const frame = choreography.droplet(index)
      const element = dropletRefs.current[index]
      if (element) element.style.transform = dropletTransform(frame)
      if (frame.scale > 0) shapes.push(dropletShape(centreX, centreY, dropletPixels, frame))
    }
    glassRef.current?.setShapes(shapes)
  }, [choreography, dropletPixels, triggerPixels])

  const finishClosing = useCallback(() => {
    if (openRef.current || !closingRef.current || !choreography.absorbed) return
    closingRef.current = false
    actionsRef.current?.unmount()
    setReturning(false)
  }, [choreography])

  // Acting on a choice: the item's own action first, then the menu closes as
  // if it had been clicked — through Base UI, so focus goes back to the trigger.
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
      const busy = choreography.step((now - last) / 1000)
      last = now
      paint()
      const chosen = choreography.takeChoice()
      if (chosen >= 0) commit(chosen)
      if (busy) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = 0
        finishClosing()
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [choreography, commit, finishClosing, paint])

  // For a change that does not restart the timeline — the pointer moving, a
  // highlight — that should not cancel the frame already on its way either:
  // the pointer can move every frame, and restarting each time would starve it.
  const wake = useCallback(() => {
    if (!frameRef.current) run()
  }, [run])

  // With motion off a choice is never left bouncing, but one could be caught
  // mid-bounce when motion is switched off.
  const settle = useCallback(() => {
    choreography.settle()
    paint()
    const chosen = choreography.takeChoice()
    if (chosen >= 0) commit(chosen)
  }, [choreography, commit, paint])

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [choreography])

  useEffect(() => () => endDragRef.current?.(), [])

  // The glass shows the trigger from the first frame, and is redrawn in place
  // whenever its surface grows for the droplets or shrinks back to the trigger.
  useBeforePaint(() => {
    paint()
  }, [box, paint])

  useEffect(() => {
    choreography.resize(items.length)
    dropletRefs.current.length = items.length
  }, [choreography, items.length])

  // A new placement or radius moves droplets already out without replaying the launch.
  useEffect(() => {
    choreography.retarget(offsets, layout)
    if (!animated) {
      settle()
      return
    }
    run()
  }, [animated, choreography, layout, offsets, run, settle])

  useEffect(() => {
    const wasOpen = openRef.current
    openRef.current = open
    // Keyed on having been open, not on droplets being out: a menu closed
    // before its first droplet left still has a popup held mounted to release.
    closingRef.current = !open && wasOpen
    if (closingRef.current) setReturning(true)
    if (open) {
      choiceRef.current = false
      choreography.open(offsetsRef.current, layoutRef.current)
    } else {
      choreography.close()
    }

    if (!animated) {
      settle()
      finishClosing()
      return
    }
    run()
  }, [animated, choreography, finishClosing, open, run, settle])

  // A controlled caller that closes the menu goes through Base UI's own close,
  // so the droplets still come home rather than the popup vanishing.
  useEffect(() => {
    if (!controlled) return
    if (openProp && !openRef.current) setOpen(true)
    else if (!openProp && openRef.current) {
      silentRef.current = true
      actionsRef.current?.close()
      silentRef.current = false
    }
  }, [controlled, openProp])

  // The magnet. One page-wide pointer listener (shared with every liquefy-ui
  // surface) reports where the pointer is against the trigger, and the nearest
  // droplet leans from its resting place — measured from where it rests rather
  // than from where it is drawn, so a droplet leaning closer is not drawn closer
  // still.
  useEffect(() => {
    const trigger = triggerButtonRef.current
    if (!animated || !out || !trigger) return
    const pullable = (index: number) => !itemsRef.current[index]?.disabled
    const stop = observeElasticPointer(trigger, (bounds, x, y) => {
      choreography.attract(
        { x: x - bounds.left - bounds.width / 2, y: y - bounds.top - bounds.height / 2 },
        dropletPixels,
        pullable,
      )
      wake()
    })
    // Nothing is near any more once a finger lifts or the cursor leaves the window.
    const release = (event: PointerEvent) => {
      if (event.type === 'pointerout' ? event.relatedTarget !== null : event.pointerType === 'mouse') return
      choreography.attract(null)
      wake()
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('pointerout', release)
    return () => {
      stop()
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('pointerout', release)
      choreography.attract(null)
    }
    // `offsets` re-measures the trigger, which a new placement can move.
  }, [animated, choreography, dropletPixels, offsets, out, wake])

  /** Swells the droplet under a sliding press, or else the one with focus. */
  const refreshHighlight = useCallback(() => {
    if (!animatedRef.current) return
    const index = dragRef.current ? dragRef.current.over : focusedRef.current
    const item = itemsRef.current[index]
    choreography.highlight(item && !item.disabled ? index : -1)
    wake()
  }, [choreography, wake])

  const choose = useCallback((index: number) => {
    const item = itemsRef.current[index]
    // Once per opening: a second droplet pressed while the first is still
    // bouncing, or one pressed on its way home, does nothing.
    if (!item || item.disabled || !openRef.current || choiceRef.current) return
    choiceRef.current = true
    if (animatedRef.current && choreography.choose(index)) wake()
    else commit(index)
  }, [choreography, commit, wake])

  const requestOpen = () => {
    if (!controlled) setOpen(true)
    onOpenChange?.(true)
  }

  // A press on the closed trigger opens the menu (Base UI does that for a
  // mouse on its own) and follows the pointer until it lets go. Let go on a
  // droplet chooses it; let go anywhere else after sliding closes the menu, as
  // a native menu does when you drag off it; let go without sliding was a tap,
  // and leaves the menu open as a click does.
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || openRef.current || dragRef.current) return
    const trigger = event.currentTarget
    const bounds = trigger.getBoundingClientRect()
    const drag: Drag = {
      centreX: bounds.left + bounds.width / 2,
      centreY: bounds.top + bounds.height / 2,
      moved: false,
      over: -1,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    dragRef.current = drag
    // Everything the pointer does until it lets go comes back to the trigger,
    // which also keeps Base UI's own release-over-an-item handling for a mouse
    // from firing alongside this one.
    try {
      trigger.setPointerCapture(event.pointerId)
    } catch {
      // Not supported, or the pointer is already gone; the window still hears it.
    }
    if (event.pointerType === 'touch') {
      // Base UI opens for touch on the tap's emulated mousedown, which only
      // comes once the finger lifts — too late to slide. Open now, and keep that
      // mousedown from arriving and toggling the menu shut again.
      event.preventDefault()
      requestOpen()
    }

    const pointAt = (moving: PointerEvent) => ({ x: moving.clientX - drag.centreX, y: moving.clientY - drag.centreY })
    const move = (moving: PointerEvent) => {
      if (moving.pointerId !== drag.pointerId) return
      if (Math.hypot(moving.clientX - drag.startX, moving.clientY - drag.startY) > DRAG_SLOP) drag.moved = true
      const over = choreography.dropletAt(pointAt(moving), dropletPixels)
      if (over === drag.over) return
      drag.over = over
      refreshHighlight()
    }
    const up = (lifted: PointerEvent) => {
      if (lifted.pointerId !== drag.pointerId) return
      end()
      if (!drag.moved) return
      const over = choreography.dropletAt(pointAt(lifted), dropletPixels)
      // A disabled droplet does nothing when let go on, as it does when clicked.
      if (over >= 0) choose(over)
      else actionsRef.current?.close()
    }
    const cancel = (cancelled: PointerEvent) => {
      if (cancelled.pointerId === drag.pointerId) end()
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      dragRef.current = null
      endDragRef.current = null
      refreshHighlight()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    endDragRef.current = end
  }

  const handleOpenChange = (next: boolean, details: Menu.Root.ChangeEventDetails) => {
    // A chosen droplet is still bouncing: the menu closes when it is done, not before.
    if (!next && choreography.choosing) {
      details.cancel()
      return
    }
    if (!next && animated) details.preventUnmountOnClose()
    if (!next || !controlled) setOpen(next)
    if (!silentRef.current) onOpenChange?.(next)
  }

  return (
    <span
      className={root.className}
      style={{
        display: 'inline-flex',
        // Its own stacking context, so the glass, the trigger and the droplets
        // keep their order whatever surrounds them; lifted to the menu layer
        // only while droplets are out, as the popup used to be.
        isolation: 'isolate',
        position: 'relative',
        verticalAlign: 'middle',
        zIndex: out ? 85 : undefined,
        ...root.style,
      }}
    >
      <GlassMerge
        bezel={Math.max(10, dropletPixels * 0.22)}
        ref={glassRef}
        spacing={SPACING}
        style={{ ...box, pointerEvents: 'none', position: 'absolute' }}
        tint={tint}
      />
      <Menu.Root
        actionsRef={actionsRef}
        modal={false}
        onOpenChange={handleOpenChange}
        open={open}
        // A row is walked with the left and right arrows, the way it reads.
        orientation={layout === 'line' && (placement === 'left' || placement === 'right') ? 'horizontal' : 'vertical'}
      >
        <span
          ref={triggerRef}
          style={{
            display: 'inline-flex',
            // Positioned, so it paints over the glass that comes before it.
            position: 'relative',
            transformOrigin: 'center',
            willChange: animated ? 'transform' : undefined,
          }}
        >
          <Menu.Trigger
            aria-label={label}
            className={button.className}
            onContextMenu={(event) => {
              // A long press that is about to slide is not asking for the browser's menu.
              if (dragRef.current) event.preventDefault()
            }}
            onPointerDown={handlePointerDown}
            ref={triggerButtonRef}
            style={{
              ...BUTTON,
              height: triggerPixels,
              // A finger that slides off the trigger is choosing a droplet, not scrolling the page.
              touchAction: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              width: triggerPixels,
            }}
            title={label}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                transform: `rotate(${open ? iconTurn : 0}deg)`,
                // A little past and back, the same overshoot the droplets land with.
                transition: animated ? 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
              }}
            >
              {icon}
            </span>
          </Menu.Trigger>
        </span>
        {/* The droplets are portalled next to their glass rather than out to the
            provider: buttons and glass are clipped and stacked by the same
            ancestors, so a droplet is never seen without its glass. */}
        <span ref={portalRef} style={{ left: 0, position: 'absolute', top: 0 }} />
        <Menu.Portal container={portalRef}>
          <Menu.Positioner
            align="center"
            // The popup is laid exactly over the trigger, and the droplets are
            // offset from its centre, so it must never flip or shift.
            collisionAvoidance={{ align: 'none', side: 'none' }}
            side="bottom"
            sideOffset={({ anchor }) => -anchor.height}
            style={{ pointerEvents: 'none' }}
          >
            <Menu.Popup
              style={{ height: 'var(--anchor-height)', outline: 'none', position: 'relative', width: 'var(--anchor-width)' }}
            >
              {items.map((item, index) => (
                <span
                  key={index}
                  ref={(element) => {
                    dropletRefs.current[index] = element
                    // The popup can mount a frame after the timeline started
                    // (and with motion off nothing repaints), so a droplet
                    // takes its place as soon as it exists.
                    if (element) element.style.transform = dropletTransform(choreography.droplet(index))
                  }}
                  style={{
                    display: 'inline-flex',
                    left: '50%',
                    pointerEvents: 'auto',
                    position: 'absolute',
                    top: '50%',
                    transform: AT_HOME,
                    willChange: animated ? 'transform' : undefined,
                  }}
                >
                  <Menu.Item
                    // Closed here, once the chosen droplet has bounced.
                    closeOnClick={false}
                    disabled={item.disabled}
                    label={item.label}
                    nativeButton
                    onBlur={() => {
                      if (focusedRef.current === index) focusedRef.current = -1
                      refreshHighlight()
                    }}
                    onClick={() => choose(index)}
                    onFocus={() => {
                      focusedRef.current = index
                      refreshHighlight()
                    }}
                    // Base UI clicks an item a mouse is released over after
                    // pressing the trigger; a slide onto a droplet is already
                    // decided by the trigger's own pointer handling.
                    onMouseUp={(event) => event.preventBaseUIHandler()}
                    render={(
                      <button
                        aria-label={item.label}
                        className={button.className}
                        style={{ ...BUTTON, height: dropletPixels, width: dropletPixels }}
                        title={item.label}
                        type="button"
                      >
                        {item.icon}
                      </button>
                    )}
                  />
                </span>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </span>
  )
}
