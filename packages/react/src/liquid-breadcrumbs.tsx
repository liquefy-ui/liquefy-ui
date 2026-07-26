import { forwardRef, Fragment, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronRightGlyph } from './internal-glyphs'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidBreadcrumbItem = {
  href?: string
  icon?: ReactNode
  label: ReactNode
  onClick?: () => void
}

export type LiquidBreadcrumbsProps = HTMLAttributes<HTMLElement> & LiquidStyleProps & {
  items: LiquidBreadcrumbItem[]
  label?: string
  separator?: ReactNode
}

export const LiquidBreadcrumbs = forwardRef<HTMLElement, LiquidBreadcrumbsProps>(({
  className,
  items,
  label = 'Breadcrumb',
  separator,
  style,
  styles,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-breadcrumbs', { className, style, styles })

  return (
    <nav aria-label={label} className={root.className} ref={ref} style={root.style} {...props}>
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const content = (
            <>
              {item.icon && <span className="lq-breadcrumbs__icon">{item.icon}</span>}
              <span>{item.label}</span>
            </>
          )

          return (
            <Fragment key={index}>
              <li aria-current={isLast ? 'page' : undefined} data-current={isLast}>
                {isLast || (!item.href && !item.onClick)
                  ? <span className="lq-breadcrumbs__item">{content}</span>
                  : item.href
                    ? <a className="lq-breadcrumbs__item" href={item.href} onClick={item.onClick}>{content}</a>
                    : <button className="lq-breadcrumbs__item" onClick={item.onClick} type="button">{content}</button>}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="lq-breadcrumbs__separator">
                  {separator ?? <ChevronRightGlyph size={13} />}
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
})

LiquidBreadcrumbs.displayName = 'LiquidBreadcrumbs'
