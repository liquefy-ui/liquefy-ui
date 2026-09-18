import { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

export type LiquefyConfig = {
  /** Minimum widths behind the responsive form of the `styles` prop. */
  breakpoints: LiquefyBreakpoints
  /** How far apart the red and blue channels are pulled at the rim, 0 to 1. */
  dispersion: number
  /** How far a surface leans toward a pointer that has not reached it yet. */
  elasticity: number
  /**
   * The four ornaments. They are what makes the material read as liquefy-ui
   * rather than plain glass, and they are separable because a product that
   * wants the optics without the personality should not have to fork the
   * stylesheet to get it.
   */
  glow: boolean
  intensity: number
  lens: boolean
  motion: boolean
  ripple: boolean
  shimmer: boolean
  sparkle: boolean
  /** One spacing unit. `styles={{ p: 3 }}` resolves to three of these. */
  spacing: number | string
  theme: LiquefyTheme
  tint: string
  transparency: boolean
  webgl: boolean
  wobbliness: number
}

export type LiquefyBreakpoint = 'lg' | 'md' | 'sm' | 'xl'

export type LiquefyBreakpoints = Record<LiquefyBreakpoint, number | string>

export type LiquefyTheme = 'dark' | 'light' | 'system'

export type LiquefyProviderProps = Partial<Omit<LiquefyConfig, 'breakpoints'>> & {
  breakpoints?: Partial<LiquefyBreakpoints>
  children: ReactNode
  className?: string
}

export const defaultBreakpoints: LiquefyBreakpoints = {
  lg: 1024,
  md: 768,
  sm: 640,
  xl: 1280,
}

const defaultConfig: LiquefyConfig = {
  breakpoints: defaultBreakpoints,
  dispersion: 0.6,
  elasticity: 0.16,
  glow: true,
  intensity: 0.72,
  lens: true,
  motion: true,
  ripple: true,
  shimmer: true,
  sparkle: true,
  spacing: 4,
  theme: 'system',
  tint: '#8eb9ff',
  transparency: true,
  webgl: true,
  wobbliness: 1,
}

const LiquefyContext = createContext<LiquefyConfig>(defaultConfig)

// Portaled surfaces (Select/Menu popovers) land in this node rather than
// document.body, so they stay inside the provider subtree and inherit the
// theme custom properties — otherwise they render with no fill or shadow.
const LiquefyPortalContext = createContext<HTMLElement | null>(null)

type CustomProperties = CSSProperties & Record<`--${string}`, string | number>

export const LiquefyProvider = ({
  breakpoints,
  children,
  className,
  dispersion = defaultConfig.dispersion,
  elasticity = defaultConfig.elasticity,
  glow = defaultConfig.glow,
  intensity = defaultConfig.intensity,
  lens = defaultConfig.lens,
  motion = defaultConfig.motion,
  ripple = defaultConfig.ripple,
  shimmer = defaultConfig.shimmer,
  sparkle = defaultConfig.sparkle,
  spacing = defaultConfig.spacing,
  theme = defaultConfig.theme,
  tint = defaultConfig.tint,
  transparency = defaultConfig.transparency,
  webgl = defaultConfig.webgl,
  wobbliness = defaultConfig.wobbliness,
}: LiquefyProviderProps) => {
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null)
  // Serialized so an inline `breakpoints={{ md: 900 }}` literal does not hand
  // every consumer a fresh config object on each render.
  const breakpointsKey = breakpoints ? JSON.stringify(breakpoints) : ''
  const resolvedBreakpoints = useMemo(
    () => (breakpoints ? { ...defaultBreakpoints, ...breakpoints } : defaultBreakpoints),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakpointsKey],
  )
  const value = useMemo(
    () => ({
      breakpoints: resolvedBreakpoints,
      dispersion,
      elasticity,
      glow,
      intensity,
      lens,
      motion,
      ripple,
      shimmer,
      sparkle,
      spacing,
      theme,
      tint,
      transparency,
      webgl,
      wobbliness,
    }),
    [
      resolvedBreakpoints, dispersion, elasticity, glow, intensity, lens, motion, ripple,
      shimmer, sparkle, spacing, theme, tint, transparency, webgl, wobbliness,
    ],
  )
  const style: CustomProperties = {
    '--lq-accent': tint,
    '--lq-intensity': intensity,
    '--lq-space': typeof spacing === 'number' ? `${spacing}px` : spacing,
  }

  return (
    <LiquefyContext.Provider value={value}>
      <div
        className={['lq-provider', className].filter(Boolean).join(' ')}
        data-liquid-motion={motion ? 'on' : 'off'}
        data-liquid-theme={theme}
        data-liquid-transparency={transparency ? 'on' : 'off'}
        style={style}
      >
        <LiquefyPortalContext.Provider value={portalNode}>
          {children}
          <div className="lq-portal" ref={setPortalNode} />
        </LiquefyPortalContext.Provider>
      </div>
    </LiquefyContext.Provider>
  )
}

export const useLiquefyConfig = (): LiquefyConfig => useContext(LiquefyContext)

export const useLiquefyPortalContainer = (): HTMLElement | null => useContext(LiquefyPortalContext)
