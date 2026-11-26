import { MeshGradient } from '@liquefy-ui/lab'
import { LiquefyProvider, useLiquefyConfig, type LiquidStyles } from '@liquefy-ui/react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useSiteConfig } from '../site/site-config'
import './templates.css'

export const paneGlass: LiquidStyles = {
  _light: {
    '--lq-blur': '$frost',
    '--lq-saturate': 'calc(1 + 0.08 * $veil-amount)',
    '--lq-line': '$clear-line',
    '--lq-glass-bright': '$rim-bright',
    '--lq-glass-shade': '$shadow-color',
  },
}

const meshColors = (dark: boolean) => {
  const mix = (token: string, amount: number) =>
    `color-mix(in srgb, var(${token}) ${Math.round(amount * (dark ? 0.5 : 1))}%, var(--lq-solid-fill))`
  const colors = [
    mix('--lq-foreground', 4),
    mix('--lq-accent', 50),
    mix('--lq-foreground', 18),
    mix('--lq-accent', 28),
    mix('--lq-foreground', 10),
    'var(--lq-solid-fill)',
  ]
  return dark ? colors : colors.map((color) => `color-mix(in srgb, ${color} 55%, #ffffff)`)
}

const meshFill: CSSProperties = { inset: 0, position: 'absolute' }

const TemplateBackdrop = () => {
  const config = useLiquefyConfig()

  return (
    <div aria-hidden="true" className="template-backdrop">
      <LiquefyProvider {...config} className="app template-page" motion={false}>
        <MeshGradient colors={meshColors(config.theme === 'dark')} columns={4} rows={4} style={meshFill} />
      </LiquefyProvider>
    </div>
  )
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const TemplateTheme = ({ children, title, tint = '#ffffff', showBackdrop = true }: {
  children: ReactNode
  title: string
  tint?: string
  showBackdrop?: boolean
}) => {
  const { motion, theme } = useSiteConfig()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const reducedTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)')

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} · liquefy-ui`
    return () => { document.title = previousTitle }
  }, [title])

  return (
    <LiquefyProvider
      className="app template-page"
      frost={0}
      glow
      intensity={1}
      lens
      motion={motion && !reducedMotion}
      refraction={0}
      ripple
      shimmer
      sparkle
      theme={theme}
      tint={tint}
      transparency={!reducedTransparency}
      veil={0}
      wobbliness={1}
    >
      {showBackdrop && <TemplateBackdrop />}
      {children}
    </LiquefyProvider>
  )
}
