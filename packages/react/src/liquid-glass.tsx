import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidCustomProperties, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidGlassProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  /** Width of the refracting band at the rim, in pixels. Defaults to 22% of the short side. */
  bezel?: number
  children?: ReactNode
  /** Exponent of the bezel cross-section: 1 is an even ramp, higher piles the bend against the rim. */
  curve?: number
  /** How far apart the red and blue channels are pulled at the rim, 0 to 1. */
  dispersion?: number
  /** How far the surface leans toward a pointer that has not reached it yet. */
  elasticity?: number
  /** How far the glass softens what it refracts, in pixels. */
  frost?: number
  /** Lit rim glow that follows the pointer. Off here, unlike LiquidSurface. */
  glow?: boolean
  interactive?: boolean
  /** Dims the glass for a surface sitting on a bright backdrop. */
  overLight?: boolean
  padding?: number | string
  radius?: number | string
  /** How much of the bend the material can take without folding to spend, 0 to 1. */
  refraction?: number
  /** Ring that travels out from a press. Off here, unlike LiquidSurface. */
  ripple?: boolean
  /** How much the glass lifts the colour of what it refracts. */
  saturation?: number
  /** Iridescent colour shift across the rim while wobbling. Off here. */
  shimmer?: boolean
  /** Drifting specular glints across the face. Off here. */
  sparkle?: boolean
  tint?: string
  wobbliness?: number
}

/**
 * The material on its own, with the optics exposed as props.
 *
 * `LiquidSurface` is the one to reach for in a product: it takes its whole
 * configuration from the provider and carries liquefy-ui's own character. This
 * one is for when the glass *is* the design — refraction, frost, dispersion and
 * the bezel are set per instance, and the four ornaments that make a surface
 * read as liquefy-ui rather than as plain glass start out switched off.
 */
export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(({
  bezel,
  children,
  className,
  curve,
  dispersion,
  elasticity,
  frost,
  glow = false,
  interactive = true,
  overLight = false,
  padding,
  radius,
  refraction,
  ripple = false,
  saturation,
  shimmer = false,
  sparkle = false,
  style,
  styles,
  tint,
  wobbliness,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const resolvedTint = tint ?? config.tint
  // With every ornament off there is nothing for the shader to draw, so the
  // canvas — and the WebGL context behind it — is not mounted at all.
  const hasOrnaments = glow || ripple || shimmer || sparkle
  const resolvedWebgl = config.webgl && hasOrnaments

  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bezel,
    curve,
    disabled: !interactive,
    dispersion: dispersion ?? config.dispersion,
    elasticity: elasticity ?? config.elasticity,
    glow,
    intensity: config.intensity,
    lens: config.lens && config.transparency,
    lensBlur: frost,
    lensStrength: refraction,
    motion: config.motion,
    ripple,
    saturation,
    shimmer,
    sparkle,
    tint: resolvedTint,
    webgl: resolvedWebgl,
    wobbliness: wobbliness ?? config.wobbliness,
  })

  const vars: LiquidCustomProperties = {
    '--lq-local-intensity': config.intensity,
    '--lq-radius': typeof radius === 'number' ? `${radius}px` : radius ?? 'var(--lq-radius-default)',
    '--lq-tint': resolvedTint,
  }
  if (padding !== undefined) {
    vars['--lq-glass-padding'] = typeof padding === 'number' ? `${padding}px` : padding
  }
  const root = useLiquidStyles(['lq-surface', 'lq-glass'], { className, style, styles, vars })

  return (
    <div
      className={root.className}
      data-liquid-interactive={interactive}
      data-liquid-over-light={overLight}
      data-liquid-variant="clear"
      ref={elementRef}
      style={root.style}
      {...props}
    >
      <span aria-hidden="true" className="lq-surface__edge" />
      {resolvedWebgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      <span className="lq-surface__content">{children}</span>
    </div>
  )
})

LiquidGlass.displayName = 'LiquidGlass'
