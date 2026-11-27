import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import {
  forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode,
} from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// This used to claim `role="tablist"` and `role="tab"` without ever rendering a
// tabpanel, which tells a screen reader to expect panels that do not exist and
// leaves the arrow keys doing nothing. A toggle group is what this control
// actually is: one pressed button out of several, with roving focus.

// The indicator used to be sized as an equal share of the track, which only
// holds while every item fits in an equal share. `grid-auto-columns: 1fr` cannot
// shrink a column below its content, so one long label on a narrow screen makes
// its column wider than the rest and the indicator drifts off the pressed item.
// It now follows the pressed item's measured box, and the equal share stays as
// the first paint and the server render.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

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
  const rootRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement)
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value)
  const resolvedValue = value ?? internalValue
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === resolvedValue))

  useIsomorphicLayoutEffect(() => {
    const group = rootRef.current
    const indicator = indicatorRef.current
    if (!group || !indicator) return undefined

    const place = () => {
      const item = group.querySelectorAll<HTMLElement>('.lq-segmented__item')[activeIndex]
      if (!item) return
      // offsetLeft ignores transforms, so this is the indicator's resting spot.
      indicator.style.setProperty('--lq-segment-x', `${item.offsetLeft - indicator.offsetLeft}px`)
      indicator.style.setProperty('--lq-segment-w', `${item.offsetWidth}px`)
    }

    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(place)
    observer.observe(group)
    group.querySelectorAll('.lq-segmented__item').forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [activeIndex, options.length])

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
      ref={rootRef}
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
