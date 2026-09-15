import { Separator } from '@base-ui/react/separator'
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
    <Separator
      className={root.className}
      data-with-label={Boolean(children) || undefined}
      orientation={orientation}
      ref={ref}
      style={root.style}
      {...props}
    >
      {children && <span className="lq-divider__label">{children}</span>}
    </Separator>
  )
})

LiquidDivider.displayName = 'LiquidDivider'
