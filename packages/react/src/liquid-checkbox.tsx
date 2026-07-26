import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { CheckGlyph, MinusGlyph } from './internal-glyphs'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidCheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & LiquidStyleProps & {
  checked?: boolean
  defaultChecked?: boolean
  hint?: string
  indeterminate?: boolean
  label?: ReactNode
  onCheckedChange?: (checked: boolean) => void
}

export const LiquidCheckbox = forwardRef<HTMLButtonElement, LiquidCheckboxProps>(({
  checked,
  className,
  defaultChecked = false,
  disabled,
  hint,
  indeterminate = false,
  label,
  onCheckedChange,
  onClick,
  style,
  styles,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const [hasInteracted, setHasInteracted] = useState(false)
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isChecked = checked ?? internalChecked
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
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
  const root = useLiquidStyles('lq-checkbox', { className, style, styles })

  return (
    <label className={root.className} data-disabled={disabled} style={root.style}>
      <button
        aria-checked={indeterminate ? 'mixed' : isChecked}
        className="lq-checkbox__box"
        data-checked={indeterminate ? 'mixed' : isChecked}
        data-interacted={hasInteracted}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return

          setHasInteracted(true)
          const nextChecked = !isChecked
          if (checked === undefined) setInternalChecked(nextChecked)
          onCheckedChange?.(nextChecked)
        }}
        ref={elementRef}
        role="checkbox"
        type="button"
        {...props}
      >
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        <span className="lq-checkbox__mark">
          {indeterminate ? <MinusGlyph size={13} /> : <CheckGlyph size={13} />}
        </span>
      </button>
      {(label || hint) && (
        <span className="lq-checkbox__copy">
          {label && <span className="lq-control-label">{label}</span>}
          {hint && <span className="lq-control-hint">{hint}</span>}
        </span>
      )}
    </label>
  )
})

LiquidCheckbox.displayName = 'LiquidCheckbox'
