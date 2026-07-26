import { forwardRef, type HTMLAttributes, type TableHTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'
import { LiquidSurface, type LiquidSurfaceProps } from './liquid-surface'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidTableContainerProps = Omit<LiquidSurfaceProps, 'children'> & {
  children: React.ReactNode
}

export const LiquidTableContainer = forwardRef<HTMLDivElement, LiquidTableContainerProps>(({
  children,
  className,
  ...props
}, ref) => (
  <LiquidSurface
    className={['lq-table-container', className].filter(Boolean).join(' ')}
    interactive={false}
    lens={false}
    ref={ref}
    webgl={false}
    {...props}
  >
    <div className="lq-table-scroll">{children}</div>
  </LiquidSurface>
))

LiquidTableContainer.displayName = 'LiquidTableContainer'

export type LiquidTableProps = TableHTMLAttributes<HTMLTableElement> & LiquidStyleProps & {
  hover?: boolean
  size?: 'sm' | 'md'
}

export const LiquidTable = forwardRef<HTMLTableElement, LiquidTableProps>(({
  className,
  hover = true,
  size = 'md',
  style,
  styles,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-table', { className, style, styles })

  return (
    <table
      className={root.className}
      data-hover={hover}
      data-liquid-size={size}
      ref={ref}
      style={root.style}
      {...props}
    />
  )
})

LiquidTable.displayName = 'LiquidTable'

export const LiquidTableHead = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement> & LiquidStyleProps
>(({ className, style, styles, ...props }, ref) => {
  const root = useLiquidStyles('lq-table__head', { className, style, styles })

  return <thead className={root.className} ref={ref} style={root.style} {...props} />
})

LiquidTableHead.displayName = 'LiquidTableHead'

export const LiquidTableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement> & LiquidStyleProps
>(({ className, style, styles, ...props }, ref) => {
  const root = useLiquidStyles('lq-table__body', { className, style, styles })

  return <tbody className={root.className} ref={ref} style={root.style} {...props} />
})

LiquidTableBody.displayName = 'LiquidTableBody'

export type LiquidTableRowProps = HTMLAttributes<HTMLTableRowElement> & LiquidStyleProps & {
  selected?: boolean
}

export const LiquidTableRow = forwardRef<HTMLTableRowElement, LiquidTableRowProps>(
  ({ className, selected = false, style, styles, ...props }, ref) => {
    const root = useLiquidStyles('lq-table__row', { className, style, styles })

    return <tr className={root.className} data-selected={selected} ref={ref} style={root.style} {...props} />
  },
)

LiquidTableRow.displayName = 'LiquidTableRow'

export type LiquidTableCellProps = TdHTMLAttributes<HTMLTableCellElement> & LiquidStyleProps & {
  align?: 'left' | 'center' | 'right'
}

export const LiquidTableCell = forwardRef<HTMLTableCellElement, LiquidTableCellProps>(
  ({ align = 'left', className, style, styles, ...props }, ref) => {
    const root = useLiquidStyles('lq-table__cell', { className, style, styles })

    return <td className={root.className} data-align={align} ref={ref} style={root.style} {...props} />
  },
)

LiquidTableCell.displayName = 'LiquidTableCell'

export type LiquidTableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & LiquidStyleProps & {
  align?: 'left' | 'center' | 'right'
}

export const LiquidTableHeaderCell = forwardRef<HTMLTableCellElement, LiquidTableHeaderCellProps>(
  ({ align = 'left', className, style, styles, ...props }, ref) => {
    const root = useLiquidStyles('lq-table__header-cell', { className, style, styles })

    return (
      <th className={root.className} data-align={align} ref={ref} scope="col" style={root.style} {...props} />
    )
  },
)

LiquidTableHeaderCell.displayName = 'LiquidTableHeaderCell'
