import {
  forwardRef,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidSegmentedOption = {
  disabled?: boolean
  icon?: ReactNode
  label: ReactNode
  value: string
}

export type LiquidSegmentedProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & LiquidStyleProps & {
  defaultValue?: string
  label?: string
  onValueChange?: (value: string) => void
  options: LiquidSegmentedOption[]
  size?: 'sm' | 'md'
  value?: string
}

export const LiquidSegmented = forwardRef<HTMLDivElement, LiquidSegmentedProps>(({
  className,
  defaultValue,
  label,
  onValueChange,
  options,
  size = 'md',
  style,
  styles,
  value,
  ...props
}, ref) => {
  const config = useLiquefyConfig()
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value)
  const resolvedValue = value ?? internalValue
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === resolvedValue))

  const handleSelect = (option: LiquidSegmentedOption, event: ReactMouseEvent<HTMLButtonElement>) => {
    const changed = option.value !== resolvedValue
    if (value === undefined) setInternalValue(option.value)
    onValueChange?.(option.value)

    // Squash-and-stretch the sliding indicator (and pop the picked item) so
    // switching options reads as a springy jelly wobble, not a flat slide.
    if (changed && config.motion !== false) {
      indicatorRef.current?.animate(
        [
          { scale: '1 1' },
          { scale: '1.16 0.8' },
          { scale: '0.94 1.07' },
          { scale: '1.02 0.98' },
          { scale: '1 1' },
        ],
        { duration: 560, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
      )
      event.currentTarget.animate(
        [{ scale: '1' }, { scale: '1.14' }, { scale: '0.98' }, { scale: '1' }],
        { duration: 460, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
      )
    }
  }

  const root = useLiquidStyles('lq-segmented', {
    className,
    style,
    styles,
    vars: { '--lq-segment-count': options.length, '--lq-segment-index': activeIndex },
  })

  return (
    <div
      aria-label={label}
      className={root.className}
      data-liquid-size={size}
      ref={ref}
      role="tablist"
      style={root.style}
      {...props}
    >
      <span aria-hidden="true" className="lq-segmented__indicator" ref={indicatorRef} />
      {options.map((option) => (
        <button
          aria-selected={option.value === resolvedValue}
          className="lq-segmented__item"
          data-active={option.value === resolvedValue}
          disabled={option.disabled}
          key={option.value}
          onClick={(event) => handleSelect(option, event)}
          role="tab"
          type="button"
        >
          {option.icon && <span className="lq-segmented__icon">{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
})

LiquidSegmented.displayName = 'LiquidSegmented'
