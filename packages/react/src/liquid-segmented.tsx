import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { forwardRef, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// This used to claim `role="tablist"` and `role="tab"` without ever rendering a
// tabpanel, which tells a screen reader to expect panels that do not exist and
// leaves the arrow keys doing nothing. A toggle group is what this control
// actually is: one pressed button out of several, with roving focus.

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

  const root = useLiquidStyles('lq-segmented', {
    className,
    style,
    styles,
    vars: { '--lq-segment-count': options.length, '--lq-segment-index': activeIndex },
  })

  return (
    <ToggleGroup
      aria-label={label}
      className={root.className}
      data-liquid-size={size}
      onValueChange={(next, details) => {
        // A segmented control always has exactly one option chosen, so pressing
        // the pressed one again is a no-op rather than a way to clear it.
        const [nextValue] = next
        if (!nextValue || nextValue === resolvedValue) return

        if (value === undefined) setInternalValue(nextValue)
        onValueChange?.(nextValue)

        // Squash-and-stretch the sliding indicator (and pop the picked item) so
        // switching options reads as a springy jelly wobble, not a flat slide.
        if (config.motion === false) return

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
        details.trigger?.animate(
          [{ scale: '1' }, { scale: '1.14' }, { scale: '0.98' }, { scale: '1' }],
          { duration: 460, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
        )
      }}
      ref={ref}
      style={root.style}
      value={resolvedValue === undefined ? [] : [resolvedValue]}
      {...props}
    >
      <span aria-hidden="true" className="lq-segmented__indicator" ref={indicatorRef} />
      {options.map((option) => (
        <Toggle
          className="lq-segmented__item"
          disabled={option.disabled}
          key={option.value}
          value={option.value}
        >
          {option.icon && <span className="lq-segmented__icon">{option.icon}</span>}
          <span>{option.label}</span>
        </Toggle>
      ))}
    </ToggleGroup>
  )
})

LiquidSegmented.displayName = 'LiquidSegmented'
