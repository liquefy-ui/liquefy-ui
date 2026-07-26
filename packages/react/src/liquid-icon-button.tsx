import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & LiquidStyleProps & {
  children: ReactNode
  label: string
  shape?: 'circle' | 'rounded'
  size?: 'sm' | 'md' | 'lg'
  tint?: string
}

export const LiquidIconButton = forwardRef<HTMLButtonElement, LiquidIconButtonProps>(({
  children,
  className,
  disabled,
  label,
  shape = 'rounded',
  size = 'md',
  style,
  styles,
  tint,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const resolvedTint = tint ?? config.tint
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bounce: 0.085,
    disabled,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 3,
    tint: resolvedTint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  })
  const root = useLiquidStyles(['lq-button', 'lq-icon-button'], {
    className,
    style,
    styles,
    vars: { '--lq-button-tint': resolvedTint },
  })

  return (
    <button
      aria-label={label}
      className={root.className}
      data-liquid-shape={shape}
      data-liquid-size={size}
      disabled={disabled}
      ref={elementRef}
      style={root.style}
      title={label}
      type="button"
      {...props}
    >
      <span aria-hidden="true" className="lq-surface__edge" />
      {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      <span className="lq-button__content">{children}</span>
    </button>
  )
})

LiquidIconButton.displayName = 'LiquidIconButton'
