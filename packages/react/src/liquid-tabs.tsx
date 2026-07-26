import { Tabs } from '@base-ui/react/tabs'
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// Base UI owns the roving tabindex, the arrow/Home/End keys and the
// aria-controls / aria-labelledby wiring between each tab and its panel.
// Everything liquefy-ui adds on top is the underline and the jelly animation.

export type LiquidTabsProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & LiquidStyleProps & {
  children: ReactNode
  defaultValue?: string
  onValueChange?: (value: string) => void
  value?: string
}

export const LiquidTabs = forwardRef<HTMLDivElement, LiquidTabsProps>(({
  children,
  className,
  defaultValue,
  onValueChange,
  style,
  styles,
  value,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-tabs', { className, style, styles })

  return (
    <Tabs.Root
      className={root.className}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(String(next))}
      ref={ref}
      style={root.style}
      value={value}
      {...props}
    >
      {children}
    </Tabs.Root>
  )
})

LiquidTabs.displayName = 'LiquidTabs'

export type LiquidTabListProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  children: ReactNode
  label?: string
}

export const LiquidTabList = forwardRef<HTMLDivElement, LiquidTabListProps>(({
  children,
  className,
  label,
  style,
  styles,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-tab-list', { className, style, styles })

  return (
    <Tabs.List
      // Panels are local content that appears immediately, which is the case
      // WAI-ARIA says should activate on focus rather than needing Enter.
      activateOnFocus
      aria-label={label}
      className={root.className}
      ref={ref}
      style={root.style}
      {...props}
    >
      {children}
    </Tabs.List>
  )
})

LiquidTabList.displayName = 'LiquidTabList'

export type LiquidTabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & LiquidStyleProps & {
  children: ReactNode
  icon?: ReactNode
  value: string
}

export const LiquidTab = forwardRef<HTMLButtonElement, LiquidTabProps>(({
  children,
  className,
  icon,
  style,
  styles,
  value,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-tab', { className, style, styles })

  return (
    <Tabs.Tab className={root.className} ref={ref} style={root.style} value={value} {...props}>
      {icon && <span className="lq-tab__icon">{icon}</span>}
      <span>{children}</span>
      {/* --lq-tab-active is flipped by CSS off Base UI's data-active, so the
          underline needs no state of its own. */}
      <span aria-hidden="true" className="lq-tab__underline" />
    </Tabs.Tab>
  )
})

LiquidTab.displayName = 'LiquidTab'

export type LiquidTabPanelProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  children: ReactNode
  value: string
}

export const LiquidTabPanel = forwardRef<HTMLDivElement, LiquidTabPanelProps>(({
  children,
  className,
  style,
  styles,
  value,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-tab-panel', { className, style, styles })

  return (
    <Tabs.Panel className={root.className} ref={ref} style={root.style} value={value} {...props}>
      {children}
    </Tabs.Panel>
  )
})

LiquidTabPanel.displayName = 'LiquidTabPanel'
