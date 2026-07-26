import { LiquidSurface } from '@liquefy-ui/react'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const performanceDoc: DocEntry = {
  description: 'What each layer of the material costs, which switch to reach for first, and how to keep long lists cheap.',
  name: 'Performance',
  render: () => (
    <>
      <Section id="cost" title="What costs what">
        <GuideTable
          headers={['Layer', 'Cost', 'Switch']}
          rows={[
            [
              <><code>backdrop-filter</code> blur</>,
              'The most expensive part, and it scales with the painted area — one full-bleed panel costs more than twenty buttons.',
              <><code>transparency={'{false}'}</code>, or a lower <code>intensity</code></>,
            ],
            [
              'The WebGL shine',
              'One canvas and one context per interactive surface. Idle surfaces do not draw, but each context is real GPU memory.',
              <code>webgl={'{false}'}</code>,
            ],
            [
              'The bezel lens',
              'An SVG filter regenerated when the surface resizes. Cheap while static, noticeable during a resize-heavy animation.',
              <code>lens={'{false}'}</code>,
            ],
            [
              'The springs',
              'Roughly 2 KB of code, and animation frames only while a spring is away from rest. An idle page runs none.',
              <code>motion={'{false}'}</code>,
            ],
            [
              'Pointer tracking',
              'One listener set per interactive surface.',
              <code>interactive={'{false}'}</code>,
            ],
          ]}
        />
        <p>
          The order matters: if a page feels heavy, turn off <code>webgl</code> before you touch anything
          else. It is the switch with the largest effect and the smallest visual cost, because the glass,
          the springs and the layout all stay exactly as they were.
        </p>
      </Section>

      <Section id="lists" title="Long lists and dense tables">
        <p>
          The pattern that gets expensive is one surface per row. A hundred rows means a hundred canvases
          and a hundred blurs, for an effect nobody is looking at. Render the container as the glass and
          leave the rows plain:
        </p>
        <CodeBlock
          code={`{/* One surface for the whole list, not one per row */}
<LiquidSurface interactive={false} radius={24} webgl={false}>
  <LiquidList>
    {rows.map((row) => (
      <LiquidListItem key={row.id}>{row.label}</LiquidListItem>
    ))}
  </LiquidList>
</LiquidSurface>`}
        />
        <DemoBlock
          demo={{
            code: `<LiquidSurface interactive={false} radius={20} webgl={false}>Static container</LiquidSurface>`,
            description: 'The container on the left tracks nothing and creates no canvas; the one on the right is fully interactive. They cost very different amounts and look nearly identical at rest.',
            render: () => (
              <div className="stage-row stage-row--wrap">
                <LiquidSurface interactive={false} radius={20} styles={{ px: 6, py: 5 }} webgl={false}>
                  Static container
                </LiquidSurface>
                <LiquidSurface radius={20} styles={{ px: 6, py: 5 }}>Interactive surface</LiquidSurface>
              </div>
            ),
            title: 'Static versus interactive',
          }}
        />
        <p>
          Nested providers make this a one-line decision for a whole region:{' '}
          <code>&lt;LiquefyProvider webgl={'{false}'}&gt;</code> around a data view keeps the rest of the app
          on the GPU path.{' '}
          <a className="text-link" href="#/docs/provider">Nesting<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="bundle" title="Bundle size">
        <GuideTable
          headers={['What', 'Notes']}
          rows={[
            [<code>@liquefy-ui/core</code>, 'No runtime dependencies. The renderer, the lens and the spring engine are separate modules, so a build that never renders a surface drops the WebGL code.'],
            [<code>@liquefy-ui/icons</code>, 'Every icon is its own named export with no shared runtime, so importing three icons ships three icons.'],
            [<code>@liquefy-ui/react</code>, <>Depends on <code>@base-ui/react</code> for the accessibility primitives. Components you never import are tree-shaken; the ones you do import pull in only their own Base UI parts.</>],
            ['The styles engine', <>Emits nothing at all for a static <code>styles</code> object — it becomes an inline style attribute. Only states and breakpoints generate a rule.</>],
          ]}
        />
        <p>
          The stylesheet is the one thing that is not tree-shaken: it is a single CSS file covering every
          component. If that matters more than the convenience, copy the components you use out of the
          registry and delete the rest.{' '}
          <a className="text-link" href="#/docs/ai-tooling">Registry<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="runtime" title="Runtime behaviour worth knowing">
        <ul className="docs-prose__list">
          <li>
            <strong>Springs sleep.</strong> A spring at rest is removed from the frame loop, so an
            untouched page does no work. Hovering one surface wakes that surface only.
          </li>
          <li>
            <strong>Theme flips do not re-render.</strong> Tokens are <code>var()</code> references, so
            switching <code>theme</code> repaints without React reconciling the tree below the provider.
          </li>
          <li>
            <strong>The tint is a custom property too.</strong> Changing <code>tint</code> at 60fps — as
            the playground on this site does — is a paint, not a render.
          </li>
          <li>
            <strong>Lens maps are per size.</strong> A surface that changes size continuously regenerates
            its filter; if you animate width or height, pass <code>lens={'{false}'}</code> for the duration.
          </li>
        </ul>
        <Callout title="Measure the paint, not the JS">
          A heavy liquefy page shows up as long paint and composite work in a performance profile, not as
          scripting time. If the flame chart is flat and the frames are still late, the answer is almost
          always fewer blurred pixels.
        </Callout>
      </Section>

      <Section id="checklist" title="A quick checklist">
        <ol className="docs-prose__list">
          <li>Full-bleed blurred panels: at most one on screen.</li>
          <li>Repeated rows, cells, chips: one glass container, plain children.</li>
          <li>Data-dense routes: nest a provider with <code>webgl={'{false}'}</code>.</li>
          <li>Non-interactive containers: <code>interactive={'{false}'}</code>.</li>
          <li>Animating a surface&rsquo;s size: <code>lens={'{false}'}</code> while it animates.</li>
          <li>Still heavy? <code>transparency={'{false}'}</code> — opaque fills, no blur at all.</li>
        </ol>
      </Section>
    </>
  ),
  slug: 'performance',
  summary: 'The cost of each layer, keeping lists cheap, bundle notes, and a six-line checklist.',
}
