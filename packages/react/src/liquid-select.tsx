import { Select } from '@base-ui/react/select'
import { forwardRef, useCallback, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { CheckGlyph, ChevronDownGlyph } from './internal-glyphs'
import { useLiquefyConfig, useLiquefyPortalContainer } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

// What the hand-rolled listbox never had: typeahead, Home/End, PageUp/PageDown,
// focus returning to the trigger, form integration through a hidden input, and a
// popup that keeps itself on screen. All of that is Base UI's now. liquefy-ui
// still owns the WebGL trigger and the glass popover.

export type LiquidSelectOption = {
  disabled?: boolean
  label: ReactNode
  value: string
}

export type LiquidSelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> & LiquidStyleProps & {
  defaultValue?: string
  hint?: string
  label?: string
  /** Called when the popup opens or closes — a sheet holding the select needs to know. */
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: string) => void
  options: LiquidSelectOption[]
  placeholder?: string
  value?: string
}

export const LiquidSelect = forwardRef<HTMLButtonElement, LiquidSelectProps>(({
  className,
  defaultValue,
  disabled,
  hint,
  label,
  onOpenChange,
  onValueChange,
  options,
  placeholder = 'Select…',
  style,
  styles,
  value,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const portalContainer = useLiquefyPortalContainer()

  const [glassRef, canvasRef, pulse] = useLiquidGlass<HTMLButtonElement>(forwardedRef, {
    bounce: 0.05,
    disabled,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 2,
    tint: config.tint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  })

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) pulse(0.8)
    onOpenChange?.(open)
  }, [onOpenChange, pulse])

  // The field wrapper is the layout box, so it owns className, style and styles.
  const root = useLiquidStyles('lq-select', { className, style, styles })

  return (
    <div className={root.className} style={root.style}>
      <Select.Root
        defaultValue={defaultValue}
        disabled={disabled}
        // Lets Select.Value render the chosen option's label while the popup is shut.
        items={options.map(({ label: optionLabel, value: optionValue }) => ({
          label: optionLabel,
          value: optionValue,
        }))}
        onOpenChange={handleOpenChange}
        onValueChange={(next) => {
          pulse(1)
          if (next != null) onValueChange?.(String(next))
        }}
        value={value}
      >
        {label && <Select.Label className="lq-control-label">{label}</Select.Label>}
        <Select.Trigger className="lq-select__trigger" ref={glassRef} {...props}>
          {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
          <Select.Value className="lq-select__value" placeholder={placeholder} />
          <Select.Icon className="lq-select__chevron"><ChevronDownGlyph size={15} /></Select.Icon>
        </Select.Trigger>
        <Select.Portal container={portalContainer ?? undefined}>
          <Select.Positioner
            // false gives an ordinary dropdown under the trigger rather than Base
            // UI's default of parking the selected row over it.
            alignItemWithTrigger={false}
            className="lq-select__positioner"
            sideOffset={7}
          >
            <Select.Popup className="lq-select__listbox lq-popover">
              {options.map((option) => (
                <Select.Item
                  className="lq-select__option"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator><CheckGlyph size={14} /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {hint && <span className="lq-control-hint">{hint}</span>}
    </div>
  )
})

LiquidSelect.displayName = 'LiquidSelect'
