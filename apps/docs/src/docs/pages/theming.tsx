import { GlassCard, LiquidButton, LiquidChip, LiquidSurface } from '@liquefy-ui/react'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry, PropRow } from '../types'

const tokenRows: PropRow[] = [
  { description: 'The accent, and the per-surface tint derived from it.', name: '--lq-accent / --lq-tint', type: 'colour' },
  { description: 'Body text and the muted secondary tone.', name: '--lq-foreground / --lq-muted', type: 'colour' },
  { description: 'Placeholder text in fields.', name: '--lq-placeholder', type: 'colour' },
  { description: 'Hairline borders: surfaces, controls, fields.', name: '--lq-line / --lq-control-line / --lq-field-line', type: 'colour' },
  { description: 'Fills, all transparent by default — that is the point of the material.', name: '--lq-clear-fill / --lq-regular-fill / --lq-solid-fill', type: 'colour' },
  { description: 'Glass highlights: the bright top edge, the bottom shade, the soft inner wash.', name: '--lq-glass-bright / --lq-glass-shade / --lq-glass-soft', type: 'colour' },
  { description: 'The colour the surface shadow is mixed from.', name: '--lq-shadow-color', type: 'colour' },
  { description: 'Radius of the current surface, and the fallback default.', name: '--lq-radius / --lq-radius-default', type: 'length (18px)' },
  { description: 'Shared transition timing for everything that is not a spring.', name: '--lq-duration / --lq-easing', type: 'time / easing' },
  { description: 'One spacing unit, written by the provider.', name: '--lq-space', type: 'length (4px)' },
  { description: 'Optical strength, written by the provider and read by the shader.', name: '--lq-intensity', type: 'number' },
]

export const themingDoc: DocEntry = {
  description: 'Tokens, the two theme scopes, and three ways to make the material look like your product.',
  name: 'Theming',
  render: () => (
    <>
      <Section id="layers" title="Three layers of override">
        <p>
          Overrides come in three sizes. Picking the smallest one that fits is what keeps a design
          system predictable:
        </p>
        <ol className="docs-prose__list">
          <li>
            <strong><code>LiquefyProvider</code> props</strong> — accent, spacing scale, optics and
            motion for a whole subtree.{' '}
            <a className="text-link" href="#/docs/provider">Provider<ArrowRightIcon size={14} /></a>
          </li>
          <li>
            <strong>The <code>styles</code> prop</strong> — per-instance layout and colour, with tokens,
            breakpoints and states.{' '}
            <a className="text-link" href="#/docs/styles-prop">styles<ArrowRightIcon size={14} /></a>
          </li>
          <li>
            <strong>CSS custom properties</strong> — retheme the material itself, from your own
            stylesheet. That is the rest of this page.
          </li>
        </ol>
        <p>
          There is no <code>styled()</code> factory and no runtime CSS-in-JS dependency anywhere in the
          library.
        </p>
      </Section>

      <Section id="tokens" title="The tokens">
        <p>
          The material is built entirely from custom properties. Every one of them is also readable as a{' '}
          <code>$token</code> reference inside the <code>styles</code> prop, so you rarely need to write{' '}
          <code>var()</code> by hand.
        </p>
        <div className="docs-props">
          <div className="docs-props__scroll">
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Kind</th>
                  <th>What it drives</th>
                </tr>
              </thead>
              <tbody>
                {tokenRows.map((row) => (
                  <tr key={row.name}>
                    <td><code>{row.name}</code></td>
                    <td><code className="docs-props__type">{row.type}</code></td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p>
          A coding agent can read the real values instead of guessing them: <code>get_tokens</code> on
          the MCP server returns the resolved set per theme scope.{' '}
          <a className="text-link" href="#/docs/ai-tooling">AI tooling<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="scopes" title="Light and dark are two scopes, not two stylesheets">
        <p>
          Tokens are declared once per theme, scoped to the attribute the provider writes. Redeclaring a
          token inside those scopes is all a retheme is:
        </p>
        <CodeBlock
          code={`.lq-provider[data-liquid-theme='light'] {
  --lq-foreground: #0a0a0a;
  --lq-line: rgba(0, 0, 0, 0.1);
  --lq-glass-soft: rgba(255, 255, 255, 0.6);
}

.lq-provider[data-liquid-theme='dark'] {
  --lq-foreground: #fafafa;
  --lq-line: rgba(255, 255, 255, 0.12);
  --lq-glass-soft: rgba(255, 255, 255, 0.05);
}`}
        />
        <p>
          With <code>theme=&quot;system&quot;</code> the same values are applied through{' '}
          <code>prefers-color-scheme</code> instead, which is why that mode needs no JavaScript. Write
          both scopes and the system case is covered for free.
        </p>
        <Callout title="Keep values as var() references">
          Because tokens stay as <code>var()</code> references rather than resolved colours, a theme flip
          re-paints without re-rendering a single component. Resolving them to literal colours in JS —
          for example to pass to a chart library — gives that up.
        </Callout>
      </Section>

      <Section id="branding" title="Making it yours">
        <p>
          A brand pass is usually four values: the accent, the radius, the timing, and how bright the
          glass is. Scope them to <code>.lq-provider</code> — or to any ancestor of it — and everything
          below picks them up.
        </p>
        <CodeBlock
          code={`.lq-provider {
  --lq-radius-default: 12px;   /* squarer corners */
  --lq-duration: 260ms;        /* snappier non-spring transitions */
  --lq-glass-bright: rgba(255, 255, 255, 0.4);
  --lq-shadow-color: rgba(12, 10, 30, 0.18);
}`}
        />
        <p>
          The accent is a prop rather than a stylesheet edit, because components also read it in
          JavaScript for the shader:
        </p>
        <CodeBlock code={`<LiquefyProvider intensity={0.9} tint="#ff7a59" />`} />
        <DemoBlock
          demo={{
            code: `<GlassCard
  eyebrow="Brand pass"
  styles={{ maxW: 380 }}
  title="Squarer, warmer, faster"
>
  <LiquidButton tint="#ff7a59">Accent per instance</LiquidButton>
  <LiquidChip tint="#ff7a59" variant="tinted">Tinted</LiquidChip>
</GlassCard>`,
            description: 'tint is also a per-component prop, which is handy for a single call to action inside an otherwise neutral page.',
            render: () => (
              <GlassCard
                eyebrow="Brand pass"
                styles={{ maxW: 380 }}
                title="Squarer, warmer, faster"
              >
                <div className="stage-row">
                  <LiquidButton tint="#ff7a59">Accent per instance</LiquidButton>
                  <LiquidChip tint="#ff7a59" variant="tinted">Tinted</LiquidChip>
                </div>
              </GlassCard>
            ),
            stageMinHeight: 220,
            title: 'A per-instance accent',
          }}
        />
      </Section>

      <Section id="surfaces" title="Per-surface material">
        <p>
          <code>LiquidSurface</code> is the primitive every other surface is built on, and its props are
          the per-instance version of the provider&rsquo;s optics.
        </p>
        <GuideTable
          headers={['Prop', 'Effect']}
          rows={[
            [<code>variant</code>, <><code>clear</code> is the transparent default; <code>tinted</code> mixes the accent into the fill and the edge.</>],
            [<code>radius</code>, <>Drives <code>--lq-radius</code> rather than <code>border-radius</code>, so the press-squish keeps animating the corners.</>],
            [<code>intensity</code>, 'Overrides the provider’s optical strength for this surface only.'],
            [<code>interactive</code>, 'False detaches the pointer tracking and the springs — the right call for a static container.'],
            [<code>webgl</code> , 'False skips the canvas for this surface while the rest of the page keeps it.'],
            [<code>lens</code>, 'False drops the bezel refraction but keeps the blur and the highlights.'],
          ]}
        />
        <DemoBlock
          demo={{
            code: `<LiquidSurface radius={28} variant="clear">Clear, interactive</LiquidSurface>
<LiquidSurface radius={28} variant="tinted">Tinted</LiquidSurface>
<LiquidSurface interactive={false} radius={28} webgl={false}>Static, no canvas</LiquidSurface>`,
            description: 'Three surfaces, same tokens. Hover each one: only the first two track the pointer.',
            render: () => (
              <div className="stage-row stage-row--wrap">
                <LiquidSurface radius={28} styles={{ px: 6, py: 5 }} variant="clear">Clear, interactive</LiquidSurface>
                <LiquidSurface radius={28} styles={{ px: 6, py: 5 }} variant="tinted">Tinted</LiquidSurface>
                <LiquidSurface interactive={false} radius={28} styles={{ px: 6, py: 5 }} webgl={false}>Static, no canvas</LiquidSurface>
              </div>
            ),
            title: 'Variants and switches',
          }}
        />
      </Section>

      <Section id="contrast" title="Contrast, deliberately">
        <p>
          Transparent surfaces are a contrast risk, and the honest answer is that it depends on what is
          behind them. Two dials exist for exactly that:
        </p>
        <ul className="docs-prose__list">
          <li>
            <strong><code>intensity</code></strong> raises the blur and the brightness lift, which is
            usually enough to rescue text over a busy photograph.
          </li>
          <li>
            <strong><code>transparency={'{false}'}</code></strong> swaps the whole fill set for opaque
            values. Text contrast becomes a fixed, testable number.
          </li>
        </ul>
        <p>
          Both are provider props, so a single page — a checkout, a form-heavy settings screen — can opt
          out without changing components.{' '}
          <a className="text-link" href="#/docs/accessibility">Accessibility<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="tailwind" title="If you are on Tailwind">
        <p>
          The token bridge maps every <code>--lq-*</code> value to a Tailwind theme entry, so{' '}
          <code>bg-liquid-glass-soft</code> and <code>rounded-liquid</code> resolve to the same values the
          components use — and keep resolving to them after a theme flip.{' '}
          <a className="text-link" href="#/docs/tailwind">Tailwind CSS<ArrowRightIcon size={14} /></a>
        </p>
      </Section>
    </>
  ),
  slug: 'theming',
  summary: 'The --lq-* tokens, the two theme scopes, per-surface material, and contrast dials.',
}
