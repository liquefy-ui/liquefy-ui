import { forwardRef, type HTMLAttributes, type LiHTMLAttributes, type ReactNode } from 'react'
import { ChevronRightGlyph } from './internal-glyphs'
import { LiquidSurface, type LiquidSurfaceProps } from './liquid-surface'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidListProps = Omit<LiquidSurfaceProps, 'children'> & {
  children: ReactNode
  inset?: boolean
}

export const LiquidList = forwardRef<HTMLDivElement, LiquidListProps>(({
  children,
  className,
  inset = false,
  ...props
}, ref) => (
  <LiquidSurface
    className={['lq-list', className].filter(Boolean).join(' ')}
    data-inset={inset}
    interactive={false}
    lens={false}
    ref={ref}
    webgl={false}
    {...props}
  >
    <ul className="lq-list__items" role="list">{children}</ul>
  </LiquidSurface>
))

LiquidList.displayName = 'LiquidList'

export type LiquidListItemProps = LiHTMLAttributes<HTMLLIElement> & LiquidStyleProps & {
  children: ReactNode
  chevron?: boolean
  description?: ReactNode
  end?: ReactNode
  icon?: ReactNode
  onActivate?: () => void
}

export const LiquidListItem = forwardRef<HTMLLIElement, LiquidListItemProps>(({
  chevron = false,
  children,
  className,
  description,
  end,
  icon,
  onActivate,
  style,
  styles,
  ...props
}, ref) => {
  const interactive = Boolean(onActivate)
  const body = (
    <>
      {icon && <span className="lq-list__icon">{icon}</span>}
      <span className="lq-list__copy">
        <span className="lq-list__title">{children}</span>
        {description && <span className="lq-list__description">{description}</span>}
      </span>
      {end && <span className="lq-list__end">{end}</span>}
      {chevron && <span className="lq-list__chevron"><ChevronRightGlyph size={15} /></span>}
    </>
  )
  const root = useLiquidStyles('lq-list__item', { className, style, styles })

  return (
    <li className={root.className} data-interactive={interactive} ref={ref} style={root.style} {...props}>
      {interactive
        ? <button className="lq-list__item-button" onClick={onActivate} type="button">{body}</button>
        : <span className="lq-list__item-static">{body}</span>}
    </li>
  )
})

LiquidListItem.displayName = 'LiquidListItem'

export type LiquidListSubheaderProps = HTMLAttributes<HTMLLIElement> & LiquidStyleProps

export const LiquidListSubheader = forwardRef<HTMLLIElement, LiquidListSubheaderProps>(
  ({ className, style, styles, ...props }, ref) => {
    const root = useLiquidStyles('lq-list__subheader', { className, style, styles })

    return <li aria-hidden="true" className={root.className} ref={ref} style={root.style} {...props} />
  },
)

LiquidListSubheader.displayName = 'LiquidListSubheader'
