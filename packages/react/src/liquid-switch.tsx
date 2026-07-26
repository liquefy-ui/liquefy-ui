import { forwardRef, useState, type ButtonHTMLAttributes } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

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
    <button
      aria-checked={isChecked}
      aria-label={label}
      className={root.className}
      data-checked={isChecked}
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
      role="switch"
      style={root.style}
      type="button"
      {...props}
    >
      {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      <span className="lq-switch__thumb" />
    </button>
  )
})

LiquidSwitch.displayName = 'LiquidSwitch'
