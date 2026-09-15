import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

// The group used to be a div of buttons sharing a context, which meant Tab
// stopped on every option and the arrow keys did nothing at all — the two
// things a radio group is specified to do. Base UI brings roving focus, the
// arrow keys, and a hidden input per option so the group submits with a form.

export type LiquidRadioGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & LiquidStyleProps & {
  children: ReactNode
  defaultValue?: string
  disabled?: boolean
  label?: string
  name?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  value?: string
}

export const LiquidRadioGroup = forwardRef<HTMLDivElement, LiquidRadioGroupProps>(({
  children,
  className,
  defaultValue,
  disabled,
  label,
  name = 'lq-radio-group',
  onValueChange,
  orientation = 'vertical',
  style,
  styles,
  value,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-radio-group', { className, style, styles })

  return (
    <RadioGroup
      aria-label={label}
      className={root.className}
      data-orientation={orientation}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
      onValueChange={(nextValue) => onValueChange?.(String(nextValue))}
      ref={ref}
      style={root.style}
      value={value}
      {...props}
    >
      {children}
    </RadioGroup>
  )
})

LiquidRadioGroup.displayName = 'LiquidRadioGroup'

export type LiquidRadioProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & LiquidStyleProps & {
  hint?: string
  label?: ReactNode
  value: string
}

export const LiquidRadio = forwardRef<HTMLButtonElement, LiquidRadioProps>(({
  className,
  disabled,
  hint,
  label,
  style,
  styles,
  value,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const [elementRef, canvasRef] = useLiquidGlass<HTMLButtonElement>(forwardedRef, {
    bounce: 0.08,
    disabled,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 0,
    tint: config.tint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  })
  // The label is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles('lq-radio', { className, style, styles })

  return (
    <label className={root.className} data-disabled={disabled || undefined} style={root.style}>
      <Radio.Root
        className="lq-radio__control"
        disabled={disabled}
        nativeButton
        ref={elementRef}
        render={<button type="button" />}
        // `render` swaps the span Base UI would have made for a button, but the
        // prop types still describe the span. The cast is that swap, written down.
        {...(props as Radio.Root.Props)}
        value={value}
      >
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        {/* The dot scales in from nothing, so it has to be there to scale. */}
        <Radio.Indicator className="lq-radio__dot" keepMounted />
      </Radio.Root>
      {(label || hint) && (
        <span className="lq-radio__copy">
          {label && <span className="lq-control-label">{label}</span>}
          {hint && <span className="lq-control-hint">{hint}</span>}
        </span>
      )}
    </label>
  )
})

LiquidRadio.displayName = 'LiquidRadio'
