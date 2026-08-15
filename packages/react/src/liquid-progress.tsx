import { Progress } from '@base-ui/react/progress'
import { forwardRef, type HTMLAttributes } from 'react'
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
  // Base UI reads `null` as "still working, no idea how far", which is what
  // leaving the value off has always meant here. It also drives the fill width
  // itself, so the only thing left to hand the stylesheet is the tint.
  const root = useLiquidStyles('lq-progress', {
    className,
    style,
    styles,
    vars: tint ? { '--lq-progress-tint': tint } : undefined,
  })

  return (
    <Progress.Root
      className={root.className}
      max={max}
      ref={ref}
      style={root.style}
      value={value ?? null}
      {...props}
    >
      {(label || showValue) && (
        <span className="lq-progress__meta">
          {label && <Progress.Label className="lq-control-label">{label}</Progress.Label>}
          {showValue && (
            <Progress.Value className="lq-progress__value">
              {(_, currentValue) => currentValue === null ? null : `${Math.round((currentValue / max) * 100)}%`}
            </Progress.Value>
          )}
        </span>
      )}
      <Progress.Track className="lq-progress__track">
        <Progress.Indicator className="lq-progress__fill" />
      </Progress.Track>
    </Progress.Root>
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
