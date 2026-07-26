import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const frameworksDoc: DocEntry = {
  description: 'Next.js App Router and the client boundary, Vite, Remix, and what changes when you copy the source.',
  name: 'Frameworks',
  render: () => (
    <>
      <Section id="rsc" title="Next.js and React Server Components">
        <p>
          Every component in this library reaches for state, refs or the WebGL lens, so the whole package
          sits on the client side of a Server Components boundary. The published bundles carry a{' '}
          <code>&apos;use client&apos;</code> directive, which means you can import them straight into a
          server component and Next.js will draw the boundary for you — no wrapper file, no re-export
          shim.
        </p>
        <CodeBlock
          code={`// app/page.tsx — a server component, no 'use client' here
import { GlassCard, LiquidButton, LiquefyProvider } from '@liquefy-ui/react'

export default function Page() {
  return (
    <LiquefyProvider theme="system" tint="#8b8f98">
      <GlassCard title="Server rendered">
        <LiquidButton>Create magic</LiquidButton>
      </GlassCard>
    </LiquefyProvider>
  )
}`}
        />
        <p>
          The stylesheet is a normal CSS import, so it belongs in the root layout — once, for the whole
          app.
        </p>
        <CodeBlock
          code={`// app/layout.tsx
import '@liquefy-ui/react/styles.css'`}
        />
        <p>
          There is a working App Router example in the repository under <code>apps/next-example</code>,
          and its build runs in CI. If the client boundary ever regresses, that build fails rather than
          yours.
        </p>
      </Section>

      <Section id="boundary" title="Where the boundary actually falls">
        <p>
          Event handlers are the one thing the boundary will not carry: a function cannot cross from a
          server component into a client one. Anything with an <code>onClick</code>,{' '}
          <code>onValueChange</code> or local state belongs in its own client component.
        </p>
        <CodeBlock
          code={`// app/material-picker.tsx
'use client'

import { LiquidSelect } from '@liquefy-ui/react'
import { useState } from 'react'

const options = [
  { label: 'Clear', value: 'clear' },
  { label: 'Regular', value: 'regular' },
]

export const MaterialPicker = () => {
  const [material, setMaterial] = useState('clear')
  return <LiquidSelect label="Material" onValueChange={setMaterial} options={options} value={material} />
}`}
        />
        <GuideTable
          headers={['In a server component', 'Verdict']}
          rows={[
            [<>Rendering <code>LiquidButton</code>, <code>GlassCard</code>, <code>LiquidSurface</code> with static content</>, 'Fine. The directive draws the boundary for you.'],
            [<>Passing <code>onClick</code>, <code>onValueChange</code>, or any function</>, <>Not allowed by RSC. Move that subtree into a <code>&apos;use client&apos;</code> file.</>],
            [<>Wrapping the app in <code>LiquefyProvider</code></>, <>Fine with static props. It becomes a client boundary the moment you compute the theme in a hook.</>],
            [<>Reading <code>useLiquefyConfig</code></>, <>Client only — it is context.</>],
          ]}
        />
        <Callout title="The provider is a good boundary" tone="note">
          If your app has a theme switcher, the provider already needs state. Put it in a{' '}
          <code>&apos;use client&apos;</code> shell component that the server layout renders, and
          everything below inherits the boundary without each page thinking about it.{' '}
          <a className="text-link" href="#/docs/provider">Provider patterns<ArrowRightIcon size={14} /></a>
        </Callout>
      </Section>

      <Section id="vite" title="Vite, Remix, React Router">
        <p>
          Nothing here is Next-specific beyond the boundary discussion. In a client-rendered app, import{' '}
          <code>styles.css</code> (or <code>tailwind.css</code>), wrap the tree in{' '}
          <code>LiquefyProvider</code>, and the <code>&apos;use client&apos;</code> directive is simply
          ignored — it is a comment to a bundler that has no server components. This documentation site
          is a Vite app doing exactly that.
        </p>
        <CodeBlock
          code={`// src/main.tsx
import { LiquefyProvider } from '@liquefy-ui/react'
import '@liquefy-ui/react/styles.css'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <LiquefyProvider theme="system">
    <App />
  </LiquefyProvider>,
)`}
        />
        <p>
          Remix and React Router server-render the markup; the optics attach on hydration, exactly as
          they do in Next.js. No <code>ssr: false</code>, no dynamic import, no{' '}
          <code>typeof window</code> guards.
        </p>
      </Section>

      <Section id="ssr" title="What happens during server rendering">
        <GuideTable
          headers={['Piece', 'On the server', 'After hydration']}
          rows={[
            ['Markup and tokens', 'Fully rendered — the provider’s custom properties are inline styles.', 'Unchanged.'],
            ['The bezel lens', 'Not created. It needs the element’s measured size.', 'Attaches on mount.'],
            ['The WebGL shine', 'Not created; no canvas in the HTML.', 'Canvas is added if the context is available.'],
            [<>Conditional <code>styles</code> rules</>, <>Collected, not inserted — <code>useInsertionEffect</code> does not run.</>, <>Inserted. For hand-rolled SSR, flush them with <code>getLiquefyStyleSheet()</code>.</>],
          ]}
        />
        <p>
          Because the material is CSS and the physics are progressive enhancement, there is no layout
          shift between the server HTML and the hydrated result.
        </p>
      </Section>

      <Section id="testing" title="Tests and other DOM-less environments">
        <p>
          Under jsdom or Vitest&rsquo;s DOM environment the components render and behave; the optics stay
          detached because there is no WebGL context. Nothing throws, and nothing needs mocking. Turning
          the shader off keeps snapshots free of canvas elements:
        </p>
        <CodeBlock
          code={`const renderUI = (ui: React.ReactNode) =>
  render(<LiquefyProvider motion={false} theme="light" webgl={false}>{ui}</LiquefyProvider>)`}
        />
      </Section>

      <Section id="copied" title="If you copy the source">
        <p>
          The <code>&apos;use client&apos;</code> directive is added when the package is built rather than
          written in the source files. The registry generator adds it to every file it emits, so{' '}
          <code>npx shadcn add</code> gives you RSC-ready source. Source you copy by hand out of the
          repository does not have it, and most of these files hold state — the provider and{' '}
          <code>use-liquid-glass</code> certainly do.
        </p>
        <p>
          The copied tree deliberately does not depend on <code>@liquefy-ui/react</code>: it keeps{' '}
          <code>@liquefy-ui/core</code> for the optics and <code>@base-ui/react</code> for the
          accessibility primitives, and brings its own stylesheet. Otherwise a project ends up with a
          copied provider and the packaged one fighting over the same React context.{' '}
          <a className="text-link" href="#/docs/ai-tooling">Registry details<ArrowRightIcon size={14} /></a>
        </p>
      </Section>
    </>
  ),
  slug: 'frameworks',
  summary: 'The RSC client boundary, Next.js, Vite, Remix, SSR behaviour, and copied source.',
}
