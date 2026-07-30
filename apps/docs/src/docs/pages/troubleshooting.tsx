import { ArrowRightIcon } from '@liquefy-ui/icons'
import { CodeBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const troubleshootingDoc: DocEntry = {
  description: 'The failures people actually hit, in the order they hit them, with the fix for each.',
  name: 'Troubleshooting',
  render: () => (
    <>
      <Section id="unstyled" title="It renders, but nothing looks like glass">
        <p>
          Almost always the stylesheet. The components carry class names and custom properties but no
          rules of their own, so without the CSS you get semantic, unstyled markup.
        </p>
        <CodeBlock
          code={`// Once, at the entry point — not inside a lazily loaded component
import '@liquefy-ui/react/styles.css'`}
        />
        <p>
          If you are on Tailwind, it is <code>tailwind.css</code> instead — and only that one.{' '}
          <a className="text-link" href="#/docs/tailwind">Tailwind<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="no-provider" title="No tint, no spacing, unreadable text">
        <p>
          The tree is not inside a <code>LiquefyProvider</code>. The provider writes{' '}
          <code>--lq-accent</code>, <code>--lq-space</code> and the theme attribute that every themed token
          is scoped to; without it components fall back to context defaults and inherit whatever colour
          the page happens to have.
        </p>
        <p>
          This also happens in tests and in Storybook, where it is easy to render a component in
          isolation. Wrap the render helper once.{' '}
          <a className="text-link" href="#/docs/provider">Provider<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="utilities" title="A Tailwind utility does nothing">
        <p>
          <code>className=&quot;p-0&quot;</code> is being outranked by the component&rsquo;s own rule, which
          means the cascade layers were declared in the wrong order. Import{' '}
          <code>@liquefy-ui/react/tailwind.css</code> <em>before</em> <code>tailwindcss</code>, and do not
          also import <code>styles.css</code> — the second copy lands unlayered and beats your utilities
          all over again.
        </p>
        <CodeBlock
          code={`/* Correct */
@import '@liquefy-ui/react/tailwind.css';
@import 'tailwindcss';`}
        />
      </Section>

      <Section id="rsc" title="“Functions cannot be passed directly to Client Components”">
        <p>
          A handler is being written in a server component. The library&rsquo;s bundles carry{' '}
          <code>&apos;use client&apos;</code>, so rendering a component from the server is fine — passing it a
          function is not. Move that piece into its own client file.
        </p>
        <CodeBlock
          code={`// app/save-button.tsx
'use client'

import { LiquidButton } from '@liquefy-ui/react'

export const SaveButton = ({ onSave }: { onSave: () => void }) => (
  <LiquidButton onClick={onSave}>Save</LiquidButton>
)`}
        />
        <p>
          <a className="text-link" href="#/docs/frameworks">Where the boundary falls<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="portals" title="A Select or Menu popover renders with no fill">
        <p>
          Popovers mount into the provider&rsquo;s own portal node rather than <code>document.body</code>,
          precisely so they stay inside the element carrying the tokens. If you have re-parented the
          popover — a custom portal, a modal library, a <code>overflow: hidden</code> ancestor that clips
          it — it has left the token scope.
        </p>
        <p>
          The fix is to let the component portal itself. If you must portal into your own container, put
          that container inside the provider subtree.
        </p>
      </Section>

      <Section id="transform" title="A styles override is ignored">
        <GuideTable
          headers={['Property', 'Why', 'Instead']}
          rows={[
            [<><code>transform</code></>, 'The springs write it inline on every frame.', 'Wrap the component in your own element and transform that.'],
            [<><code>backdropFilter</code></>, 'The lens filter writes it inline.', <>Tune <code>intensity</code>, or turn <code>lens</code> off and set your own.</>],
            [<><code>borderRadius</code></>, <>The surface animates <code>--lq-radius</code> during a press.</>, <>Use the <code>radius</code> prop or the <code>radius</code> key in <code>styles</code>.</>],
          ]}
        />
        <p>
          Development builds warn in the console when a <code>styles</code> object declares one of the
          first two.{' '}
          <a className="text-link" href="#/docs/styles-prop">Precedence rules<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="hover" title="A state style never applies">
        <p>
          Two usual causes. First, a raw selector without its prefix: keys must start with{' '}
          <code>&amp;</code> for selectors and <code>@</code> for at-rules, so{' '}
          <code>{"':hover'"}</code> is not a valid key but <code>{"'&:hover'"}</code> is — use{' '}
          <code>_hover</code> and skip the question. Second, an inline <code>style</code> attribute on the
          same element: <code>style</code> deliberately outranks <code>styles</code>, so a value set there
          wins in every state.
        </p>
      </Section>

      <Section id="theme-flash" title="The theme flashes on first paint">
        <p>
          You are computing the theme in JavaScript. With <code>theme=&quot;system&quot;</code> the choice
          is resolved in CSS through <code>prefers-color-scheme</code> and there is nothing to flash. If
          you support a stored preference, either accept the flash, or write the theme onto the document
          element in a blocking inline script before hydration and read it from there.
        </p>
        <CodeBlock
          code={`<!-- In <head>, before the app bundle -->
<script>
  // A stored 'system' is not a colour: it means "ask the OS", same as no value.
  var stored = localStorage.getItem('theme')
  document.documentElement.dataset.theme =
    stored === 'dark' || stored === 'light'
      ? stored
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
</script>`}
        />
      </Section>

      <Section id="jsdom" title="Tests: no canvas, no measurements">
        <p>
          Expected. jsdom has no WebGL context and no layout, so the shine and the lens never attach —
          without throwing. Assert on roles, names and states rather than on the material, and render the
          tree with the optics off to keep snapshots stable.
        </p>
        <CodeBlock
          code={`render(
  <LiquefyProvider motion={false} theme="light" webgl={false}>
    <LiquidSwitch label="Refraction" />
  </LiquefyProvider>,
)`}
        />
      </Section>

      <Section id="copied" title="Copied source throws about hooks or context">
        <p>
          Two known shapes. Either the copied files are missing their{' '}
          <code>&apos;use client&apos;</code> directive — it is added at build time, not written in the source
          — or both the copied provider and the packaged <code>@liquefy-ui/react</code> are in the tree,
          each with its own React context. Pick one and remove the other.{' '}
          <a className="text-link" href="#/docs/ai-tooling">Registry notes<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="ask" title="Still stuck">
        <p>
          The MCP server answers questions about the real exports, and <code>/llms-full.txt</code> contains
          every exported type declaration — both are faster than reading the source. If it looks like a
          bug in the library rather than in the wiring, the repository issue tracker is the place.{' '}
          <a className="text-link" href="#/docs/ai-tooling">AI tooling<ArrowRightIcon size={14} /></a>
        </p>
      </Section>
    </>
  ),
  slug: 'troubleshooting',
  summary: 'Unstyled output, layer order, RSC handlers, portals, ignored overrides, theme flash, tests.',
}
