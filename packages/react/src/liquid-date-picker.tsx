import { Popover } from '@base-ui/react/popover'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
} from 'react'
import { CalendarGlyph, ChevronLeftGlyph, ChevronRightGlyph } from './internal-glyphs'
import { useLiquefyConfig, useLiquefyPortalContainer } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

// Base UI has no calendar, so the month grid is this file's own: a roving-tabindex
// grid with the key map WAI-ARIA asks for — arrows by a day and a week, Home/End
// to the ends of the week, PageUp/PageDown by a month and with Shift by a year.
// Base UI still owns the parts a hand-rolled picker gets wrong: the popup flips to
// stay on screen, Escape closes it, and focus returns to the trigger.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const pad = (value: number) => String(value).padStart(2, '0')

/** Local midnight for a `yyyy-mm-dd` string, or null when it is not one. */
const parseISO = (value?: string | null): Date | null => {
  if (!value || !ISO_DATE.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(year, month - 1, day)
  // `2026-02-31` builds a perfectly valid Date in March. A picker that takes one
  // and then shows a different day than it was handed is worse than one that
  // ignores it, so a date that rolled over is not a date.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

/**
 * The day a Date falls on, read in local time. `toISOString()` answers in UTC,
 * which is already tomorrow through a Tokyo evening and still yesterday through a
 * New York one — the off-by-one every hand-rolled picker ships at least once.
 */
const toISO = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

/** Clamped to the end of the target month, so 31 Jan a month on is 28 Feb, not 3 Mar. */
const addMonths = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

/** How far into its week a date sits, once the week starts where the caller says. */
const weekIndex = (date: Date, weekStartsOn: number) => (date.getDay() - weekStartsOn + 7) % 7

/** The first day of the week the month starts in, which is where the grid begins. */
const startOfGrid = (month: Date, weekStartsOn: number) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  return addDays(first, -weekIndex(first, weekStartsOn))
}

/**
 * Six weeks from there. Always six, even when five would cover the month: a grid
 * that changes height re-lays the popup out under the pointer, and the next
 * month's arrow moves out from under the click.
 */
const weeksFrom = (start: Date): Date[][] => Array.from({ length: 6 }, (_, week) =>
  Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)))

export type LiquidDatePickerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>, 'defaultValue' | 'onChange' | 'value'
> & LiquidStyleProps & {
  /** Initial `yyyy-mm-dd` value when uncontrolled. */
  defaultValue?: string
  /** How the chosen date reads on the trigger. Defaults to the ISO value itself. */
  format?: (value: string) => string
  hint?: string
  label?: string
  /**
   * BCP 47 tag for the month, weekday and day names. Fixed rather than taken from
   * the environment so that a server and a browser format the same markup.
   */
  locale?: string
  /** Latest selectable date, `yyyy-mm-dd`. */
  max?: string
  /** Earliest selectable date, `yyyy-mm-dd`. */
  min?: string
  /** Names a hidden input carrying the ISO value, for a plain form submit. */
  name?: string
  nextMonthLabel?: string
  /** Called when the calendar opens or closes — a sheet holding the picker needs to know. */
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  previousMonthLabel?: string
  /** Controlled `yyyy-mm-dd` value. */
  value?: string
  /** 0 is Sunday through 6 is Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export const LiquidDatePicker = forwardRef<HTMLButtonElement, LiquidDatePickerProps>(({
  className,
  defaultValue,
  disabled,
  format,
  hint,
  label,
  locale = 'en-US',
  max,
  min,
  name,
  nextMonthLabel = 'Next month',
  onOpenChange,
  onValueChange,
  placeholder = 'Select a date…',
  previousMonthLabel = 'Previous month',
  style,
  styles,
  value,
  weekStartsOn = 0,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const portalContainer = useLiquefyPortalContainer()

  const [glassRef, canvasRef, pulse] = useLiquidGlass<HTMLButtonElement>(forwardedRef, {
    bounce: 0.05,
    disabled,
    dispersion: config.dispersion,
    elasticity: config.elasticity,
    glow: config.glow,
    intensity: config.intensity,
    lens: config.lens && config.transparency,
    motion: config.motion,
    ripple: config.ripple,
    shimmer: config.shimmer,
    sparkle: config.sparkle,
    tilt: 2,
    tint: config.tint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  })

  const id = useId()
  const captionId = `${id}-caption`
  const hintId = `${id}-hint`
  const labelId = `${id}-label`
  const valueId = `${id}-value`

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const selected = value ?? uncontrolled

  const [open, setOpen] = useState(false)
  // Which day the arrow keys are standing on, and therefore which month is drawn.
  const [focusedISO, setFocusedISO] = useState(() => selected || toISO(new Date()))

  const focusedCell = useRef<HTMLButtonElement>(null)
  // Set only by a key press. Clicking the month arrows must leave focus on the
  // arrow, or the second click of a run lands on a button that moved away.
  const takeFocus = useRef(false)

  useEffect(() => {
    if (!takeFocus.current) return
    takeFocus.current = false
    focusedCell.current?.focus()
  }, [focusedISO])

  const minDate = parseISO(min)
  const maxDate = parseISO(max)
  const clamp = (date: Date) => {
    if (minDate && date < minDate) return minDate
    if (maxDate && date > maxDate) return maxDate
    return date
  }

  const focused = parseISO(focusedISO) ?? new Date()
  const todayISO = toISO(new Date())
  const gridStart = startOfGrid(focused, weekStartsOn)
  const weeks = weeksFrom(gridStart)

  const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const dayName = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', weekday: 'long', year: 'numeric' })
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: 'long' })
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' })

  const setOpenState = (next: boolean) => {
    if (next) {
      pulse(0.8)
      // Re-entering always starts from the chosen day, not wherever the arrows
      // were left the time before.
      setFocusedISO(selected || todayISO)
    }
    setOpen(next)
    onOpenChange?.(next)
  }

  const moveFocus = (date: Date) => {
    takeFocus.current = true
    setFocusedISO(toISO(clamp(date)))
  }

  const select = (date: Date) => {
    pulse(1)
    const iso = toISO(date)
    if (value === undefined) setUncontrolled(iso)
    onValueChange?.(iso)
    setOpenState(false)
  }

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = parseISO(focusedISO)
    if (!from) return
    const step: Record<string, () => Date> = {
      ArrowDown: () => addDays(from, 7),
      ArrowLeft: () => addDays(from, -1),
      ArrowRight: () => addDays(from, 1),
      ArrowUp: () => addDays(from, -7),
      End: () => addDays(from, 6 - weekIndex(from, weekStartsOn)),
      Home: () => addDays(from, -weekIndex(from, weekStartsOn)),
      PageDown: () => addMonths(from, event.shiftKey ? 12 : 1),
      PageUp: () => addMonths(from, event.shiftKey ? -12 : -1),
    }
    const next = step[event.key]
    if (!next) return
    // Otherwise the arrows scroll the popup and PageDown scrolls the page behind it.
    event.preventDefault()
    moveFocus(next())
  }

  const root = useLiquidStyles('lq-date-picker', { className, style, styles })

  return (
    <div className={root.className} style={root.style}>
      <Popover.Root onOpenChange={(next) => setOpenState(next)} open={open}>
        {label && <span className="lq-control-label" id={labelId}>{label}</span>}
        <Popover.Trigger
          aria-describedby={hint ? hintId : undefined}
          // The value is part of the name so the trigger reads as "Date, 2026-09-15"
          // rather than leaving a screen reader to find the current value itself.
          aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
          className="lq-date-picker__trigger"
          disabled={disabled}
          ref={glassRef}
          {...props}
        >
          {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
          <span
            className="lq-date-picker__value"
            data-placeholder={selected ? undefined : ''}
            id={valueId}
          >
            {selected ? format?.(selected) ?? selected : placeholder}
          </span>
          <span className="lq-date-picker__icon"><CalendarGlyph size={16} /></span>
        </Popover.Trigger>
        <Popover.Portal container={portalContainer ?? undefined}>
          <Popover.Positioner align="start" className="lq-date-picker__positioner" sideOffset={7}>
            <Popover.Popup
              aria-label={label ?? 'Choose date'}
              className="lq-date-picker__panel lq-popover"
              // Opening on the day the arrows will move from, rather than on the
              // month arrow that happens to be first in the DOM.
              initialFocus={focusedCell}
            >
              <div className="lq-date-picker__header">
                <button
                  aria-label={previousMonthLabel}
                  className="lq-date-picker__nav"
                  onClick={() => setFocusedISO(toISO(clamp(addMonths(focused, -1))))}
                  type="button"
                >
                  <ChevronLeftGlyph size={15} />
                </button>
                {/* Polite rather than silent: the arrows change the month without
                    moving focus, and nothing else would announce it. */}
                <div aria-live="polite" className="lq-date-picker__caption" id={captionId}>
                  {monthName.format(focused)}
                </div>
                <button
                  aria-label={nextMonthLabel}
                  className="lq-date-picker__nav"
                  onClick={() => setFocusedISO(toISO(clamp(addMonths(focused, 1))))}
                  type="button"
                >
                  <ChevronRightGlyph size={15} />
                </button>
              </div>
              <div
                aria-labelledby={captionId}
                className="lq-date-picker__grid"
                onKeyDown={handleGridKeyDown}
                role="grid"
              >
                <div className="lq-date-picker__weekdays" role="row">
                  {Array.from({ length: 7 }, (_, day) => addDays(gridStart, day)).map((date) => (
                    <span
                      aria-label={weekdayName.format(date)}
                      className="lq-date-picker__weekday"
                      key={date.getDay()}
                      role="columnheader"
                    >
                      {weekdayShort.format(date)}
                    </span>
                  ))}
                </div>
                {weeks.map((week, index) => (
                  <div className="lq-date-picker__week" key={index} role="row">
                    {week.map((date) => {
                      const iso = toISO(date)
                      const isSelected = iso === selected
                      return (
                        <button
                          aria-current={iso === todayISO ? 'date' : undefined}
                          // The number alone leaves a screen reader to guess the month.
                          aria-label={dayName.format(date)}
                          aria-selected={isSelected}
                          className="lq-date-picker__day"
                          data-outside={date.getMonth() === focused.getMonth() ? undefined : ''}
                          data-selected={isSelected ? '' : undefined}
                          data-today={iso === todayISO ? '' : undefined}
                          disabled={(minDate != null && date < minDate) || (maxDate != null && date > maxDate)}
                          key={iso}
                          onClick={() => select(date)}
                          ref={iso === focusedISO ? focusedCell : undefined}
                          role="gridcell"
                          // A roving tabindex: the whole grid is one tab stop and the
                          // arrows move inside it.
                          tabIndex={iso === focusedISO ? 0 : -1}
                          type="button"
                        >
                          {date.getDate()}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {hint && <span className="lq-control-hint" id={hintId}>{hint}</span>}
      {name && <input name={name} type="hidden" value={selected} />}
    </div>
  )
})

LiquidDatePicker.displayName = 'LiquidDatePicker'
