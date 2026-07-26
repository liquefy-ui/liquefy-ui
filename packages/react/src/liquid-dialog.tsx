import { Dialog } from '@base-ui/react/dialog'
import type { HTMLAttributes, ReactNode } from 'react'
import { LiquidButton } from './liquid-button'
import { LiquidSurface } from './liquid-surface'
import { useLiquefyPortalContainer } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// Was a bare <dialog> with showModal(). Base UI adds what that was missing:
// focus lands inside the panel and returns to the trigger on close, the page
// behind is inert and scroll-locked, and Title/Description wire themselves up as
// aria-labelledby / aria-describedby instead of being unlabelled headings.

export type LiquidDialogProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & LiquidStyleProps & {
  children: ReactNode
  closeLabel?: string
  description?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  title: ReactNode
}

export const LiquidDialog = ({
  children,
  className,
  closeLabel = 'Close',
  description,
  onOpenChange,
  open,
  style,
  styles,
  title,
  ...props
}: LiquidDialogProps) => {
  const portalContainer = useLiquefyPortalContainer()
  const root = useLiquidStyles('lq-dialog', { className, style, styles })

  return (
    <Dialog.Root onOpenChange={(next) => onOpenChange(next)} open={open}>
      <Dialog.Portal container={portalContainer ?? undefined}>
        <Dialog.Backdrop className="lq-dialog__backdrop" />
        <Dialog.Popup className={root.className} style={root.style} {...props}>
          <LiquidSurface className="lq-dialog__surface" radius={32}>
            <div className="lq-dialog__header">
              <div>
                <Dialog.Title>{title}</Dialog.Title>
                {description && <Dialog.Description>{description}</Dialog.Description>}
              </div>
              <Dialog.Close
                render={(
                  <LiquidButton aria-label={closeLabel} size="sm">
                    <span aria-hidden="true">×</span>
                  </LiquidButton>
                )}
              />
            </div>
            <div className="lq-dialog__body">{children}</div>
          </LiquidSurface>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
