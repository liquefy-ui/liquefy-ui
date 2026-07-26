import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { DangerGlyph, InfoGlyph, SuccessGlyph, WarningGlyph, XGlyph } from './internal-glyphs'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidAlertSeverity = 'info' | 'success' | 'warning' | 'danger'

export type LiquidAlertProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  action?: ReactNode
  children: ReactNode
  closeLabel?: string
  icon?: ReactNode
  onClose?: () => void
  severity?: LiquidAlertSeverity
  title?: ReactNode
}

const severityGlyphs = {
  danger: <DangerGlyph size={19} />,
  info: <InfoGlyph size={19} />,
  success: <SuccessGlyph size={19} />,
  warning: <WarningGlyph size={19} />,
} as const

export const LiquidAlert = forwardRef<HTMLDivElement, LiquidAlertProps>(({
  action,
  children,
  className,
  closeLabel = 'Dismiss',
  icon,
  onClose,
  severity = 'info',
  style,
  styles,
  title,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-alert', { className, style, styles })

  return (
    <div
      className={root.className}
      data-severity={severity}
      ref={ref}
      role={severity === 'danger' || severity === 'warning' ? 'alert' : 'status'}
      style={root.style}
      {...props}
    >
      <span className="lq-alert__icon">{icon ?? severityGlyphs[severity]}</span>
      <span className="lq-alert__copy">
        {title && <strong className="lq-alert__title">{title}</strong>}
        <span className="lq-alert__message">{children}</span>
      </span>
      {action && <span className="lq-alert__action">{action}</span>}
      {onClose && (
        <button aria-label={closeLabel} className="lq-alert__close" onClick={onClose} type="button">
          <XGlyph size={13} />
        </button>
      )}
    </div>
  )
})

LiquidAlert.displayName = 'LiquidAlert'
