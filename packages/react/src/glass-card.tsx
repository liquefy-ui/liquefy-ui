import { forwardRef, type ReactNode } from 'react'
import { LiquidSurface, type LiquidSurfaceProps } from './liquid-surface'

// `title` is omitted alongside `children` because HTMLAttributes declares it as
// the tooltip attribute, i.e. a `string`. Intersecting that with `ReactNode`
// leaves `string`, so the heading below could never be given an element. Every
// component here that renders a `title` into an element omits it for this reason.
export type GlassCardProps = Omit<LiquidSurfaceProps, 'children' | 'title'> & {
  children: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  footer?: ReactNode
  title?: ReactNode
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  children,
  className,
  description,
  eyebrow,
  footer,
  title,
  ...props
}, ref) => {
  return (
    <LiquidSurface className={['lq-card', className].filter(Boolean).join(' ')} lens={false} ref={ref} {...props}>
      {(eyebrow || title || description) && (
        <header className="lq-card__header">
          {eyebrow && <span className="lq-card__eyebrow">{eyebrow}</span>}
          {title && <h3 className="lq-card__title">{title}</h3>}
          {description && <p className="lq-card__description">{description}</p>}
        </header>
      )}
      <div className="lq-card__body">{children}</div>
      {footer && <footer className="lq-card__footer">{footer}</footer>}
    </LiquidSurface>
  )
})

GlassCard.displayName = 'GlassCard'
