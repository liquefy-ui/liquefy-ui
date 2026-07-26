import { GlassCard, LiquidButton, LiquidChip, LiquidSurface } from '@liquefy-ui/react'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, Section } from '../docs-chrome'
import type { DocEntry, PropRow } from '../types'

const Table = ({ caption, rows }: { caption?: string; rows: PropRow[] }) => (
  <div className="docs-props">
    {caption && <p className="docs-props__intro">{caption}</p>}
    <div className="docs-props__scroll">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Resolves to</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
)

const spacingRows: PropRow[] = [
  { description: 'All sides.', name: 'p / m', type: 'padding / margin' },
  { description: 'Logical axes, so they follow writing direction.', name: 'px / py / mx / my', type: 'padding-inline / padding-block / margin-inline / margin-block' },
  { description: 'Single side.', name: 'pt / pr / pb / pl / mt / mr / mb / ml', type: 'padding-top … margin-left' },
  { description: 'Not shorthands — plain CSS properties that happen to use the same scale.', name: 'gap / rowGap / columnGap', type: 'gap / row-gap / column-gap' },
]

const sizeRows: PropRow[] = [
  { description: 'Numbers become pixels here, exactly like the style attribute.', name: 'w / h', type: 'width / height' },
  { description: 'Both at once — handy for avatars and icon buttons.', name: 'size', type: 'width + height' },
  { description: 'Constraints.', name: 'minW / maxW / minH / maxH', type: 'min-width … max-height' },
  { description: 'Shorthand for the most common colour override.', name: 'bg', type: 'background-color' },
  { description: 'Drives the custom property rather than border-radius, so the press-squish keeps animating the corners.', name: 'radius', type: '--lq-radius' },
]

const stateRows: PropRow[] = [
  { description: 'Pointer and keyboard interaction.', name: '_hover / _focus / _focusVisible / _active', type: ':hover / :focus / :focus-visible / :active' },
  { description: 'Matches the native state and the ARIA/data attributes the components set.', name: '_disabled / _checked / _selected / _expanded / _open', type: ':disabled, [aria-disabled] … [aria-expanded="true"]' },
  { description: 'Form states, plus the placeholder pseudo-element.', name: '_invalid / _readOnly / _placeholder', type: ':invalid / :read-only / ::placeholder' },
  { description: 'Position within the parent.', name: '_first / _last / _odd / _even', type: ':first-child … :nth-child(even)' },
  { description: 'Covers the explicit theme attribute and theme="system" through prefers-color-scheme, so one key handles both.', name: '_dark / _light', type: '[data-liquid-theme] + media query' },
  { description: 'Anything else: raw selectors must start with &, at-rules with @. They nest as deeply as you like.', name: "'&…' / '@…'", type: 'the selector or at-rule itself' },
]

export const stylesPropDoc: DocEntry = {
  description: 'The per-instance override system: shorthands, token references, breakpoints, states, and where it lands in the cascade.',
  name: 'The styles prop',
  render: () => (
    <>
      <Section id="shape" title="What it is">
        <p>
          Every component accepts <code>styles</code>. It is a superset of <code>style</code>: every CSS
          property in camelCase, every <code>--custom-property</code>, plus spacing shorthands, token
          references, responsive objects and state blocks.
        </p>
        <DemoBlock
          demo={{
            code: `<LiquidButton
  styles={{
    color: 'accent',
    px: 6,
    radius: 999,
    _hover: { bg: '$glass-soft' },
  }}
>
  Tinted pill
</LiquidButton>

<LiquidChip styles={{ ml: 2, fontVariantNumeric: 'tabular-nums' }}>12 left</LiquidChip>`,
            description: 'Colour words on colour properties, spacing units on p/m keys, and a hover state — no stylesheet involved.',
            render: () => (
              <>
                <LiquidButton
                  styles={{
                    _hover: { bg: '$glass-soft' },
                    color: 'accent',
                    px: 6,
                    radius: 999,
                  }}
                >
                  Tinted pill
                </LiquidButton>
                <LiquidChip styles={{ fontVariantNumeric: 'tabular-nums', ml: 2 }}>12 left</LiquidChip>
              </>
            ),
            title: 'Shorthands and states',
          }}
        />
      </Section>

      <Section id="numbers" title="Numbers and shorthands">
        <p>
          On spacing keys a plain number counts <code>--lq-space</code> units, so <code>{'p: 3'}</code>{' '}
          becomes <code>calc(var(--lq-space) * 3)</code> — 12px by default, and it retunes with the
          provider&rsquo;s <code>spacing</code>. Everywhere else a number becomes pixels, exactly like the{' '}
          <code>style</code> attribute, and unitless properties such as <code>opacity</code> or{' '}
          <code>zIndex</code> stay unitless.
        </p>
        <Table rows={spacingRows} />
        <Table rows={sizeRows} />
      </Section>

      <Section id="tokens" title="Token references">
        <p>
          Anywhere inside a string, <code>$name</code> resolves to <code>var(--lq-name)</code> — inside a
          whole shorthand too, not only as a standalone value. Colour properties additionally accept the
          bare words <code>accent</code>, <code>tint</code>, <code>foreground</code>, <code>muted</code>,{' '}
          <code>placeholder</code>, <code>text</code> and <code>line</code>.
        </p>
        <CodeBlock
          code={`styles={{
  border: '1px solid $line',        // → 1px solid var(--lq-line)
  boxShadow: '0 8px 30px $shadow-color',
  transitionDuration: '$duration',
  color: 'muted',                   // → var(--lq-muted)
}}`}
        />
        <p>
          They stay as <code>var()</code> references rather than resolved colours, so a theme switch
          updates them with no re-render.{' '}
          <a className="text-link" href="#/docs/theming">Every token<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="responsive" title="Responsive values">
        <p>
          Any value can become an object keyed by breakpoint. <code>base</code> applies below the first
          breakpoint, and the generated media queries are always emitted in ascending order no matter
          how you write the object.
        </p>
        <DemoBlock
          demo={{
            code: `<GlassCard
  styles={{
    p: { base: 4, md: 7 },
    w: { base: '100%', md: 420 },
    textAlign: { base: 'center', md: 'left' },
  }}
  title="Resize the window"
>
  Padding, width and alignment all step up at the md breakpoint.
</GlassCard>`,
            description: 'Resize the window: the card re-lays itself out at 768px.',
            render: () => (
              <GlassCard
                styles={{
                  p: { base: 4, md: 7 },
                  textAlign: { base: 'center', md: 'left' },
                  w: { base: '100%', md: 420 },
                }}
                title="Resize the window"
              >
                Padding, width and alignment all step up at the md breakpoint.
              </GlassCard>
            ),
            title: 'Breakpoints',
          }}
        />
        <CodeBlock
          code={`<LiquefyProvider breakpoints={{ md: 800, xl: '90rem' }}>
  {/* numbers become px; strings are used verbatim */}
</LiquefyProvider>`}
        />
      </Section>

      <Section id="states" title="States and raw selectors">
        <p>
          State keys start with an underscore. Anything the built-in keys do not cover can be written as
          a raw selector starting with <code>&amp;</code>, or an at-rule starting with <code>@</code> — and
          both nest.
        </p>
        <DemoBlock
          demo={{
            code: `<LiquidSurface
  styles={{
    p: 5,
    _hover: { bg: '$glass-soft', letterSpacing: '0.04em' },
    _dark: { color: 'accent' },
    '&:has(code)': { fontVariantLigatures: 'none' },
    '@supports (color: lch(50% 40 20))': { borderColor: 'lch(60% 30 260 / 0.4)' },
  }}
>
  Hover me — and try the theme toggle
</LiquidSurface>`,
            description: '_dark covers both an explicit theme="dark" and theme="system" under a dark OS setting, so one key is enough.',
            render: () => (
              <LiquidSurface
                styles={{
                  '&:has(code)': { fontVariantLigatures: 'none' },
                  '@supports (color: lch(50% 40 20))': { borderColor: 'lch(60% 30 260 / 0.4)' },
                  _dark: { color: 'accent' },
                  _hover: { bg: '$glass-soft', letterSpacing: '0.04em' },
                  p: 5,
                }}
              >
                Hover me — and try the theme toggle
              </LiquidSurface>
            ),
            title: 'States',
          }}
        />
        <Table rows={stateRows} />
      </Section>

      <Section id="cascade" title="How it lands in the page">
        <p>
          A <code>styles</code> object with no states and no breakpoints compiles straight to the{' '}
          <code>style</code> attribute: no class, no stylesheet, nothing to hydrate.
        </p>
        <p>
          The moment a state or breakpoint appears, the <em>whole</em> object moves into a generated
          class instead. That is deliberate — if the unconditional half stayed inline it would outrank
          the very <code>:hover</code> rule meant to override it, and the hover would silently do
          nothing.
        </p>
        <p>
          The generated class is inserted <strong>unlayered</strong>, while the component stylesheet
          lives in <code>@layer liquefy-ui</code>. Unlayered rules beat layered ones in the cascade
          regardless of specificity, so overrides win without <code>!important</code> and without
          selector games.
        </p>
        <CodeBlock
          code={`styles={{ p: 3 }}
→ style="padding:calc(var(--lq-space, 4px) * 3)"

styles={{ p: 3, _hover: { p: 5 } }}
→ class="lq-button lq-x-1f2e3d"
   .lq-x-1f2e3d{padding:calc(var(--lq-space, 4px) * 3)}
   .lq-x-1f2e3d:hover{padding:calc(var(--lq-space, 4px) * 5)}`}
        />
        <h3>Precedence</h3>
        <p>
          Component custom properties, then <code>styles</code>, then <code>style</code>.{' '}
          <code>style</code> stays the last-resort escape hatch, so it always wins. A property that{' '}
          <code>styles</code> declares is withheld from the component&rsquo;s own inline custom
          properties, so overriding something like <code>radius</code> works even from a state block.
        </p>
        <Callout title="transform and backdropFilter cannot be overridden" tone="warning">
          Both are written inline by the springs and the lens filter on every frame, so a{' '}
          <code>styles</code> declaration loses the race. Development builds warn about it. Wrap the
          component in an element of your own and transform that instead.
        </Callout>
      </Section>

      <Section id="own" title="Your own components">
        <p>
          <code>useLiquidStyles</code> is exported, so a component of yours can accept the same{' '}
          <code>styles</code> prop with the same semantics. Pass the component&rsquo;s base classes, the
          incoming <code>className</code> / <code>style</code> / <code>styles</code>, and any custom
          properties the component owns; you get back the merged pair to spread.
        </p>
        <CodeBlock
          code={`import { useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'
import type { HTMLAttributes } from 'react'

type PanelProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & { tone?: string }

export const Panel = ({ className, style, styles, tone, ...props }: PanelProps) => {
  const root = useLiquidStyles('my-panel', {
    className,
    style,
    styles,
    vars: tone ? { '--my-panel-tone': tone } : undefined,
  })

  return <div className={root.className} style={root.style} {...props} />
}`}
        />
      </Section>

      <Section id="ssr" title="Server rendering">
        <p>
          Static <code>styles</code> need nothing: they are already inline in the HTML. Conditional ones
          are inserted through <code>useInsertionEffect</code>, which does not run on the server, so
          flush the collected rules into the document head yourself.
        </p>
        <CodeBlock
          code={`import { getLiquefyStyleSheet } from '@liquefy-ui/react'

// after rendering the tree to HTML
const css = getLiquefyStyleSheet()
// → inline it as <style data-liquefy-styles>{css}</style> in <head>`}
        />
        <p>
          Frameworks that stream HTML for you — Next.js App Router included — handle this through their
          own insertion mechanism, so this is only needed for hand-rolled SSR.
        </p>
      </Section>

      <Section id="reserved" title="Reserved: slotStyles">
        <p>
          <code>styles</code> always targets the component root. Per-part styling —{' '}
          <code>{'{ header, body, footer }'}</code> on a card, say — is reserved under the name{' '}
          <code>slotStyles</code> and is not implemented yet. Until then, reach for the part classes
          (<code>.lq-card__header</code> and friends) from your own stylesheet.
        </p>
      </Section>
    </>
  ),
  slug: 'styles-prop',
  summary: 'Shorthands, $token references, breakpoints, state keys, and how it wins in the cascade.',
}
