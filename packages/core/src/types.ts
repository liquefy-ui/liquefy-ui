export type LiquidVariant = 'clear' | 'tinted'

export type LiquidMotionOptions = {
  bounce?: number
  disabled?: boolean
  intensity?: number
  respectReducedMotion?: boolean
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
  intensity?: number
  radius?: number
  tint?: string
}

export type LensMapOptions = {
  bezel?: number
  height: number
  radius: number
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
  blur?: number
  dispersion?: number
  radius?: number
  respectReducedTransparency?: boolean
  saturation?: number
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
