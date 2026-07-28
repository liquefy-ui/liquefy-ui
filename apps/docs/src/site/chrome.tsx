import { useEffect, useState, type ReactNode } from 'react'
import { LiquidDrawer } from '@liquefy-ui/react'
import { CheckIcon, CopyIcon, GithubIcon, MoonIcon, MoreHorizontalIcon, SunIcon } from '@liquefy-ui/icons'
import { useSiteConfig } from './site-config'

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

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useSiteConfig()

  return (
    <button
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="icon-toggle theme-toggle"
      data-theme={theme}
      onClick={toggleTheme}
      type="button"
    >
      <span className="theme-toggle__icons">
        <SunIcon className="theme-toggle__sun" size={17} />
        <MoonIcon className="theme-toggle__moon" size={17} />
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

export type SiteSection = 'components' | 'docs' | 'home' | 'playground'

const NAV = [
  { href: '#/docs', label: 'Docs', match: 'docs' },
  { href: '#/components', label: 'Components', match: 'components' },
  { href: '#/playground', label: 'Playground', match: 'playground' },
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
  const { motionOn, setMotionOn, theme, toggleTheme } = useSiteConfig()
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
          <button onClick={toggleTheme} type="button">{theme === 'dark' ? 'Dark' : 'Light'}</button>
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

/** Background wash and grain shared by every route. */
export const Ambience = () => (
  <>
    <div aria-hidden="true" className="ambient ambient--one" />
    <div aria-hidden="true" className="ambient ambient--two" />
    <div aria-hidden="true" className="grid-wash" />
    <div aria-hidden="true" className="noise" />
  </>
)

/** Scrolls to the top whenever the route changes, like a page load would. */
export const useScrollReset = (route: string) => {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])
}
