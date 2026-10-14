import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidGaugeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & LiquidStyleProps & {
  /** What is being measured. Required: a gauge with no name is just a ring. */
  label: string
  /** Current reading, from 0 to `max`. Out-of-range values are clamped. */
  value: number
  max?: number
  /** Rendered diameter in pixels. */
  size?: number
  /** Stroke width of the ring, on the same 24-unit scale as LiquidSpinner. */
  thickness?: number
  tint?: string
  /** Replaces the percentage in the middle — a byte count, a temperature, an icon. */
  children?: ReactNode
}

export const LiquidGauge = forwardRef<HTMLSpanElement, LiquidGaugeProps>(({
  children,
  className,
  label,
  max = 100,
  size = 88,
  style,
  styles,
  thickness = 2.4,
  tint,
  value,
  ...props
}, ref) => {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const percent = Math.round(ratio * 100)
  const radius = (24 - thickness) / 2
  const root = useLiquidStyles('lq-gauge', {
    className,
    style,
    styles,
    vars: { '--lq-gauge-size': `${size}px`, ...(tint ? { '--lq-gauge-tint': tint } : {}) },
  })

  // A meter rather than a progressbar: this is a level (memory in use, a disk
  // filling up), not a task heading for done. The arc starts at twelve o'clock,
  // where a reader looks for zero, and pathLength keeps the dash in percent at
  // any radius.
  return (
    <span
      aria-label={label}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={ratio * max}
      aria-valuetext={`${percent}%`}
      className={root.className}
      ref={ref}
      role="meter"
      style={root.style}
      {...props}
    >
      <svg aria-hidden="true" className="lq-gauge__ring" fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <circle className="lq-gauge__track" cx="12" cy="12" r={radius} strokeWidth={thickness} />
        {/* A round cap draws a dot even at a zero-length dash, so an empty gauge leaves the arc out. */}
        {percent > 0 && (
          <circle
            className="lq-gauge__arc"
            cx="12"
            cy="12"
            pathLength={100}
            r={radius}
            strokeDasharray={`${percent} 100`}
            strokeLinecap="round"
            strokeWidth={thickness}
            transform="rotate(-90 12 12)"
          />
        )}
      </svg>
      <span aria-hidden="true" className="lq-gauge__value">
        {children ?? <>{percent}<small>%</small></>}
      </span>
    </span>
  )
})

LiquidGauge.displayName = 'LiquidGauge'
