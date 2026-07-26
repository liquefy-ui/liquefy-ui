import type { ReactNode } from 'react'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@liquefy-ui/icons'
import { componentCount } from './catalog'
import { DocsShell } from './docs-chrome'
import { docCategories, docCount, docOrder, findDocPage } from './docs-nav'
import type { DocEntry } from './types'

const Breadcrumbs = ({ current }: { current?: string }) => (
  <nav aria-label="Breadcrumb" className="docs-page__breadcrumbs">
    <a href="#/">Home</a>
    <ChevronRightIcon size={12} />
    {current ? <a href="#/docs">Docs</a> : <span aria-current="page">Docs</span>}
    {current && (
      <>
        <ChevronRightIcon size={12} />
        <span aria-current="page">{current}</span>
      </>
    )}
  </nav>
)

const Pagination = ({ doc }: { doc: DocEntry }) => {
  const index = docOrder.findIndex((entry) => entry.slug === doc.slug)
  const previous = index > 0 ? docOrder[index - 1] : undefined
  const next = index >= 0 && index < docOrder.length - 1 ? docOrder[index + 1] : undefined

  return (
    <nav aria-label="Pagination" className="docs-pagination">
      {previous
        ? (
          <a data-direction="previous" href={`#/docs/${previous.slug}`}>
            <ChevronLeftIcon size={14} />
            <span><em>Previous</em><strong>{previous.name}</strong></span>
          </a>
        )
        : <span />}
      {next && (
        <a data-direction="next" href={`#/docs/${next.slug}`}>
          <span><em>Next</em><strong>{next.name}</strong></span>
          <ChevronRightIcon size={14} />
        </a>
      )}
    </nav>
  )
}

const DocPage = ({ doc }: { doc: DocEntry }) => (
  <article className="docs-page docs-prose" key={doc.slug}>
    <Breadcrumbs current={doc.name} />
    <h1>{doc.name}</h1>
    <p className="docs-page__lede">{doc.description}</p>
    {doc.render()}
    <Pagination doc={doc} />
  </article>
)

const IndexPage = () => (
  <article className="docs-page docs-page--index">
    <Breadcrumbs />
    <h1>Documentation</h1>
    <p className="docs-page__lede">
      {docCount} pages covering the material, the provider, the token system, the framework boundaries,
      and the tooling that lets a coding agent write against the real API. The {componentCount} component
      pages live in their own section.
    </p>

    <h2 className="docs-start__title">Start here</h2>
    <div className="docs-start">
      <a href="#/docs/introduction">
        <em>01</em>
        <strong>Introduction</strong>
        <span>What the material is made of and which package holds which part.</span>
      </a>
      <a href="#/docs/installation">
        <em>02</em>
        <strong>Installation</strong>
        <span>Install, import the stylesheet, add the provider, render a surface.</span>
      </a>
      <a href="#/docs/theming">
        <em>03</em>
        <strong>Theming</strong>
        <span>Tokens, the two theme scopes, and making it look like your product.</span>
      </a>
    </div>

    {/* The first category is the “Start here” trio above, so it is not repeated. */}
    {docCategories.slice(1).map((category) => (
      <section className="docs-index-section" key={category.title}>
        <h2>{category.title}</h2>
        <div className="docs-index-grid">
          {category.items.map((item) => (
            <a className="docs-index-card" href={`#/docs/${item.slug}`} key={item.slug}>
              <strong>{item.name}</strong>
              <span>{item.summary ?? item.description}</span>
            </a>
          ))}
        </div>
      </section>
    ))}

    <section className="docs-index-section">
      <h2>Elsewhere</h2>
      <div className="docs-index-grid">
        <a className="docs-index-card" href="#/components">
          <strong>Component reference<ArrowRightIcon size={14} /></strong>
          <span>{componentCount} components with live demos and full prop tables.</span>
        </a>
        <a className="docs-index-card" href="#/playground">
          <strong>Playground<ArrowRightIcon size={14} /></strong>
          <span>Every provider prop as a control, applied to the whole site.</span>
        </a>
      </div>
    </section>
  </article>
)

export const DocsSite = ({ route }: { route: string }) => {
  // Trailing fragments and slashes are stripped so a deep link with a heading
  // anchor still resolves to its page.
  const slug = route.replace(/^#\/docs\/?/, '').replace(/[#/].*$/, '')
  const match = slug ? findDocPage(slug) : undefined

  let content: ReactNode
  if (!slug) {
    content = <IndexPage />
  } else if (match) {
    content = <DocPage doc={match.doc} />
  } else {
    content = (
      <article className="docs-page">
        <Breadcrumbs current="Not found" />
        <h1>Not found</h1>
        <p className="docs-page__lede">No documentation page named “{slug}”. Pick one from the sidebar.</p>
      </article>
    )
  }

  const sidebar = docCategories.map((category) => (
    <div className="docs-sidebar__group" key={category.title}>
      <span className="docs-sidebar__heading">
        {category.icon}
        {category.title}
      </span>
      <ul>
        {category.items.map((item) => (
          <li key={item.slug}>
            <a
              aria-current={slug === item.slug ? 'page' : undefined}
              data-active={slug === item.slug}
              href={`#/docs/${item.slug}`}
            >
              {item.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ))

  return (
    <DocsShell
      route={route}
      section="docs"
      sidebar={sidebar}
      sidebarLabel="Documentation"
      toc={Boolean(match)}
    >
      {content}
    </DocsShell>
  )
}
