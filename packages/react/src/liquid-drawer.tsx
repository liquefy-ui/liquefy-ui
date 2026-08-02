import { Dialog } from '@base-ui/react/dialog'
import { useRef, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react'
import { XGlyph } from './internal-glyphs'
import { LiquidSurface } from './liquid-surface'
import { useLiquefyPortalContainer } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// The old version drove a native <dialog> and hand-timed the exit animation off
// an animationend listener with a 700ms fallback. Base UI keeps the popup mounted
// for as long as the CSS animation runs, so the panel slides out on its own and
// the focus trap, scroll lock and Escape handling come with it.

export type LiquidDrawerProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & LiquidStyleProps & {
  children: ReactNode
  closeLabel?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  side?: 'left' | 'right' | 'bottom'
  /** Flick the panel towards its own edge to dismiss it. Touch and pen only. */
  swipeToClose?: boolean
  title?: ReactNode
}

type Point = { x: number; y: number }

/** How far the finger travels before a drag counts as a dismissing flick. */
const swipeDistance = 56

/**
 * True when something under the finger can still scroll the way the flick would
 * scroll it. A sheet is dismissed from the top of its content, not from halfway
 * down it, and a row of chips that scrolls sideways owns its own drags.
 */
const canScrollAway = (target: Node, root: HTMLElement, side: 'left' | 'right' | 'bottom') => {
  let node: Element | null = target instanceof Element ? target : target.parentElement

  while (node && root.contains(node)) {
    if (side === 'bottom' && node.scrollTop > 0) return true
    if (side === 'right' && node.scrollLeft > 0) return true
    if (side === 'left' && node.scrollLeft < node.scrollWidth - node.clientWidth) return true
    node = node.parentElement
  }

  return false
}

export const LiquidDrawer = ({
  children,
  className,
  closeLabel = 'Close',
  onOpenChange,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  open,
  side = 'right',
  style,
  styles,
  swipeToClose = true,
  title,
  ...props
}: LiquidDrawerProps) => {
  const portalContainer = useLiquefyPortalContainer()
  const popupRef = useRef<HTMLDivElement>(null)
  const origin = useRef<Point | null>(null)
  const root = useLiquidStyles('lq-drawer', { className, style, styles })

  // The gesture rides along with whatever the caller already listens for, rather
  // than replacing it: `{...props}` would otherwise let one of the two win.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    origin.current = null

    // A mouse has the close button and the backdrop; dragging one across a panel
    // is how text gets selected, not how a sheet gets dismissed.
    if (!swipeToClose || event.pointerType === 'mouse' || !(event.target instanceof Node)) return

    // Anything the panel opens — a select's listbox, a menu, a tooltip — is
    // portaled out of the panel but still bubbles its events back through the
    // React tree, so scrolling a list of options would otherwise read as a flick
    // on the panel itself and throw away whatever was half filled in.
    const panel = popupRef.current
    if (!panel?.contains(event.target) || canScrollAway(event.target, panel, side)) return

    origin.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event)

    const start = origin.current
    origin.current = null
    if (!start) return

    const x = event.clientX - start.x
    const y = event.clientY - start.y
    const towardsEdge = side === 'bottom' ? y : side === 'right' ? x : -x
    const across = side === 'bottom' ? Math.abs(x) : Math.abs(y)

    if (towardsEdge > swipeDistance && towardsEdge > across) onOpenChange(false)
  }

  return (
    <Dialog.Root onOpenChange={(next) => onOpenChange(next)} open={open}>
      <Dialog.Portal container={portalContainer ?? undefined}>
        <Dialog.Backdrop className="lq-drawer__backdrop" />
        <Dialog.Popup
          className={root.className}
          data-side={side}
          onPointerCancel={(event) => {
            onPointerCancel?.(event)
            origin.current = null
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          ref={popupRef}
          style={root.style}
          {...props}
        >
          <LiquidSurface
            className="lq-drawer__surface"
            interactive={false}
            radius={side === 'bottom' ? '26px 26px 0 0' : 0}
          >
            <div className="lq-drawer__header">
              {title && <Dialog.Title>{title}</Dialog.Title>}
              <Dialog.Close aria-label={closeLabel} className="lq-drawer__close">
                <XGlyph size={14} />
              </Dialog.Close>
            </div>
            <div className="lq-drawer__body">{children}</div>
          </LiquidSurface>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
