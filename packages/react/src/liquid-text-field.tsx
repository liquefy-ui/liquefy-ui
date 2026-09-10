import { Field } from '@base-ui/react/field'
import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

// The label, the control and the hint used to be wired together by hand with a
// generated id threaded through `htmlFor` and `aria-describedby`. Field owns
// that wiring now, which also means a control put in a form reports its
// validity through the same parts rather than needing a second set of props.

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
  label,
  onChange,
  startAdornment,
  style,
  styles,
  ...props
}, ref) => {
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
  // The field is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles('lq-text-field', { className, style, styles })

  return (
    <Field.Root className={root.className} style={root.style}>
      {label && <Field.Label className="lq-control-label">{label}</Field.Label>}
      <span className="lq-text-field__control" ref={controlRef}>
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        {startAdornment && <span className="lq-text-field__adornment">{startAdornment}</span>}
        <Field.Control onChange={handleChange} ref={ref} {...props} />
        {endAdornment && <span className="lq-text-field__adornment">{endAdornment}</span>}
      </span>
      {hint && <Field.Description className="lq-control-hint">{hint}</Field.Description>}
    </Field.Root>
  )
})

LiquidTextField.displayName = 'LiquidTextField'
