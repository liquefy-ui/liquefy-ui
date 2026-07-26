import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidBadgeProps = HTMLAttributes<HTMLSpanElement> & LiquidStyleProps & {
  children?: ReactNode
  count?: number
  dot?: boolean
  max?: number
  showZero?: boolean
  tint?: string
}

export const LiquidBadge = forwardRef<HTMLSpanElement, LiquidBadgeProps>(({
  children,
  className,
  count,
  dot = false,
  max = 99,
  showZero = false,
  style,
  styles,
  tint,
  ...props
}, ref) => {
  const showCount = count !== undefined && (count > 0 || showZero)
  const visible = dot || showCount
  const display = count !== undefined && count > max ? `${max}+` : count
  const root = useLiquidStyles('lq-badge', {
    className,
    style,
    styles,
    vars: tint ? { '--lq-badge-tint': tint } : undefined,
  })

  return (
    <span className={root.className} ref={ref} style={root.style} {...props}>
      {children}
      {visible && (
        <span className="lq-badge__indicator" data-dot={dot}>
          {!dot && display}
        </span>
      )}
    </span>
  )
})

LiquidBadge.displayName = 'LiquidBadge'
