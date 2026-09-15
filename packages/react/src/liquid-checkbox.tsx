import { Checkbox } from '@base-ui/react/checkbox'
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { CheckGlyph, MinusGlyph } from './internal-glyphs'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

// The hand-rolled version was a `<button role="checkbox">`, which no form ever
// saw and no `required` ever validated. Base UI keeps the button as the thing
// you click — the shader canvas needs a box to live in — and puts a real
// checkbox input beside it.

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
  style,
  styles,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  // The mark has a resting state either way, so the tick should only spring in
  // once someone has actually ticked it.
  const [hasInteracted, setHasInteracted] = useState(false)
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
    <label className={root.className} data-disabled={disabled || undefined} style={root.style}>
      <Checkbox.Root
        checked={checked}
        className="lq-checkbox__box"
        data-interacted={hasInteracted || undefined}
        defaultChecked={defaultChecked}
        disabled={disabled}
        indeterminate={indeterminate}
        nativeButton
        onCheckedChange={(nextChecked) => {
          setHasInteracted(true)
          onCheckedChange?.(nextChecked)
        }}
        ref={elementRef}
        render={<button type="button" />}
        // `render` swaps the span Base UI would have made for a button, but the
        // prop types still describe the span. The cast is that swap, written down.
        {...(props as Checkbox.Root.Props)}
      >
        {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
        {/* The mark is faded and scaled by CSS rather than mounted and
            unmounted, so it has something to animate away from. */}
        <Checkbox.Indicator className="lq-checkbox__mark" keepMounted>
          {indeterminate ? <MinusGlyph size={13} /> : <CheckGlyph size={13} />}
        </Checkbox.Indicator>
      </Checkbox.Root>
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
