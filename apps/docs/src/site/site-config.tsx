import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  LiquefyProvider,
  useLiquefyConfig,
  type LiquefyProviderProps,
  type LiquefyTheme,
} from '@liquefy-ui/react'

/**
 * The material settings the playground exposes. They live at the root of the
 * site rather than inside the playground section so that a change made there is
 * visibly applied to every surface on the page — header, cards, docs chrome —
 * which is the whole point of showing the controls first.
 */
export type MaterialConfig = {
  intensity: number
  lens: boolean
  tint: string
  transparency: boolean
  webgl: boolean
  wobbliness: number
}

export type SiteConfig = MaterialConfig & {
  /** Physics actually handed to the provider; trails `motionOn` on the way off. */
  motion: boolean
  /** What the motion toggle displays. */
  motionOn: boolean
  reset: () => void
  setMaterial: <K extends keyof MaterialConfig>(key: K, value: MaterialConfig[K]) => void
  setMotionOn: (next: boolean) => void
  setTheme: (next: LiquefyTheme) => void
  theme: LiquefyTheme
  toggleTheme: () => void
}

export const TINTS = [
  { label: 'Graphite', value: '#8f8f8f' },
  { label: 'Azure', value: '#6f9dff' },
  { label: 'Violet', value: '#a98cff' },
  { label: 'Mint', value: '#5ccfae' },
  { label: 'Blush', value: '#ff93a6' },
] as const

const DEFAULT_MATERIAL: MaterialConfig = {
  intensity: 0.72,
  lens: true,
  tint: TINTS[0].value,
  transparency: true,
  webgl: true,
  wobbliness: 1,
}

/**
 * A nested provider that keeps the surrounding material and only replaces what
 * it is handed. `LiquefyProvider` resolves unset props from the library defaults
 * rather than from the provider above it, so a bare nested one would quietly
 * reset the tint and the optics — which on this site means a demo losing the
 * visitor's chosen tint.
 */
export const SubProvider = ({
  children,
  ...overrides
}: Partial<Omit<LiquefyProviderProps, 'children'>> & { children: ReactNode }) => {
  const config = useLiquefyConfig()

  return (
    <LiquefyProvider
      breakpoints={config.breakpoints}
      intensity={config.intensity}
      lens={config.lens}
      motion={config.motion}
      spacing={config.spacing}
      theme={config.theme}
      tint={config.tint}
      transparency={config.transparency}
      webgl={config.webgl}
      wobbliness={config.wobbliness}
      {...overrides}
    >
      {children}
    </LiquefyProvider>
  )
}

const THEME_STORAGE_KEY = 'liquefy-docs-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

// Turning motion off waits for in-flight jelly to settle before the physics
// actually stop, so wobbles don't freeze part-way through.
const MOTION_SETTLE_MS = 680

const SiteConfigContext = createContext<SiteConfig | null>(null)

export const useSiteConfig = (): SiteConfig => {
  const config = useContext(SiteConfigContext)
  if (!config) throw new Error('useSiteConfig must be used inside <SiteProvider>')
  return config
}

const readStoredTheme = (): LiquefyTheme | null => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    // Private mode or a blocked storage partition: fall back to the OS setting.
    return null
  }
}

const systemTheme = (): LiquefyTheme =>
  window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'

/**
 * Root of the whole documentation site: one provider, one theme, one set of
 * material settings shared by every route.
 */
export const SiteProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<LiquefyTheme>(() => readStoredTheme() ?? systemTheme())
  const [chosen, setChosen] = useState(() => readStoredTheme() !== null)
  const [material, setMaterialState] = useState<MaterialConfig>(DEFAULT_MATERIAL)
  const [motion, setMotion] = useState(true)
  const [motionOn, setMotionOnState] = useState(true)
  const motionOffTimer = useRef<number | undefined>(undefined)

  // Follow the OS until the visitor makes a choice of their own; after that the
  // choice sticks across reloads.
  useEffect(() => {
    if (chosen) return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setThemeState(event.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [chosen])

  // The page background and the browser chrome live outside the provider, so
  // they read the theme from the document element instead.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'light' ? '#ffffff' : '#000000',
    )
  }, [theme])

  useEffect(() => () => window.clearTimeout(motionOffTimer.current), [])

  const value = useMemo<SiteConfig>(() => {
    const setTheme = (next: LiquefyTheme) => {
      setThemeState(next)
      setChosen(true)
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Not being able to remember the choice is not worth failing over.
      }
    }

    const setMotionOn = (next: boolean) => {
      window.clearTimeout(motionOffTimer.current)
      setMotionOnState(next)
      if (next) {
        setMotion(true)
      } else {
        motionOffTimer.current = window.setTimeout(() => setMotion(false), MOTION_SETTLE_MS)
      }
    }

    return {
      ...material,
      motion,
      motionOn,
      reset: () => setMaterialState(DEFAULT_MATERIAL),
      setMaterial: (key, next) => setMaterialState((current) => ({ ...current, [key]: next })),
      setMotionOn,
      setTheme,
      theme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }
  }, [material, motion, motionOn, theme])

  return (
    <SiteConfigContext.Provider value={value}>
      <LiquefyProvider
        intensity={material.intensity}
        lens={material.lens}
        motion={motion}
        theme={theme}
        tint={material.tint}
        transparency={material.transparency}
        webgl={material.webgl}
        wobbliness={material.wobbliness}
      >
        {children}
      </LiquefyProvider>
    </SiteConfigContext.Provider>
  )
}
