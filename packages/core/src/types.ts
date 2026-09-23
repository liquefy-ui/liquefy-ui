export type LiquidVariant = 'clear' | 'tinted'

export type ElasticOptions = {
  /** How far the lean carries, 0 is rigid. */
  elasticity?: number
  /** How far outside the element the pointer is still felt, in pixels. */
  reach?: number
}

export type ElasticPull = {
  offsetX: number
  offsetY: number
  stretchX: number
  stretchY: number
}

export type ElasticSubscriber = (bounds: DOMRect, pointerX: number, pointerY: number) => void

export type LiquidMotionOptions = {
  bounce?: number
  disabled?: boolean
  /** How far the surface leans toward a pointer that has not reached it yet. */
  elasticity?: number
  /** Lit rim glow that follows the pointer. */
  glow?: boolean
  intensity?: number
  /** How far outside the element the pointer is still felt, in pixels. */
  reach?: number
  respectReducedMotion?: boolean
  /** Ring that travels out from a press. */
  ripple?: boolean
  /** Iridescent colour shift across the rim while the surface is wobbling. */
  shimmer?: boolean
  /** Drifting specular glints across the face. */
  sparkle?: boolean
  tilt?: number
  tint?: string
  webgl?: boolean
  wobbliness?: number
}

export type LiquidMotionController = {
  destroy: () => void
  pulse: (strength?: number) => void
  setDisabled: (disabled: boolean) => void
}

export type LiquidRendererOptions = {
  /** Lit rim glow that follows the pointer. */
  glow?: boolean
  intensity?: number
  radius?: number
  /** Ring that travels out from a press. */
  ripple?: boolean
  /** Iridescent colour shift across the rim while the surface is wobbling. */
  shimmer?: boolean
  /** Drifting specular glints across the face. */
  sparkle?: boolean
  tint?: string
}

export type LensMapOptions = {
  bezel?: number
  /** Exponent of the bezel cross-section: 1 is an even ramp, higher piles the bend against the rim. */
  curve?: number
  height: number
  radius: number
  /** How much of the bend the material can take without folding to spend, 0 to 1. */
  strength?: number
  width: number
}

export type LensMap = {
  height: number
  scale: number
  url: string
  width: number
}

export type LensFilterOptions = {
  /** Width of the refracting band at the rim, in pixels. Defaults to 22% of the short side. */
  bezel?: number
  blur?: number
  /** Exponent of the bezel cross-section: 1 is an even ramp, higher piles the bend against the rim. */
  curve?: number
  dispersion?: number
  radius?: number
  respectReducedTransparency?: boolean
  saturation?: number
  /** How much of the bend the material can take without folding to spend, 0 to 1. */
  strength?: number
}

export type LensFilterController = {
  destroy: () => void
  refresh: () => void
}

export type LiquefyTokens = {
  accent: string
  border: string
  duration: string
  easing: string
  radius: string
  shadow: string
  text: string
}
