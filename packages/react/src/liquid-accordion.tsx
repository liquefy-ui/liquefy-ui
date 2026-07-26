import { Accordion } from '@base-ui/react/accordion'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronDownGlyph } from './internal-glyphs'
import { LiquidSurface, type LiquidSurfaceProps } from './liquid-surface'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// Base UI owns the roving focus across headers, the aria-controls wiring and the
// panel height measurement (exposed as --accordion-panel-height). liquefy-ui keeps
// the glass surface, the chevron and the jelly open animation.

export type LiquidAccordionProps = Omit<LiquidSurfaceProps, 'children' | 'defaultValue'> & {
  children: ReactNode
  defaultValue?: string[]
  multiple?: boolean
  onValueChange?: (value: string[]) => void
  value?: string[]
}

export const LiquidAccordion = forwardRef<HTMLDivElement, LiquidAccordionProps>(({
  children,
  className,
  defaultValue = [],
  multiple = false,
  onValueChange,
  value,
  ...props
}, ref) => (
  <Accordion.Root
    defaultValue={defaultValue}
    multiple={multiple}
    onValueChange={(next) => onValueChange?.(next.map(String))}
    render={(
      <LiquidSurface
        className={['lq-accordion', className].filter(Boolean).join(' ')}
        interactive={false}
        lens={false}
        ref={ref}
        webgl={false}
        {...props}
      />
    )}
    value={value}
  >
    {children}
  </Accordion.Root>
))

LiquidAccordion.displayName = 'LiquidAccordion'

export type LiquidAccordionItemProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  children: ReactNode
  subtitle?: ReactNode
  title: ReactNode
  value: string
}

export const LiquidAccordionItem = forwardRef<HTMLDivElement, LiquidAccordionItemProps>(({
  children,
  className,
  style,
  styles,
  subtitle,
  title,
  value,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-accordion__item', { className, style, styles })

  return (
    <Accordion.Item className={root.className} ref={ref} style={root.style} value={value} {...props}>
      {/* A real heading, so screen-reader users can jump between sections. */}
      <Accordion.Header className="lq-accordion__header">
        <Accordion.Trigger className="lq-accordion__trigger">
          <span className="lq-accordion__heading">
            <span className="lq-accordion__title">{title}</span>
            {subtitle && <span className="lq-accordion__subtitle">{subtitle}</span>}
          </span>
          <span className="lq-accordion__chevron"><ChevronDownGlyph size={15} /></span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="lq-accordion__content">
        <div className="lq-accordion__content-inner">{children}</div>
      </Accordion.Panel>
    </Accordion.Item>
  )
})

LiquidAccordionItem.displayName = 'LiquidAccordionItem'
