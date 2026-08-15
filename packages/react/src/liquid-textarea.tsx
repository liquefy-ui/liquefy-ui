import { Field } from '@base-ui/react/field'
import { forwardRef, type ChangeEvent, type TextareaHTMLAttributes } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & LiquidStyleProps & {
  hint?: string
  label?: string
}

export const LiquidTextArea = forwardRef<HTMLTextAreaElement, LiquidTextAreaProps>(({
  className,
  hint,
  label,
  onChange,
  rows = 4,
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
    wobbliness: config.wobbliness * 0.5,
  })

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Tiny purun on every keystroke so the control feels alive as you type.
    pulse(0.35)
    onChange?.(event)
  }
  // The field is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles(['lq-text-field', 'lq-textarea'], { className, style, styles })

  return (
    <Field.Root className={root.className} style={root.style}>
      {label && <Field.Label className="lq-control-label">{label}</Field.Label>}
      <span className="lq-text-field__control lq-textarea__control" ref={controlRef}>
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        {/* Field.Control renders an input unless it is handed something else to
            render, and the label and hint wiring follows whatever it renders. */}
        {/* Field.Control is typed for the input it renders by default. Handing
            it a textarea to render is supported; describing that in the types
            is not, so the whole set of textarea props is cast across at once. */}
        <Field.Control
          render={<textarea />}
          {...({ onChange: handleChange, ref, rows, ...props } as unknown as Field.Control.Props)}
        />
      </span>
      {hint && <Field.Description className="lq-control-hint">{hint}</Field.Description>}
    </Field.Root>
  )
})

LiquidTextArea.displayName = 'LiquidTextArea'
