import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRightIcon, ChevronRightIcon, StarIcon } from '@liquefy-ui/icons'
import { SubProvider } from '../site/site-config'
import { catalog, componentCount, findDoc } from './catalog'
import { DemoBlock, CopyButton, DocsShell } from './docs-chrome'
import { IconsPage, iconCount, iconEntries } from './icons-gallery'
import { stylesProp, type CatalogCategory, type ComponentDoc } from './types'

/** The icon gallery lives under /components but is not a catalog entry. */
const ICONS_SLUG = 'icons'

const PropsTable = ({ doc }: { doc: ComponentDoc }) => (
  <section className="docs-props">
    <h2 id="api">API</h2>
    <p className="docs-props__intro">Props of <code>{doc.propsTitle ?? doc.name}</code>. Native element attributes are forwarded.</p>
    <div className="docs-props__scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {[...doc.props, ...(doc.acceptsStyles === false ? [] : [stylesProp])].map((prop, index) => (
            <tr key={`${prop.name}-${index}`}>
              <td>
                <code data-required={prop.required}>{prop.name}</code>
                {prop.required && <span className="docs-props__required">required</span>}
              </td>
              <td><code className="docs-props__type">{prop.type}</code></td>
              <td>{prop.defaultValue ? <code>{prop.defaultValue}</code> : <span className="docs-props__dash">—</span>}</td>
              <td>{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)

const DocPage = ({ doc }: { doc: ComponentDoc }) => (
  <article className="docs-page" key={doc.slug}>
    <nav aria-label="Breadcrumb" className="docs-page__breadcrumbs">
      <a href="#/">Home</a>
      <ChevronRightIcon size={12} />
      <a href="#/components">Components</a>
      <ChevronRightIcon size={12} />
      <span aria-current="page">{doc.name}</span>
    </nav>
    <h1>{doc.name}</h1>
    <p className="docs-page__lede">{doc.description}</p>
    <div className="docs-import">
      <code>{doc.importLine}</code>
      <CopyButton label="Copy import" text={doc.importLine} />
    </div>
    {doc.demos.map((demo) => <DemoBlock demo={demo} key={demo.title} />)}
    <PropsTable doc={doc} />
  </article>
)

/**
 * One catalogue entry, with its first demo rendered live. The card is not itself
 * a link — the preview is interactive, and a button inside an anchor is neither
 * valid nor usable — so the name carries the link instead.
 */
const GalleryCard = ({ item }: { item: ComponentDoc }) => (
  <article className="gallery-card">
    <div className="gallery-card__stage">{(item.preview ?? item.demos[0]?.render)?.()}</div>
    <a href={`#/components/${item.slug}`}>
      <strong>{item.name}</strong>
      <ArrowRightIcon size={14} />
    </a>
    <p>{item.description}</p>
  </article>
)

const GALLERY_ICONS = 10

const IndexPage = ({ catalog: entries, query }: { catalog: CatalogCategory[]; query: string }) => (
    <article className="docs-page docs-page--index docs-page--gallery">
      <nav aria-label="Breadcrumb" className="docs-page__breadcrumbs">
        <a href="#/">Home</a>
        <ChevronRightIcon size={12} />
        <span aria-current="page">Components</span>
      </nav>
      <h1>Components</h1>
      <p className="docs-page__lede">
        {componentCount} accessible React components rendered in transparent Liquid Glass — every one
        with focus, keyboard and disabled states and a CSS-only fallback. Everything below is live:
        press it here, then open its page for the rest of the demos and the prop table.
      </p>

      {query.trim() && entries.length === 0 && (
        <p className="docs-index-empty">Nothing matches “{query}”. Try a shorter word.</p>
      )}

      {/* A gallery of this size would otherwise open one WebGL context per
          surface, and browsers cap those at around sixteen per page. The shader
          is off here; every component page has it on. */}
      <SubProvider webgl={false}>
        {entries.map((category) => (
          <section className="docs-index-section" key={category.title}>
            <h2>
              {category.title}
              <em>{category.items.length}</em>
            </h2>
            <div className="gallery-grid">
              {category.items.map((item) => <GalleryCard item={item} key={item.slug} />)}
            </div>
          </section>
        ))}

        <section className="docs-index-section">
          <h2>Icons<em>{iconCount}</em></h2>
          <div className="gallery-grid">
            <article className="gallery-card">
              <div className="gallery-card__stage gallery-card__stage--icons">
                {iconEntries.slice(0, GALLERY_ICONS).map(([name, Icon]) => <Icon key={name} size={22} />)}
              </div>
              <a href={`#/components/${ICONS_SLUG}`}>
                <strong>All icons</strong>
                <ArrowRightIcon size={14} />
              </a>
              <p>
                {iconCount} rounded 24×24 SVG icons from @liquefy-ui/icons, sized and stroked live in the
                browser.
              </p>
            </article>
          </div>
        </section>
      </SubProvider>
    </article>
  )

export const ComponentsSite = ({ route }: { route: string }) => {
  const [query, setQuery] = useState('')
  const slug = route.replace(/^#\/components\/?/, '').replace(/\/$/, '')
  const onIcons = slug === ICONS_SLUG
  const match = slug && !onIcons ? findDoc(slug) : undefined

  // The header search filters components everywhere but the gallery, where it
  // filters icons instead — so a query carried across that boundary would sit
  // there filtering the wrong list.
  useEffect(() => setQuery(''), [onIcons])

  const filteredCatalog = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle || onIcons) return catalog
    return catalog
      .map((category) => ({
        ...category,
        // Descriptions are searched too, so “popover” finds Select and Menu.
        items: category.items.filter((item) =>
          `${item.name} ${item.description}`.toLowerCase().includes(needle)),
      }))
      .filter((category) => category.items.length > 0)
  }, [onIcons, query])

  let content: ReactNode
  if (!slug) {
    content = <IndexPage catalog={filteredCatalog} query={query} />
  } else if (onIcons) {
    content = <IconsPage query={query} />
  } else if (match) {
    content = <DocPage doc={match.doc} />
  } else {
    content = (
      <article className="docs-page">
        <h1>Not found</h1>
        <p className="docs-page__lede">No component named “{slug}”. Pick one from the sidebar.</p>
      </article>
    )
  }

  const sidebar = (
    <>
      <div className="docs-sidebar__group">
        <ul>
          <li>
            <a aria-current={!slug ? 'page' : undefined} data-active={!slug} href="#/components">
              All components
            </a>
          </li>
        </ul>
      </div>
      {filteredCatalog.map((category) => (
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
                  href={`#/components/${item.slug}`}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {filteredCatalog.length === 0 && <p className="docs-sidebar__empty">No matches for “{query}”.</p>}
      <div className="docs-sidebar__group">
        <span className="docs-sidebar__heading">
          <StarIcon size={15} />
          Icons
        </span>
        <ul>
          <li>
            <a
              aria-current={onIcons ? 'page' : undefined}
              data-active={onIcons}
              href={`#/components/${ICONS_SLUG}`}
            >
              All icons
            </a>
          </li>
        </ul>
      </div>
    </>
  )

  return (
    <DocsShell
      route={route}
      search={{
        onChange: setQuery,
        placeholder: onIcons ? 'Search icons…' : 'Search components…',
        value: query,
      }}
      section="components"
      sidebar={sidebar}
      sidebarLabel="Components"
      toc={false}
    >
      {content}
    </DocsShell>
  )
}
