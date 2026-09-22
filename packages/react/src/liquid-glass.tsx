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
  /** Backdrop blur, in pixels. What frosted glass actually is. */
  frost?: number
  /** Lit rim glow that follows the pointer. Falls back to the provider. */
  glow?: boolean
  interactive?: boolean
  /** Dims the glass for a surface sitting on a bright backdrop. */
  overLight?: boolean
  padding?: number | string
  radius?: number | string
  /** How much of the bend the material can take without folding to spend, 0 to 1. */
  refraction?: number
  /** Ring that travels out from a press. Falls back to the provider. */
  ripple?: boolean
  /** How much the glass lifts the colour of what it refracts. */
  saturation?: number
  /** Iridescent colour shift across the rim while wobbling. Falls back to the provider. */
  shimmer?: boolean
  /** How far the lens softens what it refracts, in pixels. Not the backdrop blur — that is `frost`. */
  softness?: number
  /** Drifting specular glints across the face. Falls back to the provider. */
  sparkle?: boolean
  tint?: string
  /** How much of the material's own dressing sits over the backdrop, 1 to 0. */
  veil?: number
  wobbliness?: number
}

/**
 * The material on its own, with the optics exposed as props.
 *
 * `LiquidSurface` is the one to reach for in a product: it takes its whole
 * configuration from the provider. This one is for when the glass *is* the
 * design — refraction, frost, dispersion and the bezel are set per instance.
 *
 * Every one of those props is optional and falls back to the provider, so a
 * bare `<LiquidGlass>` is the house material rather than a stripped-down
 * variant of it. Naming a prop is how an instance departs from the default,
 * which is the only thing that should need saying out loud.
 */
export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(({
  bezel,
  children,
  className,
  curve,
  dispersion,
  elasticity,
  frost,
  glow,
  interactive = true,
  overLight = false,
  padding,
  radius,
  refraction,
  ripple,
  saturation,
  shimmer,
  softness,
  sparkle,
  style,
  styles,
  tint,
  veil,
  wobbliness,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const resolvedTint = tint ?? config.tint
  const resolvedGlow = glow ?? config.glow
  const resolvedRipple = ripple ?? config.ripple
  const resolvedShimmer = shimmer ?? config.shimmer
  const resolvedSparkle = sparkle ?? config.sparkle
  // With every ornament off there is nothing for the shader to draw, so the
  // canvas — and the WebGL context behind it — is not mounted at all.
  const hasOrnaments = resolvedGlow || resolvedRipple || resolvedShimmer || resolvedSparkle
  const resolvedWebgl = config.webgl && hasOrnaments

  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    bezel,
    curve,
    disabled: !interactive,
    dispersion: dispersion ?? config.dispersion,
    elasticity: elasticity ?? config.elasticity,
    glow: resolvedGlow,
    intensity: config.intensity,
    lens: config.lens && config.transparency,
    lensBlur: softness,
    lensStrength: refraction ?? config.refraction,
    motion: config.motion,
    ripple: resolvedRipple,
    saturation,
    shimmer: resolvedShimmer,
    sparkle: resolvedSparkle,
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
  // Set outright rather than added to the provider's, because a component that
  // names its own frost is saying what it wants to be, not how much more than
  // everything else.
  if (frost !== undefined) vars['--lq-blur'] = `${frost}px`
  if (veil !== undefined) vars['--lq-veil'] = veil
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
