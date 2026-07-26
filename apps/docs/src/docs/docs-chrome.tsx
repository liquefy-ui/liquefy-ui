import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LiquidSurface } from '@liquefy-ui/react'
import { SearchIcon, XIcon } from '@liquefy-ui/icons'
import { Ambience, CopyButton, SiteFooter, SiteHeader, useScrollReset, type SiteSection } from '../site/chrome'
import type { DemoDef } from './types'

export { CopyButton }
export { repositoryUrl } from '../site/chrome'

/** One `h2` section of a doc page. The id is what the table of contents links to. */
export const Section = ({ children, id, title }: { children: ReactNode; id: string; title: string }) => (
  <section className="docs-prose__section">
    <h2 id={id}>{title}</h2>
    {children}
  </section>
)

export const CodeBlock = ({ code, title }: { code: string; title?: string }) => (
  <div className="docs-code">
    {title && <span className="docs-code__title">{title}</span>}
    <pre><code>{code}</code></pre>
    <CopyButton label="Copy code" text={code} />
  </div>
)

/**
 * A two-or-more column table for prose. Doc pages reuse the component pages'
 * `docs-props` chrome because that is the only place tables are styled.
 */
export const GuideTable = ({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) => (
  <div className="docs-props">
    <div className="docs-props__scroll">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            // Cells are arbitrary nodes, so the row index is the only stable key.
            <tr key={rowIndex}>{cells.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

/** A pull-out for the thing that will otherwise bite the reader. */
export const Callout = ({ children, title, tone = 'note' }: {
  children: ReactNode
  title: string
  tone?: 'note' | 'warning'
}) => (
  <aside className="docs-callout" data-tone={tone}>
    <strong>{title}</strong>
    <div>{children}</div>
  </aside>
)

export const DemoBlock = ({ demo }: { demo: DemoDef }) => {
  const [showCode, setShowCode] = useState(false)

  return (
    <section className="docs-demo">
      <header className="docs-demo__header">
        <div>
          <h3>{demo.title}</h3>
          {demo.description && <p>{demo.description}</p>}
        </div>
        <button
          aria-expanded={showCode}
          className="docs-demo__toggle"
          onClick={() => setShowCode((current) => !current)}
          type="button"
        >
          {showCode ? 'Hide code' : 'Show code'}
        </button>
      </header>
      <LiquidSurface className="docs-demo__stage" interactive={false} radius={18} webgl={false}>
        <div
          className="docs-demo__canvas"
          style={{
            ...(demo.stageMinHeight ? { minHeight: demo.stageMinHeight } : {}),
            ...(demo.stageAlign === 'top' ? { alignItems: 'flex-start' } : {}),
          }}
        >
          {demo.render()}
        </div>
      </LiquidSurface>
      {showCode && <CodeBlock code={demo.code} />}
    </section>
  )
}

type TocEntry = { id: string; text: string }

/**
 * Built from the headings the page actually rendered rather than a hand-kept
 * list, so a new section in a doc page shows up here for free.
 */
const OnThisPage = ({ container, route }: { container: HTMLElement | null; route: string }) => {
  const [entries, setEntries] = useState<TocEntry[]>([])
  const [active, setActive] = useState<string>()

  useEffect(() => {
    if (!container) return
    const headings = [...container.querySelectorAll<HTMLHeadingElement>('h2[id]')]
    setEntries(headings.map((heading) => ({ id: heading.id, text: heading.textContent ?? '' })))
    setActive(headings[0]?.id)

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((record) => record.isIntersecting)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // Bias the band towards the top of the viewport so the highlighted entry
      // is the section you are reading, not the one just scrolling into view.
      { rootMargin: '-72px 0px -60% 0px', threshold: 0 },
    )
    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [container, route])

  if (entries.length < 2) return null

  return (
    <aside className="docs-toc">
      <span className="docs-toc__title">On this page</span>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            {/* A real fragment href would replace the routing hash, so the jump
                is done by hand instead. */}
            <button
              data-active={active === entry.id}
              onClick={() => document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth' })}
              type="button"
            >
              {entry.text}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

type DocsShellProps = {
  children: ReactNode
  /** Current hash route; scroll and the mobile sidebar reset whenever it changes. */
  route: string
  search?: {
    onChange: (value: string) => void
    placeholder: string
    value: string
  }
  section: SiteSection
  sidebar: ReactNode
  sidebarLabel: string
  /** Off for index pages, where the heading list is the page itself. */
  toc?: boolean
}

/**
 * Header, sidebar and table of contents shared by the docs and components
 * sections. Adding a section means rendering this shell with its own sidebar.
 */
export const DocsShell = ({
  children,
  route,
  search,
  section,
  sidebar,
  sidebarLabel,
  toc = true,
}: DocsShellProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [main, setMain] = useState<HTMLElement | null>(null)
  const mainRef = useRef<HTMLElement>(null)

  useScrollReset(route)

  // The mobile sidebar is a drawer: navigating inside it should close it.
  useEffect(() => setSidebarOpen(false), [route])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  useEffect(() => setMain(mainRef.current), [route])

  return (
    <div className="site-shell docs-shell">
      <Ambience />
      <SiteHeader onOpenSidebar={() => setSidebarOpen(true)} section={section}>
        {search && (
          <label className="docs-search">
            <SearchIcon size={15} />
            <input
              onChange={(event) => search.onChange(event.currentTarget.value)}
              placeholder={search.placeholder}
              type="search"
              value={search.value}
            />
          </label>
        )}
      </SiteHeader>

      <div className="docs-body" data-toc={toc}>
        <aside className="docs-sidebar" data-open={sidebarOpen}>
          <div className="docs-sidebar__head">
            <span>{sidebarLabel}</span>
            <button aria-label="Close section menu" onClick={() => setSidebarOpen(false)} type="button">
              <XIcon size={16} />
            </button>
          </div>
          {/* On narrow screens the header hides the site nav, so the drawer
              carries it — otherwise the other sections are unreachable. */}
          <nav aria-label="Site" className="docs-sidebar__sections">
            <a href="#/docs">Docs</a>
            <a href="#/components">Components</a>
            <a href="#/playground">Playground</a>
          </nav>
          <nav aria-label={sidebarLabel}>{sidebar}</nav>
        </aside>
        {sidebarOpen && (
          <div className="docs-sidebar__scrim" onClick={() => setSidebarOpen(false)} role="presentation" />
        )}

        <main className="docs-main" ref={mainRef}>{children}</main>

        {toc && <OnThisPage container={main} route={route} />}
      </div>

      <SiteFooter />
    </div>
  )
}
