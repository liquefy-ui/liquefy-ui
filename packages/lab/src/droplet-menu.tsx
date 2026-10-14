import { Menu } from '@base-ui/react/menu'
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
  type ReactNode,
} from 'react'
import {
  DropletChoreography,
  dropletOffsets,
  dropletRadius,
  type DropletFrame,
  type DropletPlacement,
} from './droplet-motion'

export type DropletMenuItem = {
  disabled?: boolean
  icon: ReactNode
  /** Names the droplet: its accessible name, its tooltip, and what typeahead matches. */
  label: string
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
  onOpenChange?: (open: boolean) => void
  open?: boolean
  /** Which side of the trigger the droplets land on. `around` rings it. */
  placement?: DropletPlacement
  /** Distance from the trigger's centre to each droplet's, in pixels. Defaults to the closest that keeps them apart. */
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

const AT_HOME = 'translate(-50%, -50%) scale(0)'

/**
 * Rotating into the direction of travel, stretching, and rotating back lays
 * the stretch along the path while the icon stays upright.
 */
const dropletTransform = ({ angle, scale, stretch, x, y }: DropletFrame): string => scale === 0
  ? AT_HOME
  : `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg) `
    + `scale(${(scale * stretch).toFixed(4)}, ${(scale / stretch).toFixed(4)}) rotate(${(-angle).toFixed(2)}deg)`

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * A round glass trigger that buds its items off one at a time. Each droplet
 * stretches along the way it is travelling, swings past its place and jiggles
 * to rest, and they come home in reverse when the menu closes.
 *
 * Behaviour is Base UI's menu — roving focus with the arrow keys, typeahead,
 * Escape, focus returned to the trigger — so the motion is the only thing this
 * adds. The popup stays mounted until the last droplet is home.
 */
export const DropletMenu = ({
  className,
  defaultOpen = false,
  icon,
  iconTurn = 0,
  items,
  label,
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
  const portalContainer = useLiquefyPortalContainer()
  const prefersReducedMotion = usePrefersReducedMotion()
  const animated = config.motion && !prefersReducedMotion
  const root = useLiquidStyles('lq-droplet-menu', { className, style, styles })

  const controlled = openProp !== undefined
  // What Base UI is told. Opening follows the caller when controlled; closing
  // is always applied here first, because Base UI has already begun to close.
  const [open, setOpen] = useState(openProp ?? defaultOpen)
  const openRef = useRef(open)
  const closingRef = useRef(false)
  const silentRef = useRef(false)

  const actionsRef = useRef<Menu.Root.Actions | null>(null)
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const dropletRefs = useRef<(HTMLSpanElement | null)[]>([])
  const frameRef = useRef(0)

  const dropletSize = DROPLET_SIZE[size]
  const choreography = useMemo(
    () => new DropletChoreography(items.length, { stagger, wobbliness: config.wobbliness }),
    // Rebuilt only when the feel changes; a new item count is a resize below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stagger, config.wobbliness],
  )
  const resolvedRadius = radius ?? dropletRadius(items.length, placement, PIXELS[dropletSize], PIXELS[size])
  const offsets = useMemo(
    () => dropletOffsets(items.length, placement, resolvedRadius),
    [items.length, placement, resolvedRadius],
  )
  const offsetsRef = useRef(offsets)
  offsetsRef.current = offsets

  const paint = useCallback(() => {
    const trigger = choreography.trigger()
    if (triggerRef.current) {
      triggerRef.current.style.transform = `scale(${trigger.scaleX.toFixed(4)}, ${trigger.scaleY.toFixed(4)})`
    }
    dropletRefs.current.forEach((element, index) => {
      if (element) element.style.transform = dropletTransform(choreography.droplet(index))
    })
  }, [choreography])

  const finishClosing = useCallback(() => {
    if (openRef.current || !closingRef.current || !choreography.absorbed) return
    closingRef.current = false
    actionsRef.current?.unmount()
  }, [choreography])

  const run = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    let last = performance.now()
    const tick = (now: number) => {
      const busy = choreography.step((now - last) / 1000)
      last = now
      paint()
      if (busy) frameRef.current = requestAnimationFrame(tick)
      else finishClosing()
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [choreography, finishClosing, paint])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  useEffect(() => {
    choreography.resize(items.length)
    dropletRefs.current.length = items.length
  }, [choreography, items.length])

  // A new placement or radius moves droplets already out without replaying the launch.
  useEffect(() => {
    choreography.retarget(offsets)
    if (!animated) {
      choreography.settle()
      paint()
      return
    }
    run()
  }, [animated, choreography, offsets, paint, run])

  useEffect(() => {
    const wasOpen = openRef.current
    openRef.current = open
    // Keyed on having been open, not on droplets being out: a menu closed
    // before its first droplet left still has a popup held mounted to release.
    closingRef.current = !open && wasOpen
    if (open) choreography.open(offsetsRef.current)
    else choreography.close()

    if (!animated) {
      choreography.settle()
      paint()
      finishClosing()
      return
    }
    run()
  }, [animated, choreography, finishClosing, open, paint, run])

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

  const handleOpenChange = (next: boolean, details: Menu.Root.ChangeEventDetails) => {
    if (!next && animated) details.preventUnmountOnClose()
    if (!next || !controlled) setOpen(next)
    if (!silentRef.current) onOpenChange?.(next)
  }

  return (
    <span className={root.className} style={{ display: 'inline-flex', verticalAlign: 'middle', ...root.style }}>
      <Menu.Root actionsRef={actionsRef} modal={false} onOpenChange={handleOpenChange} open={open}>
        <span
          ref={triggerRef}
          style={{ display: 'inline-flex', transformOrigin: 'center', willChange: animated ? 'transform' : undefined }}
        >
          <Menu.Trigger
            render={(
              <LiquidIconButton label={label} shape="circle" size={size} tint={tint}>
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
              </LiquidIconButton>
            )}
          />
        </span>
        <Menu.Portal container={portalContainer ?? undefined}>
          <Menu.Positioner
            align="center"
            // The popup is laid exactly over the trigger, and the droplets are
            // offset from its centre, so it must never flip or shift.
            collisionAvoidance={{ align: 'none', side: 'none' }}
            side="bottom"
            sideOffset={({ anchor }) => -anchor.height}
            style={{ pointerEvents: 'none', zIndex: 85 }}
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
                    disabled={item.disabled}
                    label={item.label}
                    nativeButton
                    onClick={() => item.onSelect?.()}
                    render={(
                      <LiquidIconButton disabled={item.disabled} label={item.label} shape="circle" size={dropletSize} tint={tint}>
                        {item.icon}
                      </LiquidIconButton>
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
