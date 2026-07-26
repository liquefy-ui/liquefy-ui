import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { ChevronLeftGlyph, ChevronRightGlyph } from './internal-glyphs'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidPaginationProps = Omit<HTMLAttributes<HTMLElement>, 'onChange'> & LiquidStyleProps & {
  count: number
  defaultPage?: number
  label?: string
  onPageChange?: (page: number) => void
  page?: number
  siblingCount?: number
}

type PaginationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

// Same jelly springs the button family uses: pointer tilt/squish plus a release
// overshoot fired on click, so every page control purun like a LiquidButton.
const PaginationButton = ({ children, className, onClick, ...props }: PaginationButtonProps) => {
  const config = useLiquefyConfig()
  const [glassRef, , pulse] = useLiquidGlass<HTMLButtonElement>(undefined, {
    bounce: 0.08,
    disabled: props.disabled,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 2.2,
    tint: config.tint,
    webgl: false,
    wobbliness: config.wobbliness,
  })

  return (
    <button
      className={['lq-pagination__item', className].filter(Boolean).join(' ')}
      onClick={(event) => {
        onClick?.(event)
        if (!props.disabled) pulse(1)
      }}
      ref={glassRef}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

const buildRange = (count: number, page: number, siblingCount: number): Array<number | 'ellipsis'> => {
  if (count <= 5 + siblingCount * 2) return Array.from({ length: count }, (_, index) => index + 1)

  const start = Math.max(2, page - siblingCount)
  const end = Math.min(count - 1, page + siblingCount)
  const range: Array<number | 'ellipsis'> = [1]
  if (start > 2) range.push('ellipsis')
  for (let index = start; index <= end; index += 1) range.push(index)
  if (end < count - 1) range.push('ellipsis')
  range.push(count)
  return range
}

export const LiquidPagination = forwardRef<HTMLElement, LiquidPaginationProps>(({
  className,
  count,
  defaultPage = 1,
  label = 'Pagination',
  onPageChange,
  page,
  siblingCount = 1,
  style,
  styles,
  ...props
}, ref) => {
  const [internalPage, setInternalPage] = useState(defaultPage)
  const currentPage = page ?? internalPage

  const goTo = (nextPage: number) => {
    const clamped = Math.min(count, Math.max(1, nextPage))
    if (page === undefined) setInternalPage(clamped)
    onPageChange?.(clamped)
  }
  const root = useLiquidStyles('lq-pagination', { className, style, styles })

  return (
    <nav aria-label={label} className={root.className} ref={ref} style={root.style} {...props}>
      <PaginationButton
        aria-label="Previous page"
        className="lq-pagination__item--nav"
        disabled={currentPage <= 1}
        onClick={() => goTo(currentPage - 1)}
      >
        <ChevronLeftGlyph size={14} />
      </PaginationButton>
      {buildRange(count, currentPage, siblingCount).map((item, index) =>
        item === 'ellipsis'
          ? <span aria-hidden="true" className="lq-pagination__ellipsis" key={`ellipsis-${index}`}>…</span>
          : (
            <PaginationButton
              aria-current={item === currentPage ? 'page' : undefined}
              aria-label={`Page ${item}`}
              data-active={item === currentPage}
              key={item}
              onClick={() => goTo(item)}
            >
              {item}
            </PaginationButton>
          ))}
      <PaginationButton
        aria-label="Next page"
        className="lq-pagination__item--nav"
        disabled={currentPage >= count}
        onClick={() => goTo(currentPage + 1)}
      >
        <ChevronRightGlyph size={14} />
      </PaginationButton>
    </nav>
  )
})

LiquidPagination.displayName = 'LiquidPagination'
