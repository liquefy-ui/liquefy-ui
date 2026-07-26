import { Dialog } from '@base-ui/react/dialog'
import type { HTMLAttributes, ReactNode } from 'react'
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
  title?: ReactNode
}

export const LiquidDrawer = ({
  children,
  className,
  closeLabel = 'Close',
  onOpenChange,
  open,
  side = 'right',
  style,
  styles,
  title,
  ...props
}: LiquidDrawerProps) => {
  const portalContainer = useLiquefyPortalContainer()
  const root = useLiquidStyles('lq-drawer', { className, style, styles })

  return (
    <Dialog.Root onOpenChange={(next) => onOpenChange(next)} open={open}>
      <Dialog.Portal container={portalContainer ?? undefined}>
        <Dialog.Backdrop className="lq-drawer__backdrop" />
        <Dialog.Popup className={root.className} data-side={side} style={root.style} {...props}>
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
