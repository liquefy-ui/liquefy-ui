import { ArrowRightIcon } from '@liquefy-ui/icons'
import { labExperiments, labInstallCommand } from '../../lab/registry'
import { CodeBlock, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

/**
 * The Lab has a screen of its own at `#/lab`. This entry keeps it in the docs
 * sidebar, and its link goes straight there; `#/docs/lab` itself redirects, so
 * the page below is only what renders where nothing redirects (a server render,
 * the docs test).
 */
export const labDoc: DocEntry = {
  description: 'Experimental, motion-heavy components on top of @liquefy-ui/react, each live on its own page in the Lab.',
  href: '#/lab',
  name: 'Lab',
  render: () => (
    <>
      <Section id="lab" title="The Lab has moved">
        <p>
          <code>@liquefy-ui/lab</code> has its own screen, with every experiment running over a photograph
          and a page for each.{' '}
          <a className="text-link" href="#/lab">Open the Lab<ArrowRightIcon size={14} /></a>
        </p>
        <ul>
          {labExperiments.map((experiment) => (
            <li key={experiment.slug}>
              <a className="text-link" href={`#/lab/${experiment.slug}`}>{experiment.name}</a>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="install" title="Installation">
        <CodeBlock code={labInstallCommand} />
        <p>
          <code>@liquefy-ui/react</code> is a peer, so lab components share your <code>LiquefyProvider</code>.
        </p>
      </Section>
    </>
  ),
  slug: 'lab',
  summary: 'Experimental components that are still moving, on a screen of their own.',
}
