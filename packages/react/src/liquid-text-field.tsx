import { forwardRef, useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidTextFieldProps = InputHTMLAttributes<HTMLInputElement> & LiquidStyleProps & {
  endAdornment?: ReactNode
  hint?: string
  label?: string
  startAdornment?: ReactNode
}

export const LiquidTextField = forwardRef<HTMLInputElement, LiquidTextFieldProps>(({
  className,
  endAdornment,
  hint,
  id,
  label,
  onChange,
  startAdornment,
  style,
  styles,
  ...props
}, ref) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const config = useLiquefyConfig()
  const [controlRef, canvasRef, pulse] = useLiquidGlass<HTMLSpanElement>(undefined, {
    bounce: 0.02,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 0,
    tint: config.tint,
    webgl: config.webgl,
    wobbliness: config.wobbliness * 0.6,
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Tiny purun on every keystroke so the control feels alive as you type.
    pulse(0.4)
    onChange?.(event)
  }
  // The label is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles('lq-text-field', { className, style, styles })

  return (
    <label className={root.className} htmlFor={inputId} style={root.style}>
      {label && <span className="lq-control-label">{label}</span>}
      <span className="lq-text-field__control" ref={controlRef}>
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        {startAdornment && <span className="lq-text-field__adornment">{startAdornment}</span>}
        <input aria-describedby={hintId} id={inputId} onChange={handleChange} ref={ref} {...props} />
        {endAdornment && <span className="lq-text-field__adornment">{endAdornment}</span>}
      </span>
      {hint && <span className="lq-control-hint" id={hintId}>{hint}</span>}
    </label>
  )
})

LiquidTextField.displayName = 'LiquidTextField'
