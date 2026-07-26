import { forwardRef, useRef, useState, type HTMLAttributes } from 'react'
import { StarGlyph } from './internal-glyphs'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidRatingProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & LiquidStyleProps & {
  defaultValue?: number
  label?: string
  max?: number
  onValueChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  value?: number
}

const starSizes = { lg: 26, md: 21, sm: 16 } as const

export const LiquidRating = forwardRef<HTMLDivElement, LiquidRatingProps>(({
  className,
  defaultValue = 0,
  label = 'Rating',
  max = 5,
  onValueChange,
  readOnly = false,
  size = 'md',
  style,
  styles,
  value,
  ...props
}, ref) => {
  const config = useLiquefyConfig()
  const starRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [hovered, setHovered] = useState<number | null>(null)
  const resolvedValue = value ?? internalValue
  const displayValue = hovered ?? resolvedValue

  const handleSelect = (starValue: number) => {
    const nextValue = starValue === resolvedValue ? 0 : starValue
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)

    if (config.motion === false) return
    // Ripple a springy pop across every lit star so the rating fills with life.
    if (nextValue === 0) {
      starRefs.current[starValue - 1]?.animate(
        [{ scale: '1' }, { scale: '0.7' }, { scale: '1' }],
        { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
      )
      return
    }
    for (let index = 0; index < nextValue; index += 1) {
      starRefs.current[index]?.animate(
        [{ scale: '1' }, { scale: '1.42' }, { scale: '0.88' }, { scale: '1.06' }, { scale: '1' }],
        { delay: index * 45, duration: 520, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
      )
    }
  }

  const root = useLiquidStyles('lq-rating', { className, style, styles })

  return (
    <div
      aria-label={`${label}: ${resolvedValue} of ${max}`}
      className={root.className}
      data-liquid-size={size}
      data-read-only={readOnly}
      onPointerLeave={() => setHovered(null)}
      ref={ref}
      role={readOnly ? 'img' : undefined}
      style={root.style}
      {...props}
    >
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const active = starValue <= displayValue
        if (readOnly) {
          return (
            <span className="lq-rating__star" data-active={active} key={starValue}>
              <StarGlyph size={starSizes[size]} />
            </span>
          )
        }

        return (
          <button
            aria-label={`${label}: ${starValue} of ${max}`}
            aria-pressed={starValue === resolvedValue}
            className="lq-rating__star"
            data-active={active}
            key={starValue}
            onClick={() => handleSelect(starValue)}
            onPointerEnter={() => setHovered(starValue)}
            ref={(node) => { starRefs.current[index] = node }}
            type="button"
          >
            <StarGlyph size={starSizes[size]} />
          </button>
        )
      })}
    </div>
  )
})

LiquidRating.displayName = 'LiquidRating'
