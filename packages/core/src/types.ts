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
  /** Colour in the rim: an iridescent shift while wobbling, and a red/green/blue split at rest. Off by default. */
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
  /** Colour in the rim: an iridescent shift while wobbling, and a red/green/blue split at rest. Off by default. */
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

export type GlassMergeShape = {
  /** Centre, in pixels from the container's top-left. */
  x: number
  y: number
  width: number
  height: number
  /** Corner radius; `min(width, height) / 2` makes a circle or a pill. */
  radius: number
  /** Squash and stretch along `angle`: longer by this factor along it, shorter by it across. 1 is none. */
  stretch?: number
  /** Direction of the stretch, in degrees clockwise from the x axis. */
  angle?: number
}

export type GlassMergeOptions = {
  /** Width of the refracting band at the rim, in pixels. */
  bezel?: number
  /** False draws the outline even where the lens is supported, the way a provider's `lens={false}` turns it off. */
  lens?: boolean
  /** Draws the outline with a solid fill when the user asks the system for less transparency. */
  respectReducedTransparency?: boolean
  /** Largest gap, in pixels, that two shapes still bridge. SwiftUI's `spacing`. */
  spacing?: number
  /** How much of the bend the material can take without folding to spend, 0 to 1. */
  strength?: number
  /** A colour mixed into the glass, as on the tinted variant. */
  tint?: string
  /** False draws the outline with a solid fill, as a provider's `transparency={false}` does for every surface. */
  transparency?: boolean
}

export type GlassMergeController = {
  /** Which renderer was chosen: the lens built inside the filter, or the clipped outline. Fixed for the controller's life. */
  readonly mode: 'lens' | 'outline'
  /** Cheap enough to call on every animation frame. */
  setShapes: (shapes: readonly GlassMergeShape[]) => void
  destroy: () => void
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
