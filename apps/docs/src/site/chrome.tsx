import { useEffect, useState, type ReactNode } from 'react'
import { MeshGradient } from '@liquefy-ui/lab'
import { LiquidDrawer } from '@liquefy-ui/react'
import { CheckIcon, CopyIcon, GithubIcon, MoonIcon, MoreHorizontalIcon, SunIcon } from '@liquefy-ui/icons'
import { nextTheme, THEME_LABELS, useSiteConfig, type ResolvedTheme } from './site-config'

export const repositoryUrl = 'https://github.com/liquefy-ui/liquefy-ui'
/** The maintainer's personal listing, not the organisation's — see `.github/FUNDING.yml`. */
export const sponsorUrl = 'https://github.com/sponsors/yu5ag'
export const siteUrl = 'https://liquefy-ui.com'
export const version = '0.1'

export const installCommand = 'pnpm add @liquefy-ui/react @liquefy-ui/core @liquefy-ui/icons'

export const BrandMark = () => (
  <span aria-hidden="true" className="brand-mark">
    <span />
    <span />
  </span>
)

export const Brand = ({ href = '#/' }: { href?: string }) => (
  <a className="brand" href={href}>
    <BrandMark />
    <span>liquefy</span>
    <em>ui</em>
  </a>
)

export const JellyMark = () => (
  <svg
    aria-hidden="true"
    className="jelly-mark"
    fill="none"
    height={19}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
    width={19}
  >
    <path
      className="jelly-mark__bell"
      d="M5 12.4C5 7.6 8.1 4.5 12 4.5s7 3.1 7 7.9q-1.75 1.7-3.5 0-1.75 1.7-3.5 0-1.75 1.7-3.5 0-1.75 1.7-3.5 0Z"
    />
    <g className="jelly-mark__spots">
      <circle cx="10" cy="9.6" r="0.9" />
      <circle cx="14" cy="9.6" r="0.9" />
    </g>
    <g className="jelly-mark__tentacles jelly-mark__tentacles--wavy">
      <path d="M8.4 13q-1.1 1.5 0 3 1.1 1.5 0 3 -1.1 1.3 0 2.3" />
      <path d="M12 13.3q-1.1 1.5 0 3 1.1 1.5 0 3 -1.1 1.3 0 2.3" />
      <path d="M15.6 13q-1.1 1.5 0 3 1.1 1.5 0 3 -1.1 1.3 0 2.3" />
    </g>
    <g className="jelly-mark__tentacles jelly-mark__tentacles--still">
      <path d="M8.4 13v7.6" />
      <path d="M12 13.3v7.3" />
      <path d="M15.6 13v7.6" />
    </g>
  </svg>
)

/** Stops and starts the spring physics for the entire site. */
export const MotionToggle = () => {
  const { motionOn, setMotionOn } = useSiteConfig()

  return (
    <button
      aria-label={motionOn ? 'Turn jelly motion off' : 'Turn jelly motion on'}
      aria-pressed={motionOn}
      className="icon-toggle jelly-toggle"
      data-motion={motionOn ? 'on' : 'off'}
      onClick={() => setMotionOn(!motionOn)}
      type="button"
    >
      <JellyMark />
    </button>
  )
}

/** The third appearance: a screen, for "whatever the machine says". */
const SystemMark = () => (
  <svg
    aria-hidden="true"
    className="theme-toggle__system"
    fill="none"
    height={17}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
    width={17}
  >
    <rect height="12.5" rx="2.2" width="18" x="3" y="4" />
    <path d="M9 20.5h6M12 16.5v4" />
  </svg>
)

/**
 * Three states rather than two, because "follow the OS" has to be somewhere a
 * visitor can get back to: a two-way toggle pins the theme on the first click and
 * the machine's own light/dark switch stops reaching the page for good.
 */
export const ThemeToggle = () => {
  const { cycleTheme, themeChoice } = useSiteConfig()

  return (
    <button
      aria-label={`Appearance: ${THEME_LABELS[themeChoice]}. Switch to ${THEME_LABELS[nextTheme(themeChoice)]}.`}
      className="icon-toggle theme-toggle"
      data-theme={themeChoice}
      onClick={cycleTheme}
      type="button"
    >
      <span className="theme-toggle__icons">
        <SunIcon className="theme-toggle__sun" size={17} />
        <MoonIcon className="theme-toggle__moon" size={17} />
        <SystemMark />
      </span>
    </button>
  )
}

export const CopyButton = ({ label, text }: { label: string; text: string }) => {
  const [copied, setCopied] = useState(false)

  return (
    <button
      aria-label={label}
      className="docs-copy"
      data-copied={copied}
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      type="button"
    >
      {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
    </button>
  )
}

/** A one-line shell command with the copy affordance on the whole row. */
export const CommandRow = ({ command, label }: { command: string; label?: string }) => {
  const [copied, setCopied] = useState(false)

  return (
    <button
      aria-label={label ?? `Copy ${command}`}
      className="command-row"
      data-copied={copied}
      onClick={async () => {
        await navigator.clipboard.writeText(command)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      }}
      type="button"
    >
      <span className="command-row__prompt">$</span>
      <code>{command}</code>
      <span className="command-row__copy">{copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}</span>
    </button>
  )
}

export type SiteSection = 'components' | 'docs' | 'home' | 'lab' | 'playground'

const NAV = [
  { href: '#/docs', label: 'Docs', match: 'docs' },
  { href: '#/components', label: 'Components', match: 'components' },
  { href: '#/playground', label: 'Playground', match: 'playground' },
  { href: '#/lab', label: 'Lab', match: 'lab' },
] as const satisfies readonly { href: string; label: string; match: SiteSection }[]

type SiteHeaderProps = {
  /** Rendered between the nav and the actions — the component search, usually. */
  children?: ReactNode
  /** Shown on narrow screens only, to open the section sidebar. */
  onOpenSidebar?: () => void
  section: SiteSection
}

/**
 * On a narrow screen — a folded Z Fold is 344px — the nav and the toggles do not
 * fit next to the brand, so they move into a drawer instead of being clipped off
 * the edge. It is the library's own `LiquidDrawer`: focus trap, scroll lock and
 * Escape come with it.
 */
const CompactMenu = ({ section }: { section: SiteSection }) => {
  const { cycleTheme, motionOn, setMotionOn, themeChoice } = useSiteConfig()
  const [open, setOpen] = useState(false)

  // Following a link inside the drawer should close it.
  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  return (
    <div className="header-menu">
      <button
        aria-expanded={open}
        aria-label="Menu"
        className="icon-toggle header-menu__trigger"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MoreHorizontalIcon size={17} />
      </button>

      <LiquidDrawer
        className="header-drawer"
        closeLabel="Close menu"
        onOpenChange={setOpen}
        open={open}
        side="right"
        title="Menu"
      >
        <nav aria-label="Site" className="header-drawer__nav">
          {NAV.map((entry) => (
            <a
              aria-current={section === entry.match ? 'page' : undefined}
              data-active={section === entry.match}
              href={entry.href}
              key={entry.match}
              onClick={() => setOpen(false)}
            >
              {entry.label}
            </a>
          ))}
        </nav>
        <div className="header-drawer__row">
          <span>Appearance</span>
          <button onClick={cycleTheme} type="button">{THEME_LABELS[themeChoice]}</button>
        </div>
        <div className="header-drawer__row">
          <span>Jelly motion</span>
          <button onClick={() => setMotionOn(!motionOn)} type="button">{motionOn ? 'On' : 'Off'}</button>
        </div>
        <a className="header-drawer__external" href={repositoryUrl} rel="noreferrer" target="_blank">
          <GithubIcon size={15} />
          GitHub
        </a>
      </LiquidDrawer>
    </div>
  )
}

export const SiteHeader = ({ children, onOpenSidebar, section }: SiteHeaderProps) => (
  <header className="site-header">
    {onOpenSidebar && (
      <button aria-label="Open section menu" className="sidebar-trigger" onClick={onOpenSidebar} type="button">
        <span />
        <span />
        <span />
      </button>
    )}
    <Brand />
    <nav aria-label="Site" className="site-nav">
      {NAV.map((entry) => (
        <a
          aria-current={section === entry.match ? 'page' : undefined}
          data-active={section === entry.match}
          href={entry.href}
          key={entry.match}
        >
          {entry.label}
        </a>
      ))}
    </nav>
    <div className="site-header__slot">{children}</div>
    <div className="header-actions">
      <MotionToggle />
      <ThemeToggle />
      <a
        aria-label="GitHub repository"
        className="icon-toggle header-github"
        href={repositoryUrl}
        rel="noreferrer"
        target="_blank"
      >
        <GithubIcon size={17} />
      </a>
    </div>
    <CompactMenu section={section} />
  </header>
)

export const SiteFooter = () => (
  <footer className="site-footer">
    <div>
      <Brand />
      <p>Transparent Liquid Glass components for React. MIT licensed.</p>
    </div>
    <div className="site-footer__links">
      <div>
        <strong>Documentation</strong>
        <a href="#/docs/installation">Installation</a>
        <a href="#/docs/theming">Theming</a>
        <a href="#/docs/frameworks">Frameworks</a>
        <a href="#/docs/ai-tooling">AI tooling</a>
      </div>
      <div>
        <strong>Library</strong>
        <a href="#/components">Components</a>
        <a href="#/components/icons">Icons</a>
        <a href="#/playground">Playground</a>
        <a href="#/lab">Lab</a>
      </div>
      <div>
        <strong>Elsewhere</strong>
        <a href={repositoryUrl} rel="noreferrer" target="_blank">GitHub</a>
        <a href="https://www.npmjs.com/package/@liquefy-ui/react" rel="noreferrer" target="_blank">npm</a>
        <a href={sponsorUrl} rel="noreferrer" target="_blank">Sponsor</a>
        <a href="/llms.txt">llms.txt</a>
        <a href="/r/registry.json">Registry</a>
      </div>
    </div>
  </footer>
)

/**
 * The page's colours, as the theme's own tokens. They are resolved against the
 * provider the mesh sits in, so a theme that changes `--lq-solid-fill` changes
 * the page with it. Light is the pale grey the tokens sit on, lifted toward
 * the accent in places and shaded toward the text in others; dark is the
 * theme's fill pressed most of the way to black, so the glass still has
 * something to bend without the page turning blue.
 */
const MESH_COLORS: Record<ResolvedTheme, readonly string[]> = {
  dark: [
    'color-mix(in srgb, var(--lq-solid-fill) 46%, black)',
    'color-mix(in srgb, var(--lq-solid-fill) 30%, black)',
    'color-mix(in srgb, var(--lq-solid-fill) 62%, black)',
    'color-mix(in srgb, var(--lq-solid-fill) 22%, black)',
    'color-mix(in srgb, var(--lq-solid-fill) 40%, black)',
  ],
  light: [
    'var(--lq-solid-fill)',
    'color-mix(in srgb, var(--lq-solid-fill) 45%, var(--lq-accent))',
    'color-mix(in srgb, var(--lq-solid-fill) 90%, var(--lq-foreground))',
    'color-mix(in srgb, var(--lq-solid-fill) 70%, var(--lq-accent))',
    'color-mix(in srgb, var(--lq-solid-fill) 94%, var(--lq-foreground))',
  ],
}

/** The page under every route — a still mesh gradient — and its grain. */
export const Ambience = () => {
  const { theme } = useSiteConfig()

  return (
    <>
      {/* Keyed by theme: the mesh reads its colours once, when it mounts, so a
          flip has to hand it a fresh one to read the other theme's tokens. */}
      <MeshGradient
        aria-hidden="true"
        className="site-mesh"
        colors={MESH_COLORS[theme]}
        key={theme}
        speed={0}
        style={{ position: 'fixed' }}
      />
      <div aria-hidden="true" className="noise" />
    </>
  )
}

/** Scrolls to the top whenever the route changes, like a page load would. */
export const useScrollReset = (route: string) => {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])
}
