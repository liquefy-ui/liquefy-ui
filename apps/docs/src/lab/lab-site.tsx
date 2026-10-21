import type { ReactNode } from 'react'
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@liquefy-ui/icons'
import { PropsTable } from '../docs/components-site'
import { CopyButton, DemoBlock, DocsShell } from '../docs/docs-chrome'
import { CommandRow } from '../site/chrome'
import { findExperiment, labCategories, labInstallCommand, labOrder } from './registry'
import type { LabExperiment } from './types'

const Breadcrumbs = ({ current }: { current?: string }) => (
  <nav aria-label="Breadcrumb" className="docs-page__breadcrumbs">
    <a href="#/">Home</a>
    <ChevronRightIcon size={12} />
    {current ? <a href="#/lab">Lab</a> : <span aria-current="page">Lab</span>}
    {current && (
      <>
        <ChevronRightIcon size={12} />
        <span aria-current="page">{current}</span>
      </>
    )}
  </nav>
)

const Pagination = ({ experiment }: { experiment: LabExperiment }) => {
  const index = labOrder.findIndex((entry) => entry.slug === experiment.slug)
  const previous = index > 0 ? labOrder[index - 1] : undefined
  const next = index >= 0 && index < labOrder.length - 1 ? labOrder[index + 1] : undefined

  return (
    <nav aria-label="Pagination" className="docs-pagination">
      {previous
        ? (
          <a data-direction="previous" href={`#/lab/${previous.slug}`}>
            <ChevronLeftIcon size={14} />
            <span><em>Previous</em><strong>{previous.name}</strong></span>
          </a>
        )
        : <span />}
      {next && (
        <a data-direction="next" href={`#/lab/${next.slug}`}>
          <span><em>Next</em><strong>{next.name}</strong></span>
          <ChevronRightIcon size={14} />
        </a>
      )}
    </nav>
  )
}

const ExperimentPage = ({ experiment }: { experiment: LabExperiment }) => (
  <article className="docs-page" key={experiment.slug}>
    <Breadcrumbs current={experiment.name} />
    <h1>{experiment.name}</h1>
    <p className="docs-page__lede">{experiment.description}</p>
    {experiment.inspiredBy && <p className="lab-credit">After {experiment.inspiredBy}</p>}
    <div className="docs-import">
      <code>{experiment.importLine}</code>
      <CopyButton label="Copy import" text={experiment.importLine} />
    </div>
    {experiment.demos.map((demo) => <DemoBlock demo={demo} key={demo.title} />)}
    <PropsTable doc={experiment} />
    <Pagination experiment={experiment} />
  </article>
)

/**
 * One experiment with its preview running. As on the components index, the card
 * is not a link — the preview is live — so the name carries the link.
 */
const LabCard = ({ experiment }: { experiment: LabExperiment }) => (
  <article className="lab-card">
    <div className="lab-card__stage">{(experiment.preview ?? experiment.demos[0]?.render)?.()}</div>
    <a href={`#/lab/${experiment.slug}`}>
      <strong>{experiment.name}</strong>
      <ArrowRightIcon size={14} />
    </a>
    <p>{experiment.description}</p>
  </article>
)

const IndexPage = () => (
  <article className="docs-page docs-page--index">
    <Breadcrumbs />
    <h1>Lab</h1>
    <p className="docs-page__lede">
      Components whose motion is the point: glass that splits off and melts back, liquid that sloshes,
      surfaces that stretch and settle. The material is the same as everywhere else on this site; what
      the Lab adds is choreography and physics.
    </p>
    <div className="lab-intro">
      <CommandRow command={labInstallCommand} />
      <p>
        Everything here is in <code>@liquefy-ui/lab</code> unless its page says otherwise, versioned{' '}
        <code>0.x</code>: an API can change between minor versions until it graduates into{' '}
        <code>@liquefy-ui/react</code>. <code>@liquefy-ui/react</code> is a peer, so the Lab shares your{' '}
        <code>LiquefyProvider</code> — its theme, tint, <code>motion</code> and <code>wobbliness</code>.
      </p>
    </div>

    {labCategories.map((category) => (
      <section className="docs-index-section" key={category.key}>
        <h2>
          {category.title}
          <em>{category.items.length}</em>
        </h2>
        <div className="lab-grid">
          {category.items.map((experiment) => <LabCard experiment={experiment} key={experiment.slug} />)}
        </div>
      </section>
    ))}
  </article>
)

export const LabSite = ({ route }: { route: string }) => {
  const slug = route.replace(/^#\/lab\/?/, '').replace(/[#/].*$/, '')
  const match = slug ? findExperiment(slug) : undefined

  let content: ReactNode
  if (!slug) {
    content = <IndexPage />
  } else if (match) {
    content = <ExperimentPage experiment={match} />
  } else {
    content = (
      <article className="docs-page">
        <Breadcrumbs current="Not found" />
        <h1>Not found</h1>
        <p className="docs-page__lede">No experiment named “{slug}”. Pick one from the sidebar.</p>
      </article>
    )
  }

  const sidebar = (
    <>
      <div className="docs-sidebar__group">
        <ul>
          <li>
            <a aria-current={!slug ? 'page' : undefined} data-active={!slug} href="#/lab">
              All experiments
            </a>
          </li>
        </ul>
      </div>
      {labCategories.map((category) => (
        <div className="docs-sidebar__group" key={category.key}>
          <span className="docs-sidebar__heading">
            {category.icon}
            {category.title}
          </span>
          <ul>
            {category.items.map((experiment) => (
              <li key={experiment.slug}>
                <a
                  aria-current={slug === experiment.slug ? 'page' : undefined}
                  data-active={slug === experiment.slug}
                  href={`#/lab/${experiment.slug}`}
                >
                  {experiment.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )

  return (
    <DocsShell route={route} section="lab" sidebar={sidebar} sidebarLabel="Lab" toc={false}>
      {content}
    </DocsShell>
  )
}
