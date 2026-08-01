import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { DangerGlyph, InfoGlyph, SuccessGlyph, WarningGlyph, XGlyph } from './internal-glyphs'
import type { LiquidAlertSeverity } from './liquid-alert'
import { useLiquefyPortalContainer } from './provider'

export type LiquidToastOptions = {
  description?: ReactNode
  duration?: number
  severity?: LiquidAlertSeverity
  title: ReactNode
}

type ToastRecord = LiquidToastOptions & {
  id: number
  leaving: boolean
}

type ToastContextValue = {
  dismiss: (id: number) => void
  toast: (options: LiquidToastOptions) => number
}

const ToastContext = createContext<ToastContextValue | null>(null)

const severityGlyphs = {
  danger: <DangerGlyph size={17} />,
  info: <InfoGlyph size={17} />,
  success: <SuccessGlyph size={17} />,
  warning: <WarningGlyph size={17} />,
} as const

export type LiquidToastProviderProps = {
  children: ReactNode
  placement?: 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center'
}

export const LiquidToastProvider = ({ children, placement = 'bottom-right' }: LiquidToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const [mounted, setMounted] = useState(false)
  const idRef = useRef(0)
  // The theme tokens live on `.lq-provider`, so a viewport portaled to the body
  // reads none of them: `--lq-solid-fill` resolves to nothing, the `color-mix`
  // built on it is invalid, and the toast loses its fill and shadow entirely.
  // The provider's own portal node is the fix Dialog, Drawer and Select already
  // use — it is an unstyled div, so a fixed child still anchors to the screen.
  // The body remains the fallback for a toast provider mounted on its own.
  const portalContainer = useLiquefyPortalContainer()

  useEffect(() => setMounted(true), [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((item) => item.id === id ? { ...item, leaving: true } : item))
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 360)
  }, [])

  const toast = useCallback((options: LiquidToastOptions) => {
    idRef.current += 1
    const id = idRef.current
    setToasts((current) => [...current, { duration: 4200, severity: 'info', ...options, id, leaving: false }])
    const duration = options.duration ?? 4200
    if (duration > 0) window.setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const value = useMemo(() => ({ dismiss, toast }), [dismiss, toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && createPortal(
        <div aria-live="polite" className="lq-toast-viewport" data-placement={placement}>
          {toasts.map((item) => (
            <div className="lq-toast" data-leaving={item.leaving} data-severity={item.severity} key={item.id} role="status">
              <span className="lq-toast__icon">{severityGlyphs[item.severity ?? 'info']}</span>
              <span className="lq-toast__copy">
                <strong>{item.title}</strong>
                {item.description && <span>{item.description}</span>}
              </span>
              <button aria-label="Dismiss" className="lq-toast__close" onClick={() => dismiss(item.id)} type="button">
                <XGlyph size={12} />
              </button>
            </div>
          ))}
        </div>,
        portalContainer ?? document.body,
      )}
    </ToastContext.Provider>
  )
}

export const useLiquidToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useLiquidToast must be used within a LiquidToastProvider')
  return context
}
