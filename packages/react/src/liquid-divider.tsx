import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidDividerProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  children?: ReactNode
  orientation?: 'horizontal' | 'vertical'
}

export const LiquidDivider = forwardRef<HTMLDivElement, LiquidDividerProps>(({
  children,
  className,
  orientation = 'horizontal',
  style,
  styles,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-divider', { className, style, styles })

  return (
    <div
      aria-orientation={orientation}
      className={root.className}
      data-orientation={orientation}
      data-with-label={Boolean(children)}
      ref={ref}
      role="separator"
      style={root.style}
      {...props}
    >
      {children && <span className="lq-divider__label">{children}</span>}
    </div>
  )
})

LiquidDivider.displayName = 'LiquidDivider'
