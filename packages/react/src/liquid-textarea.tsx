import { forwardRef, useId, type ChangeEvent, type TextareaHTMLAttributes } from 'react'
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
  id,
  label,
  onChange,
  rows = 4,
  style,
  styles,
  ...props
}, ref) => {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const hintId = hint ? `${textareaId}-hint` : undefined
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
  // The label is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles(['lq-text-field', 'lq-textarea'], { className, style, styles })

  return (
    <label className={root.className} htmlFor={textareaId} style={root.style}>
      {label && <span className="lq-control-label">{label}</span>}
      <span className="lq-text-field__control lq-textarea__control" ref={controlRef}>
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        <textarea aria-describedby={hintId} id={textareaId} onChange={handleChange} ref={ref} rows={rows} {...props} />
      </span>
      {hint && <span className="lq-control-hint" id={hintId}>{hint}</span>}
    </label>
  )
})

LiquidTextArea.displayName = 'LiquidTextArea'
