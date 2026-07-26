import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidProgressProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  label?: string
  max?: number
  showValue?: boolean
  tint?: string
  value?: number
}

export const LiquidProgress = forwardRef<HTMLDivElement, LiquidProgressProps>(({
  className,
  label,
  max = 100,
  showValue = false,
  style,
  styles,
  tint,
  value,
  ...props
}, ref) => {
  const indeterminate = value === undefined
  const ratio = indeterminate ? 0 : Math.min(1, Math.max(0, value / max))
  const root = useLiquidStyles('lq-progress', { className, style, styles })

  return (
    <div className={root.className} ref={ref} style={root.style} {...props}>
      {(label || showValue) && (
        <span className="lq-progress__meta">
          {label && <span className="lq-control-label">{label}</span>}
          {showValue && !indeterminate && <span className="lq-progress__value">{Math.round(ratio * 100)}%</span>}
        </span>
      )}
      <span
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={indeterminate ? undefined : value}
        className="lq-progress__track"
        data-indeterminate={indeterminate}
        role="progressbar"
        style={{ '--lq-progress': ratio, ...(tint ? { '--lq-progress-tint': tint } : {}) } as CSSProperties}
      >
        <span className="lq-progress__fill" />
      </span>
    </div>
  )
})

LiquidProgress.displayName = 'LiquidProgress'

export type LiquidSpinnerProps = HTMLAttributes<HTMLSpanElement> & LiquidStyleProps & {
  label?: string
  size?: number
  thickness?: number
  tint?: string
  value?: number
}

export const LiquidSpinner = forwardRef<HTMLSpanElement, LiquidSpinnerProps>(({
  className,
  label = 'Loading',
  size = 36,
  style,
  styles,
  thickness = 3,
  tint,
  value,
  ...props
}, ref) => {
  const indeterminate = value === undefined
  const radius = (24 - thickness) / 2
  const ratio = indeterminate ? 0.25 : Math.min(1, Math.max(0, value / 100))
  const root = useLiquidStyles('lq-spinner', {
    className,
    style,
    styles,
    vars: tint ? { '--lq-spinner-tint': tint } : undefined,
  })

  // pathLength normalises the stroke to 100 units regardless of radius, so the
  // indeterminate CSS keyframes can pulse the arc length at any size.
  return (
    <span
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={indeterminate ? undefined : value}
      className={root.className}
      data-indeterminate={indeterminate}
      ref={ref}
      role="progressbar"
      style={root.style}
      {...props}
    >
      <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <circle className="lq-spinner__track" cx="12" cy="12" r={radius} strokeWidth={thickness} />
        <circle
          className="lq-spinner__arc"
          cx="12"
          cy="12"
          pathLength={100}
          r={radius}
          strokeDasharray={indeterminate ? undefined : `${ratio * 100} 100`}
          strokeDashoffset={indeterminate ? undefined : 0}
          strokeLinecap="round"
          strokeWidth={thickness}
        />
      </svg>
    </span>
  )
})

LiquidSpinner.displayName = 'LiquidSpinner'
