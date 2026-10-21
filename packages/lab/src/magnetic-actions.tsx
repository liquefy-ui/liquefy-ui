import { Toolbar } from '@base-ui/react/toolbar'
import { observeElasticPointer } from '@liquefy-ui/core'
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
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { GlassMerge, type GlassMergeHandle } from './glass-merge'
import {
  MAGNETIC_DEFAULTS,
  magneticLayout,
  MagneticMotion,
  type MagneticFrame,
  type MagneticOrientation,
} from './magnetic-motion'
import { useBeforePaint } from './use-before-paint'

export type MagneticAction = {
  /** Stays in the arrow-key order with `aria-disabled`, as a toolbar's items do, but neither acts nor moves. */
  disabled?: boolean
  icon: ReactNode
  /** Names the button: its accessible name and its tooltip. */
  label: string
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
}

export type MagneticActionsProps = LiquidStyleProps & {
  actions: MagneticAction[]
  className?: string
  /** Clear space between neighbouring buttons at rest, in pixels. */
  gap?: number
  /** The toolbar's accessible name. */
  label: string
  /** Which way the row runs, and which arrow keys walk it. */
  orientation?: MagneticOrientation
  /** Pixels beyond a button's edge at which the pointer is first felt. */
  reach?: number
  /** Each button's side. */
  size?: 'sm' | 'md' | 'lg'
  /** Largest gap, in pixels, that two buttons' glass still bridges. Under `gap`, they rest apart. */
  spacing?: number
  /** 0 to 1: how hard the buttons are drawn toward the pointer. */
  strength?: number
  style?: CSSProperties
  tint?: string
}

/** The icon button's side at each size — kept in step with `.lq-icon-button` in @liquefy-ui/react. */
const PIXELS = { lg: 56, md: 46, sm: 36 } as const

/**
 * How far past its place a button's glass can be drawn, as a share of its
 * size: its travel is eased into a third of its size, the springs swing about
 * a quarter past that, and a lean or a press widens it by up to a sixth more.
 */
const ROAM = 0.62

/**
 * Room for the glass's cast shadow, which the lens draws inside the surface:
 * it falls up to 40px below the shapes and 30px to either side (see
 * `attachGlassMerge`).
 */
const SHADOW_ROOM = { above: 22, below: 40, side: 30 }

/**
 * Rotating into the stretch, stretching, and rotating back lays it along the
 * pull while the icon stays upright; the press's squash comes first, as the
 * glass takes it.
 */
const buttonTransform = ({ angle, scaleX, scaleY, stretch, x, y }: MagneticFrame): string => {
  if (x === 0 && y === 0 && stretch === 1 && scaleX === 1 && scaleY === 1) return ''
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg) `
    + `scale(${stretch.toFixed(4)}, ${(1 / stretch).toFixed(4)}) rotate(${(-angle).toFixed(2)}deg) `
    + `scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`
}

/**
 * The buttons are clear, over the glass that one surface draws underneath all
 * of them. These are the only marks of their own: the focus ring every
 * liquefy-ui button shows, and a disabled button's faded icon.
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
  flex: 'none',
  font: 'inherit',
  justifyContent: 'center',
  padding: 0,
  // Positioned, so it paints over the glass that comes before it.
  position: 'relative',
}

/**
 * A row of round glass action buttons that reach for the pointer. The one
 * nearest a cursor coming close is drawn toward it, its neighbours a little,
 * and buttons drawn close enough melt together like drops of liquid — a neck
 * of glass grows between them and lets go as they part. When the pointer goes
 * they spring back past their places and settle. A press squashes a button
 * and lets it go with the jelly every liquefy-ui button has.
 *
 * All of the glass is one `GlassMerge` surface; the buttons over it are clear,
 * real `<button>`s. Behaviour is Base UI's toolbar: one stop in the tab order,
 * the arrow keys along the row, Home and End. Focus moves nothing — only a
 * pointer pulls — so a keyboard user sees the row still, and the focus ring.
 */
export const MagneticActions = ({
  actions,
  className,
  gap = 14,
  label,
  orientation = 'horizontal',
  reach = MAGNETIC_DEFAULTS.reach,
  size = 'md',
  spacing = 12,
  strength = MAGNETIC_DEFAULTS.strength,
  style,
  styles,
  tint,
}: MagneticActionsProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion: mapping the OS setting
  // to `motion` is the app's call.
  const animated = config.motion
  const root = useLiquidStyles('lq-magnetic-actions', { className, style, styles })
  const button = useLiquidStyles('lq-magnetic-actions__button', {
    styles: {
      _disabled: { cursor: 'not-allowed', opacity: 0.45 },
      // The same ring as `.lq-button:focus-visible`, which these are not.
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: 3 },
    },
  })

  const pixels = PIXELS[size]
  const vertical = orientation === 'vertical'
  const rests = useMemo(
    () => magneticLayout(actions.length, pixels, gap, orientation),
    [actions.length, gap, orientation, pixels],
  )
  const motion = useMemo(
    () => new MagneticMotion(rests, { wobbliness: config.wobbliness }),
    // Rebuilt only when the feel changes; a new layout is a `place` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.wobbliness],
  )

  const rowRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const glassRef = useRef<GlassMergeHandle | null>(null)
  const frameRef = useRef(0)
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const pullRef = useRef({ reach, strength })
  pullRef.current = { reach, strength }

  const length = actions.length * pixels + Math.max(0, actions.length - 1) * gap
  const rowWidth = vertical ? pixels : length
  const rowHeight = vertical ? length : pixels
  // Where the glass surface sits relative to the row's top-left corner: over
  // everywhere a button can be drawn to, and its shadow.
  const room = Math.ceil(pixels * ROAM)
  const box = {
    height: rowHeight + room * 2 + SHADOW_ROOM.above + SHADOW_ROOM.below,
    left: -(room + SHADOW_ROOM.side),
    top: -(room + SHADOW_ROOM.above),
    width: rowWidth + (room + SHADOW_ROOM.side) * 2,
  }
  const boxRef = useRef(box)
  boxRef.current = box

  const paint = useCallback(() => {
    const shapes = []
    for (let index = 0; index < motion.count; index += 1) {
      const element = buttonRefs.current[index]
      if (element) element.style.transform = buttonTransform(motion.frame(index))
      const shape = motion.shape(index)
      shapes.push({ ...shape, x: shape.x - boxRef.current.left, y: shape.y - boxRef.current.top })
    }
    glassRef.current?.setShapes(shapes)
  }, [motion])

  const run = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    let last = performance.now()
    const tick = (now: number) => {
      const busy = motion.step((now - last) / 1000)
      last = now
      paint()
      frameRef.current = busy ? requestAnimationFrame(tick) : 0
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [motion, paint])

  // For a change that should not cancel the frame already on its way: the
  // pointer can move every frame, and restarting each time would starve it.
  const wake = useCallback(() => {
    if (!frameRef.current) run()
  }, [run])

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [motion])

  // A new count, size, gap or orientation moves the resting places, and the
  // glass is redrawn in place before the frame shows.
  useBeforePaint(() => {
    motion.place(rests)
    buttonRefs.current.length = rests.length
    paint()
  }, [motion, paint, rests, box.left, box.top])

  // Motion off: nothing pulled, nothing squashed, everything where it rests.
  useEffect(() => {
    if (animated) return
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    motion.attract(null)
    for (let index = 0; index < motion.count; index += 1) motion.release(index, false)
    motion.settle()
    paint()
  }, [animated, motion, paint, rests])

  // The magnet. One page-wide pointer listener (shared with every liquefy-ui
  // surface) reports where the pointer is against the row, and every button
  // is aimed from where it rests rather than from where it is drawn, so one
  // drawn closer is not drawn closer still.
  useEffect(() => {
    const row = rowRef.current
    if (!animated || !row) return
    const pullable = (index: number) => !actionsRef.current[index]?.disabled
    const stop = observeElasticPointer(row, (bounds, x, y) => {
      motion.attract({ x: x - bounds.left, y: y - bounds.top }, pullRef.current, pullable)
      wake()
    })
    // Nothing is near any more once a finger lifts or the cursor leaves the window.
    const release = (event: PointerEvent) => {
      if (event.type === 'pointerout' ? event.relatedTarget !== null : event.pointerType === 'mouse') return
      motion.attract(null)
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
      // Aimed home; the next frame that runs — the next pointer move, or
      // motion going off — takes it there.
      motion.attract(null)
    }
    // A new layout re-measures the row, which may have moved.
  }, [animated, motion, rests, wake])

  // The squash, while a press is held, and the jelly when it lets go — on the
  // button pressed, wherever the pointer is let go.
  const handlePointerDown = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!animated || !event.isPrimary || event.button !== 0 || actionsRef.current[index]?.disabled) return
    motion.press(index)
    wake()
    const { pointerId } = event
    const end = (ended: PointerEvent) => {
      if (ended.pointerId !== pointerId) return
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      motion.release(index, ended.type === 'pointerup')
      wake()
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <span
      className={root.className}
      style={{
        display: 'inline-flex',
        // Its own stacking context, so the glass stays under the buttons
        // whatever surrounds them.
        isolation: 'isolate',
        position: 'relative',
        verticalAlign: 'middle',
        ...root.style,
      }}
    >
      <Toolbar.Root
        aria-label={label}
        orientation={orientation}
        ref={rowRef}
        // The resting places are worked out from these numbers, so the row is
        // laid out from them alone: no padding of its own, whatever is set on
        // the wrapper.
        style={{
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          gap,
          height: rowHeight,
          position: 'relative',
          width: rowWidth,
        }}
      >
        <GlassMerge
          bezel={Math.max(10, pixels * 0.22)}
          ref={glassRef}
          // With motion off nothing melts together, even buttons set to rest
          // within `spacing` of each other.
          spacing={animated ? spacing : Math.min(spacing, gap / 2)}
          style={{ ...box, pointerEvents: 'none', position: 'absolute' }}
          tint={tint}
        />
        {actions.map((action, index) => (
          <Toolbar.Button
            aria-label={action.label}
            className={button.className}
            disabled={action.disabled}
            key={index}
            onClick={action.onClick}
            onPointerDown={(event) => handlePointerDown(index, event)}
            ref={(element) => {
              buttonRefs.current[index] = element
              // With motion off nothing repaints, so a button takes its place
              // as soon as it exists.
              if (element) element.style.transform = buttonTransform(motion.frame(index))
            }}
            style={{
              ...BUTTON,
              height: pixels,
              willChange: animated ? 'transform' : undefined,
              width: pixels,
            }}
            title={action.label}
            type="button"
          >
            {action.icon}
          </Toolbar.Button>
        ))}
      </Toolbar.Root>
    </span>
  )
}
