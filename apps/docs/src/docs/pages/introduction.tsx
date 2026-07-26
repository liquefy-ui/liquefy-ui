import { GlassCard, LiquidButton, LiquidSurface } from '@liquefy-ui/react'
import { ArrowRightIcon, SparklesIcon } from '@liquefy-ui/icons'
import { Callout, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const introductionDoc: DocEntry = {
  description:
    'What the library is, what the material is made of, and which package holds which part of it.',
  name: 'Introduction',
  render: () => (
    <>
      <Section id="what" title="What this is">
        <p>
          liquefy-ui is a React component library built around one material: highly transparent glass
          that refracts what is behind it, reacts to the pointer, and settles with spring physics. It
          is an independent open-source implementation for the web — it references public design
          principles, and is not affiliated with Apple Inc.
        </p>
        <p>
          The parts that are usually hardest to retrofit are the ones it ships with: focus-visible
          rings that survive a translucent background, keyboard behaviour on every interactive
          primitive, a token system that retints in one place, and a CSS-only fallback for when the GPU
          path is unavailable.
        </p>
        <DemoBlock
          demo={{
            code: `import { GlassCard, LiquidButton } from '@liquefy-ui/react'

<GlassCard
  description="Press the button. The squash, the rebound, and the shine are all one spring."
  eyebrow="Material"
  title="Transparent, and still legible"
>
  <LiquidButton iconAfter={<ArrowRightIcon />}>Try it</LiquidButton>
</GlassCard>`,
            description: 'One card, one button — this is the whole surface API you need to start.',
            render: () => (
              <GlassCard
                description="Press the button. The squash, the rebound, and the shine are all one spring."
                eyebrow="Material"
                title="Transparent, and still legible"
              >
                <LiquidButton iconAfter={<ArrowRightIcon />}>Try it</LiquidButton>
              </GlassCard>
            ),
            title: 'The shape of it',
          }}
        />
      </Section>

      <Section id="material" title="The material">
        <p>
          A surface is three effects stacked in a deliberate order. Turning any of them off leaves
          something that still works:
        </p>
        <ol className="docs-prose__list">
          <li>
            <strong>The bezel lens.</strong> An SVG displacement filter, generated per surface from its
            size and radius, offsets the backdrop near the edge — so the border refracts rather than
            just blurring. This is the <code>lens</code> switch.
          </li>
          <li>
            <strong>The body.</strong> A small <code>backdrop-filter</code> blur with saturation and a
            brightness lift, plus the inset highlight and shade that read as thickness. Driven by{' '}
            <code>intensity</code> and by <code>transparency</code>.
          </li>
          <li>
            <strong>The shine.</strong> A WebGL pass that tracks the pointer and paints the specular
            sweep across the surface as it tilts. This is the <code>webgl</code> switch.
          </li>
        </ol>
        <p>
          Everything is expressed as <code>--lq-*</code> custom properties, which is why a theme flip
          costs no re-render: the values behind the <code>var()</code> references change and the
          compositor does the rest.
        </p>
      </Section>

      <Section id="motion" title="The motion">
        <p>
          Presses, hovers and value changes run through a spring rather than a CSS easing curve. A
          press squashes the surface along the axis you pushed, the release overshoots and settles, and
          a pointer near the edge pulls the surface a fraction towards it. Because it is a real spring,
          an interruption mid-flight resolves from wherever the surface currently is instead of
          snapping back to the start.
        </p>
        <p>
          The engine is roughly 2 KB before gzip and has no dependencies. It is a provider-level switch
          (<code>motion</code>) and a provider-level dial (<code>wobbliness</code>), so an app can turn
          it down globally without touching a component.{' '}
          <a className="text-link" href="#/docs/motion">Motion<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="packages" title="The packages">
        <GuideTable
          headers={['Package', 'What it holds', 'Depends on']}
          rows={[
            [
              <code>@liquefy-ui/react</code>,
              <>Components, the provider, the <code>styles</code> engine, the stylesheets.</>,
              <><code>@liquefy-ui/core</code>, <code>@base-ui/react</code></>,
            ],
            [
              <code>@liquefy-ui/core</code>,
              'The WebGL renderer, the lens filter, the spring engine, pointer tracking, tokens.',
              'Nothing at runtime.',
            ],
            [
              <code>@liquefy-ui/icons</code>,
              'Individually exported 24×24 rounded-stroke SVG icons.',
              'Nothing at runtime.',
            ],
            [
              <code>@liquefy-ui/mcp</code>,
              <>An MCP server that answers from the real exports, for coding agents.</>,
              'Nothing at runtime.',
            ],
          ]}
        />
        <p>
          React and React DOM are peer dependencies at <code>&gt;=18.2</code>; nothing bundles a copy of
          them. Both ESM and CJS builds carry their own type declarations, and releases are published from
          CI rather than from anyone&rsquo;s laptop.{' '}
          <a className="text-link" href="#/docs/installation">Install it<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="principles" title="Four decisions worth knowing">
        <ol className="docs-prose__list">
          <li>
            <strong>Transparency is the default, not an effect.</strong> Fills are transparent and the
            edge does the work. That is why contrast is tuned per theme rather than per component, and
            why <code>transparency={'{false}'}</code> exists as a first-class escape hatch.
          </li>
          <li>
            <strong>No visual variant zoo.</strong> There is no <code>variant=&quot;primary&quot;</code>{' '}
            on a button. Hierarchy comes from size, tint and placement, and anything else goes through
            the <code>styles</code> prop.
          </li>
          <li>
            <strong>Native semantics first.</strong> Dialogs are dialogs, switches carry{' '}
            <code>role=&quot;switch&quot;</code>, and the accessibility primitives come from Base UI
            rather than being reimplemented.
          </li>
          <li>
            <strong>Two ways in, no lock-in.</strong> Install from npm, or copy the real source out of
            the shadcn registry and own it.{' '}
            <a className="text-link" href="#/docs/ai-tooling">Distribution<ArrowRightIcon size={14} /></a>
          </li>
        </ol>
      </Section>

      <Section id="support" title="Browser support">
        <GuideTable
          headers={['Capability', 'Used for', 'Without it']}
          rows={[
            [
              <code>backdrop-filter</code>,
              'The blur and saturation of the glass body.',
              'Surfaces render as flat translucent fills with the same tokens and layout.',
            ],
            [
              'SVG filters',
              'The bezel displacement lens.',
              'The lens is skipped; the edge keeps its highlight and shade.',
            ],
            [
              'WebGL 2',
              'The pointer-tracked shine.',
              'The canvas is never created — no error, no layout shift.',
            ],
          ]}
        />
        <p>
          Each capability is detected, not assumed, and each degrades on its own. Modern Chrome, Safari
          and Firefox support all three; the fallbacks matter mostly for locked-down environments,
          server rendering, and test runners.
        </p>
        <Callout title="Server rendering is fine">
          Components are client components — they need refs and effects — but the published bundles
          carry the <code>&apos;use client&apos;</code> directive themselves, so importing them from a
          server component works without a wrapper file. The optics attach after hydration.{' '}
          <a className="text-link" href="#/docs/frameworks">Frameworks<ArrowRightIcon size={14} /></a>
        </Callout>
      </Section>

      <Section id="next" title="Where to go next">
        <LiquidSurface className="docs-next" radius={22} webgl={false}>
          <a href="#/docs/installation">
            <strong>Installation</strong>
            <span>Install, import the stylesheet, add the provider, render something.</span>
          </a>
          <a href="#/docs/theming">
            <strong>Theming</strong>
            <span>The token system, and how to make the material look like your brand.</span>
          </a>
          <a href="#/components">
            <strong>Components</strong>
            <span>Every primitive with live demos and a full prop table.</span>
          </a>
          <a href="#/playground">
            <strong>Playground</strong>
            <span><SparklesIcon size={14} /> Feel the material before you install anything.</span>
          </a>
        </LiquidSurface>
      </Section>
    </>
  ),
  slug: 'introduction',
  summary: 'The material, the motion, the packages, and the four decisions behind the API.',
}
