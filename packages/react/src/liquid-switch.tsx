import { Switch } from '@base-ui/react/switch'
import { forwardRef, useState, type ButtonHTMLAttributes } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

// Base UI renders a hidden checkbox beside the button, so the switch finally
// submits with a form and reports itself to a `<label>` the way a native
// control does. The button is kept as the rendered element because the shader
// canvas and the thumb live inside it.

export type LiquidSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & LiquidStyleProps & {
  checked?: boolean
  defaultChecked?: boolean
  label: string
  onCheckedChange?: (checked: boolean) => void
}

export const LiquidSwitch = forwardRef<HTMLButtonElement, LiquidSwitchProps>(({
  checked,
  className,
  defaultChecked = false,
  disabled,
  label,
  onCheckedChange,
  style,
  styles,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  // The thumb has a resting position for each state, so the springy hop between
  // them has to stay off until the first flick — otherwise every switch that
  // starts on animates itself on as the page loads.
  const [hasInteracted, setHasInteracted] = useState(false)
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bounce: 0.06,
    disabled,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 0,
    tint: config.tint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  })
  const root = useLiquidStyles('lq-switch', { className, style, styles })

  return (
    <Switch.Root
      aria-label={label}
      checked={checked}
      className={root.className}
      data-interacted={hasInteracted || undefined}
      defaultChecked={defaultChecked}
      disabled={disabled}
      nativeButton
      onCheckedChange={(nextChecked) => {
        setHasInteracted(true)
        onCheckedChange?.(nextChecked)
      }}
      ref={elementRef}
      render={<button type="button" />}
      style={root.style}
      // `render` swaps the span Base UI would have made for a button, but the
      // prop types still describe the span. The cast is that swap, written down.
      {...(props as Switch.Root.Props)}
    >
      {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      <Switch.Thumb className="lq-switch__thumb" />
    </Switch.Root>
  )
})

LiquidSwitch.displayName = 'LiquidSwitch'
