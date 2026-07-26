import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LiquidSpinner } from './liquid-progress'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & LiquidStyleProps & {
  children: ReactNode
  iconAfter?: ReactNode
  iconBefore?: ReactNode
  isLoading?: boolean
  lens?: boolean
  size?: 'sm' | 'md' | 'lg'
  tint?: string
  webgl?: boolean
}

const spinnerSizes = { lg: 22, md: 19, sm: 16 } as const

export const LiquidButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(({
  children,
  className,
  disabled,
  iconAfter,
  iconBefore,
  isLoading = false,
  lens,
  size = 'md',
  style,
  styles,
  tint,
  webgl,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const resolvedTint = tint ?? config.tint
  const resolvedWebgl = webgl ?? config.webgl
  // Edge refraction folds the backdrop around the bezel; on control-sized
  // elements that reads as a mirrored fill, so buttons keep it opt-in.
  const resolvedLens = lens ?? false
  const isDisabled = disabled || isLoading
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bounce: 0.075,
    disabled: isDisabled,
    intensity: config.intensity,
    lens: resolvedLens && config.transparency,
    motion: config.motion,
    tilt: 2.4,
    tint: resolvedTint,
    webgl: resolvedWebgl,
    wobbliness: config.wobbliness,
  })
  const root = useLiquidStyles('lq-button', {
    className,
    style,
    styles,
    vars: { '--lq-button-tint': resolvedTint },
  })

  return (
    <button
      aria-busy={isLoading || undefined}
      className={root.className}
      data-liquid-size={size}
      data-loading={isLoading}
      disabled={isDisabled}
      ref={elementRef}
      style={root.style}
      type="button"
      {...props}
    >
      <span aria-hidden="true" className="lq-surface__edge" />
      {resolvedWebgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      {isLoading && (
        <span aria-hidden="true" className="lq-button__spinner">
          <LiquidSpinner size={spinnerSizes[size]} thickness={2.4} tint={resolvedTint} />
        </span>
      )}
      <span className="lq-button__content">
        {iconBefore && <span className="lq-button__icon" data-position="before">{iconBefore}</span>}
        <span>{children}</span>
        {iconAfter && <span className="lq-button__icon" data-position="after">{iconAfter}</span>}
      </span>
    </button>
  )
})

LiquidButton.displayName = 'LiquidButton'
