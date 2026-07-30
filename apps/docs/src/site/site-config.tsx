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

/** What is actually on screen. `system` has already been resolved away. */
export type ResolvedTheme = 'dark' | 'light'

export type SiteConfig = MaterialConfig & {
  /** System → Light → Dark → System. */
  cycleTheme: () => void
  /** Physics actually handed to the provider; trails `motionOn` on the way off. */
  motion: boolean
  /** What the motion toggle displays. */
  motionOn: boolean
  reset: () => void
  setMaterial: <K extends keyof MaterialConfig>(key: K, value: MaterialConfig[K]) => void
  setMotionOn: (next: boolean) => void
  /** Takes `system` as well, which puts the site back on the OS setting. */
  setTheme: (next: LiquefyTheme) => void
  /** The appearance in force. Read this to paint something. */
  theme: ResolvedTheme
  /** What the visitor picked. `system` while the OS is in charge. */
  themeChoice: LiquefyTheme
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

/** The three appearances, in the order the header toggle walks through them. */
export const THEME_ORDER = ['system', 'light', 'dark'] as const satisfies readonly LiquefyTheme[]

export const THEME_LABELS: Record<LiquefyTheme, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
}

export const nextTheme = (current: LiquefyTheme): LiquefyTheme =>
  // The `??` is only for the checked-index rule; the modulo cannot miss.
  THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length] ?? 'system'

const readStoredTheme = (): LiquefyTheme | null => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_ORDER.includes(stored as LiquefyTheme) ? (stored as LiquefyTheme) : null
  } catch {
    // Private mode or a blocked storage partition: fall back to the OS setting.
    return null
  }
}

const systemTheme = (): ResolvedTheme =>
  window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'

/**
 * Root of the whole documentation site: one provider, one theme, one set of
 * material settings shared by every route.
 */
export const SiteProvider = ({ children }: { children: ReactNode }) => {
  const [themeChoice, setThemeChoice] = useState<LiquefyTheme>(() => readStoredTheme() ?? 'system')
  const [systemScheme, setSystemScheme] = useState<ResolvedTheme>(systemTheme)
  const [material, setMaterialState] = useState<MaterialConfig>(DEFAULT_MATERIAL)
  const [motion, setMotion] = useState(true)
  const [motionOn, setMotionOnState] = useState(true)
  const motionOffTimer = useRef<number | undefined>(undefined)

  // `system` is a standing choice, not just a starting point: the subscription
  // stays up for the whole session so flipping the OS switch — including back and
  // forth, and including after the visitor has pinned a theme and returned to
  // System — lands on the page immediately.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystemScheme(media.matches ? 'dark' : 'light')
    // The OS may have moved between the inline script in <head> and this effect.
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme: ResolvedTheme = themeChoice === 'system' ? systemScheme : themeChoice

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
      setThemeChoice(next)
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
      cycleTheme: () => setTheme(nextTheme(themeChoice)),
      motion,
      motionOn,
      reset: () => setMaterialState(DEFAULT_MATERIAL),
      setMaterial: (key, next) => setMaterialState((current) => ({ ...current, [key]: next })),
      setMotionOn,
      setTheme,
      theme,
      themeChoice,
    }
  }, [material, motion, motionOn, theme, themeChoice])

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
