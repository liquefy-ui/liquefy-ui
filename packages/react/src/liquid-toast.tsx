import { Toast } from '@base-ui/react/toast'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { DangerGlyph, InfoGlyph, SuccessGlyph, WarningGlyph, XGlyph } from './internal-glyphs'
import type { LiquidAlertSeverity } from './liquid-alert'
import { useLiquefyPortalContainer } from './provider'

// The old version kept its own array of toasts and dismissed each one from a
// bare `setTimeout`. That timer ran whether or not anyone was reading: hovering
// the stack, focusing a button inside it or tabbing away to another window all
// left it counting down, so a message could vanish mid-sentence. Base UI owns
// the queue now, and pauses it on hover, on focus and while the tab is hidden.

export type LiquidToastOptions = {
  description?: ReactNode
  duration?: number
  severity?: LiquidAlertSeverity
  title: ReactNode
}

type ToastContextValue = {
  dismiss: (id: string) => void
  toast: (options: LiquidToastOptions) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

const severityGlyphs = {
  danger: <DangerGlyph size={17} />,
  info: <InfoGlyph size={17} />,
  success: <SuccessGlyph size={17} />,
  warning: <WarningGlyph size={17} />,
} as const

/** How long a message sits there before it withdraws itself. */
const defaultDuration = 4200

export type LiquidToastProviderProps = {
  children: ReactNode
  placement?: 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center'
}

const severityOf = (type: string | undefined): LiquidAlertSeverity =>
  type === 'success' || type === 'warning' || type === 'danger' ? type : 'info'

/**
 * Bridges Base UI's manager to the hook this library already exported, so
 * `toast()` and `dismiss()` keep their shapes and the error thrown outside a
 * provider keeps naming the provider that is missing.
 */
const ToastBridge = ({ children }: { children: ReactNode }) => {
  const manager = Toast.useToastManager()

  const value = useMemo<ToastContextValue>(() => ({
    dismiss: (id) => manager.close(id),
    toast: ({ description, duration, severity = 'info', title }) => manager.add({
      description,
      // Base UI reads `0` as "never dismiss on its own", which is what this
      // prop has always meant here too.
      timeout: duration,
      title,
      type: severity,
    }),
  }), [manager])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

const ToastList = () => {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => (
    <Toast.Root className="lq-toast" key={toast.id} toast={toast}>
      <Toast.Content className="lq-toast__content">
        <span className="lq-toast__icon">{severityGlyphs[severityOf(toast.type)]}</span>
        <span className="lq-toast__copy">
          <Toast.Title render={<strong />} />
          {toast.description && <Toast.Description render={<span />} />}
        </span>
        <Toast.Close aria-label="Dismiss" className="lq-toast__close">
          <XGlyph size={12} />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ))
}

export const LiquidToastProvider = ({ children, placement = 'bottom-right' }: LiquidToastProviderProps) => {
  // The theme tokens live on `.lq-provider`, so a viewport portaled to the body
  // reads none of them: `--lq-solid-fill` resolves to nothing, the `color-mix`
  // built on it is invalid, and the toast loses its fill and shadow entirely.
  // The provider's own portal node is the fix Dialog, Drawer and Select already
  // use — it is an unstyled div, so a fixed child still anchors to the screen.
  // The body remains the fallback for a toast provider mounted on its own.
  const portalContainer = useLiquefyPortalContainer()

  return (
    <Toast.Provider timeout={defaultDuration}>
      <ToastBridge>{children}</ToastBridge>
      <Toast.Portal container={portalContainer ?? undefined}>
        <Toast.Viewport className="lq-toast-viewport" data-placement={placement}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

export const useLiquidToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useLiquidToast must be used within a LiquidToastProvider')
  return context
}
