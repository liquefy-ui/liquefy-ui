import { Button } from '@base-ui/react/button'
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
  // Follows the provider now. It used to be forced off because the bezel folded
  // the backdrop back on itself at this size and read as a mirrored fill, which
  // the lens cannot do any more. It is still the most expensive thing the
  // material does — an SVG filter inside backdrop-filter, per button — so a page
  // dense with buttons is the one to set `lens={false}` on the provider for.
  const resolvedLens = lens ?? config.lens
  const isDisabled = disabled || isLoading
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bounce: 0.075,
    disabled: isDisabled,
    dispersion: config.dispersion,
    elasticity: config.elasticity,
    glow: config.glow,
    intensity: config.intensity,
    lens: resolvedLens && config.transparency,
    motion: config.motion,
    ripple: config.ripple,
    shimmer: config.shimmer,
    sparkle: config.sparkle,
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
    <Button
      aria-busy={isLoading || undefined}
      className={root.className}
      data-liquid-size={size}
      data-loading={isLoading}
      disabled={isDisabled}
      // A button that disables itself while it works would otherwise throw the
      // keyboard back to the top of the document at the moment the user is
      // waiting to hear what happened. Staying focusable keeps `aria-busy` and
      // whatever the button says next where they can be read.
      focusableWhenDisabled={isLoading}
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
    </Button>
  )
})

LiquidButton.displayName = 'LiquidButton'
