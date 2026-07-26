import { forwardRef, type HTMLAttributes } from 'react'
import { useLiquidStyles, type LiquidCustomProperties, type LiquidStyleProps } from './styles-prop'

export type LiquidSkeletonProps = HTMLAttributes<HTMLSpanElement> & LiquidStyleProps & {
  height?: number | string
  radius?: number | string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: number | string
}

const toUnit = (value: number | string | undefined): string | undefined =>
  typeof value === 'number' ? `${value}px` : value

export const LiquidSkeleton = forwardRef<HTMLSpanElement, LiquidSkeletonProps>(({
  className,
  height,
  radius,
  style,
  styles,
  variant = 'text',
  width,
  ...props
}, ref) => {
  const vars: LiquidCustomProperties = {
    ...(width !== undefined ? { width: toUnit(width) } : {}),
    ...(height !== undefined ? { height: toUnit(height) } : {}),
    ...(radius !== undefined ? { borderRadius: toUnit(radius) } : {}),
  }
  const root = useLiquidStyles('lq-skeleton', { className, style, styles, vars })

  return (
    <span
      aria-hidden="true"
      className={root.className}
      data-liquid-variant={variant}
      ref={ref}
      style={root.style}
      {...props}
    />
  )
})

LiquidSkeleton.displayName = 'LiquidSkeleton'
