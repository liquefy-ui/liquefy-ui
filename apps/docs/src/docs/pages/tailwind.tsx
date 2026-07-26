import { LiquidButton } from '@liquefy-ui/react'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const tailwindDoc: DocEntry = {
  description: 'One import order decides whether your utilities win. Plus the token bridge, as Tailwind theme values.',
  name: 'Tailwind CSS',
  render: () => (
    <>
      <Section id="order" title="The import order is the whole trick">
        <p>
          liquefy-ui puts all of its rules in a <code>liquefy-ui</code> cascade layer. Tailwind puts its
          utilities in a <code>utilities</code> layer. Which one wins is decided purely by the order the
          layers are <em>first declared</em> — so <code>className=&quot;p-0&quot;</code> on a{' '}
          <code>LiquidButton</code> either works or silently does nothing depending on your imports.
        </p>
        <p>
          Import <code>tailwind.css</code> instead of <code>styles.css</code>, before Tailwind, and the
          ordering is settled for you. That file declares the layer order, pulls in the base stylesheet,
          and bridges the <code>--lq-*</code> tokens into Tailwind&rsquo;s theme.
        </p>
        <CodeBlock
          code={`/* app/globals.css — order matters */
@import '@liquefy-ui/react/tailwind.css';
@import 'tailwindcss';`}
        />
        <Callout title="Do not import both" tone="warning">
          <code>tailwind.css</code> already includes <code>styles.css</code>. Importing both loads the
          component rules twice, and the second copy is unlayered — which quietly beats your utilities
          again.
        </Callout>
      </Section>

      <Section id="overriding" title="Overriding a component style">
        <p>
          With the layers in the right order, an ordinary utility beats the component&rsquo;s own rule. No{' '}
          <code>!important</code>, no arbitrary-variant tricks.
        </p>
        <DemoBlock
          demo={{
            code: `<LiquidButton className="rounded-full px-8">Rounded by Tailwind</LiquidButton>`,
            description: 'The button keeps its material, its springs and its focus ring; only the geometry comes from the utility.',
            render: () => <LiquidButton className="rounded-full px-8">Rounded by Tailwind</LiquidButton>,
            title: 'A utility on a component',
          }}
        />
        <p>
          For anything that should react to a token, a breakpoint or a state, the <code>styles</code> prop
          is usually shorter than a pile of variants — and it can read the tokens directly.{' '}
          <a className="text-link" href="#/docs/styles-prop">The styles prop<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="bridge" title="The token bridge">
        <p>
          Every token is exposed as a Tailwind theme value, so your utilities and the components resolve
          to the same numbers:
        </p>
        <CodeBlock
          code={`<div className="rounded-liquid bg-liquid-glass-soft p-4 shadow-liquid ease-liquid">
  <p className="text-liquid-muted">Tokens, as utilities.</p>
</div>`}
        />
        <GuideTable
          headers={['Tailwind class', 'Resolves to']}
          rows={[
            [<><code>bg-liquid-accent</code>, <code>text-liquid-accent</code></>, <code>--lq-accent</code>],
            [<><code>text-liquid-foreground</code>, <code>text-liquid-muted</code></>, <><code>--lq-foreground</code>, <code>--lq-muted</code></>],
            [<><code>bg-liquid-glass-soft</code> / <code>-bright</code> / <code>-shade</code></>, 'the glass fills'],
            [<><code>border-liquid-line</code>, <code>bg-liquid-fill</code></>, 'the regular material edge and fill'],
            [<code>rounded-liquid</code>, <code>--lq-radius-default</code>],
            [<><code>p-liquid</code> and friends</>, <code>--lq-space</code>],
            [<code>ease-liquid</code>, <code>--lq-easing</code>],
            [<code>shadow-liquid</code>, 'the surface shadow'],
          ]}
        />
      </Section>

      <Section id="inline" title="Why @theme inline">
        <p>
          The bridge uses <code>@theme inline</code> on purpose. liquefy-ui retints every token when the
          theme flips between light and dark, and only the inline form keeps a utility resolving{' '}
          <code>var(--lq-accent)</code> at use time instead of baking in whichever value happened to be
          current at build time.
        </p>
        <p>
          The practical consequence: <code>bg-liquid-accent</code> follows a runtime tint change, and{' '}
          <code>text-liquid-muted</code> follows a theme flip, with no rebuild and no re-render.
        </p>
      </Section>

      <Section id="v3" title="Tailwind v3">
        <p>
          The bridge is written for v4&rsquo;s CSS-first configuration. On v3 the layer order still applies
          — import the liquefy stylesheet before Tailwind&rsquo;s directives — but you will need to map the
          tokens yourself in <code>tailwind.config.js</code> if you want them as theme values:
        </p>
        <CodeBlock
          code={`// tailwind.config.js (v3)
export default {
  theme: {
    extend: {
      borderRadius: { liquid: 'var(--lq-radius-default)' },
      colors: {
        'liquid-accent': 'var(--lq-accent)',
        'liquid-muted': 'var(--lq-muted)',
      },
    },
  },
}`}
        />
      </Section>
    </>
  ),
  slug: 'tailwind',
  summary: 'Layer order, overriding component styles with utilities, and the --lq-* token bridge.',
}
