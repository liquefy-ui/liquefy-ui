import {
  Children,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { LiquidSurface } from './liquid-surface'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type GlassDockProps = HTMLAttributes<HTMLElement> & LiquidStyleProps & {
  children: ReactNode
  label?: string
  position?: 'inline' | 'floating'
}

export const GlassDock = forwardRef<HTMLElement, GlassDockProps>(({
  children,
  className,
  label = 'Primary navigation',
  position = 'inline',
  style,
  styles,
  ...props
}, ref) => {
  const items = Children.toArray(children)
  const activeIndex = items.findIndex((child) => {
    return isValidElement<DockItemProps>(child) && child.props.active
  })
  const dockStyle = {
    '--lq-dock-active-index': Math.max(0, activeIndex),
    '--lq-dock-item-count': items.length,
  } as CSSProperties
  // The shell is the layout box; the glass bar inside keeps its own geometry.
  const root = useLiquidStyles('lq-dock-shell', { className, style, styles })

  return (
    <nav
      aria-label={label}
      className={root.className}
      data-position={position}
      ref={ref}
      style={root.style}
      {...props}
    >
      <LiquidSurface className="lq-dock" radius="18px" style={dockStyle}>
        <span aria-hidden="true" className="lq-dock__indicator" data-visible={activeIndex >= 0} />
        {items}
      </LiquidSurface>
    </nav>
  )
})

GlassDock.displayName = 'GlassDock'

export type DockItemProps = ButtonHTMLAttributes<HTMLButtonElement> & LiquidStyleProps & {
  active?: boolean
  icon: ReactNode
  label: string
}

export const DockItem = forwardRef<HTMLButtonElement, DockItemProps>(({
  active = false,
  className,
  icon,
  label,
  style,
  styles,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-dock__item', { className, style, styles })

  return (
    <button
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={root.className}
      data-active={active}
      ref={ref}
      style={root.style}
      title={label}
      type="button"
      {...props}
    >
      {icon}
    </button>
  )
})

DockItem.displayName = 'DockItem'
