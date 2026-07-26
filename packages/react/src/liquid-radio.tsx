import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

type RadioGroupContextValue = {
  disabled?: boolean
  name: string
  onValueChange: (value: string) => void
  value: string | undefined
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

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
  const [internalValue, setInternalValue] = useState(defaultValue)
  const resolvedValue = value ?? internalValue
  const contextValue = useMemo<RadioGroupContextValue>(() => ({
    disabled,
    name,
    onValueChange: (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue)
      onValueChange?.(nextValue)
    },
    value: resolvedValue,
  }), [disabled, name, onValueChange, resolvedValue, value])
  const root = useLiquidStyles('lq-radio-group', { className, style, styles })

  return (
    <div
      aria-label={label}
      className={root.className}
      data-orientation={orientation}
      ref={ref}
      role="radiogroup"
      style={root.style}
      {...props}
    >
      <RadioGroupContext.Provider value={contextValue}>{children}</RadioGroupContext.Provider>
    </div>
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
  onClick,
  style,
  styles,
  value,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const group = useContext(RadioGroupContext)
  const isChecked = group?.value === value
  const isDisabled = disabled ?? group?.disabled
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bounce: 0.08,
    disabled: isDisabled,
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
    <label className={root.className} data-disabled={isDisabled} style={root.style}>
      <button
        aria-checked={isChecked}
        className="lq-radio__control"
        data-checked={isChecked}
        data-interacted={isChecked}
        disabled={isDisabled}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          group?.onValueChange(value)
        }}
        ref={elementRef}
        role="radio"
        type="button"
        {...props}
      >
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        <span className="lq-radio__dot" />
      </button>
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
