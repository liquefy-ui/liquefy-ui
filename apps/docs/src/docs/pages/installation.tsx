import { LiquidButton, LiquidSwitch, LiquidTextField } from '@liquefy-ui/react'
import { ArrowRightIcon, SearchIcon, SparklesIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const installationDoc: DocEntry = {
  description: 'From an empty project to a working surface, and the four mistakes that cost the most time.',
  name: 'Installation',
  render: () => (
    <>
      <Section id="install" title="Install">
        <p>
          Three packages, and only the first is mandatory. <code>core</code> comes along as a dependency
          of <code>react</code>; install it explicitly only if you use the engine directly. The icon
          package is optional.
        </p>
        <CodeBlock
          code={`pnpm add @liquefy-ui/react @liquefy-ui/core @liquefy-ui/icons
# npm i / yarn add / bun add all work the same way`}
        />
        <GuideTable
          headers={['Requirement', 'Version']}
          rows={[
            ['React / React DOM', <><code>&gt;=18.2</code> as a peer dependency; tested against 19.</>],
            ['Node (for the build)', <code>&gt;=20.19</code>],
            ['Module formats', <>ESM and CJS, each with its own <code>.d.ts</code></>],
          ]}
        />
      </Section>

      <Section id="stylesheet" title="Import the stylesheet — once">
        <p>
          The components read every colour, radius and timing from custom properties that live in the
          package stylesheet. Without it you get unstyled markup, so this import is the single most
          common thing to forget.
        </p>
        <CodeBlock code={`import '@liquefy-ui/react/styles.css'`} title="Plain projects" />
        <p>
          If the project uses Tailwind CSS v4, import <code>tailwind.css</code> instead and put it{' '}
          <em>before</em> Tailwind. It pulls in the same base styles, declares the cascade layer order
          so utilities win, and bridges the tokens into Tailwind&rsquo;s theme.
        </p>
        <CodeBlock
          code={`/* app/globals.css — the order matters */
@import '@liquefy-ui/react/tailwind.css';
@import 'tailwindcss';`}
          title="With Tailwind v4"
        />
        <p>
          <a className="text-link" href="#/docs/tailwind">Why the order matters<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="provider" title="Wrap the tree in a provider">
        <p>
          <code>LiquefyProvider</code> writes the token custom properties and carries the material
          config down through context. Components read it, so a surface rendered outside a provider has
          no tint, no spacing scale, and no theme.
        </p>
        <CodeBlock
          code={`import { LiquefyProvider } from '@liquefy-ui/react'
import '@liquefy-ui/react/styles.css'

export const App = () => (
  <LiquefyProvider theme="system" tint="#8b8f98">
    <YourApp />
  </LiquefyProvider>
)`}
        />
        <p>
          One provider at the root is the normal setup. <code>theme=&quot;system&quot;</code> follows the
          OS colour scheme through <code>prefers-color-scheme</code> with no JavaScript of your own.{' '}
          <a className="text-link" href="#/docs/provider">Every provider prop<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="first" title="Render something">
        <p>
          Components are named <code>LiquidX</code> and imported from the package root — there are no
          deep paths and no barrel-per-component.
        </p>
        <DemoBlock
          demo={{
            code: `import { LiquidButton, LiquidSwitch, LiquidTextField } from '@liquefy-ui/react'
import { SearchIcon, SparklesIcon } from '@liquefy-ui/icons'

<LiquidTextField
  label="Search components"
  placeholder="Try “button”"
  startAdornment={<SearchIcon size={18} />}
/>
<LiquidButton iconBefore={<SparklesIcon />}>Create magic</LiquidButton>
<LiquidSwitch defaultChecked label="Refraction" />`,
            description: 'If this looks like glass and squashes when pressed, the stylesheet and the provider are both wired up.',
            render: () => (
              <div className="stage-stack">
                <LiquidTextField
                  label="Search components"
                  placeholder="Try “button”"
                  startAdornment={<SearchIcon size={18} />}
                />
                <div className="stage-row">
                  <LiquidButton iconBefore={<SparklesIcon />}>Create magic</LiquidButton>
                  <LiquidSwitch defaultChecked label="Refraction" />
                </div>
              </div>
            ),
            title: 'Your first surface',
          }}
        />
      </Section>

      <Section id="mistakes" title="The four things that go wrong first">
        <GuideTable
          headers={['Symptom', 'Cause']}
          rows={[
            [
              'Markup renders, but nothing looks like glass.',
              <>The stylesheet was never imported, or it is imported inside a component that is code-split away from the surface.</>,
            ],
            [
              'No tint, no spacing, dark text on dark.',
              <>The tree is not inside a <code>LiquefyProvider</code>.</>,
            ],
            [
              <><code>className=&quot;p-0&quot;</code> does nothing.</>,
              <>Tailwind is imported before <code>tailwind.css</code>, so the layer order puts component styles on top.</>,
            ],
            [
              'Next.js complains about passing a function to a client component.',
              <>An <code>onClick</code> is being written in a server component. Move that piece into its own <code>&apos;use client&apos;</code> file.</>,
            ],
          ]}
        />
        <p>
          <a className="text-link" href="#/docs/troubleshooting">The longer list<ArrowRightIcon size={14} /></a>
        </p>
      </Section>

      <Section id="typescript" title="TypeScript">
        <p>
          Everything is typed, including the <code>styles</code> prop and the token names it accepts.
          Component prop types are exported next to their components, so wrapping one keeps its
          signature honest.
        </p>
        <CodeBlock
          code={`import { LiquidButton, type LiquidButtonProps } from '@liquefy-ui/react'

export const SubmitButton = (props: Omit<LiquidButtonProps, 'type'>) => (
  <LiquidButton {...props} type="submit" />
)`}
        />
        <p>
          Both <code>.d.mts</code> and <code>.d.cts</code> ship, so editor hints work under{' '}
          <code>node</code>, <code>node16</code> and <code>bundler</code> module resolution alike.
        </p>
      </Section>

      <Section id="registry" title="Without npm: copy the source">
        <p>
          Every component is also published as a shadcn registry item. The CLI copies the real
          implementation into your project, rewrites imports to the standard aliases, and pulls in
          whatever that component depends on — the surface it builds on, the styles engine, the
          provider, and the base item carrying the stylesheet.
        </p>
        <CodeBlock code={`npx shadcn@latest add @liquefy-ui/liquid-button`} />
        <p>
          The <code>@liquefy-ui</code> namespace is registered in shadcn&apos;s registry directory, so
          that resolves with nothing added to your <code>components.json</code>. It points at{' '}
          <code>https://liquefy-ui.com/r/liquid-button.json</code>, which you can still pass directly
          if your CLI predates the directory.
        </p>
        <Callout title="What the registry hands you">
          Real source, with imports rewritten to <code>@/components/ui</code>, <code>@/lib</code> and{' '}
          <code>@/hooks</code>, a <code>&apos;use client&apos;</code> directive already at the top of every
          file, and a <code>docs</code> note on each item reminding you to import the copied stylesheet
          and add the provider.{' '}
          <a className="text-link" href="#/docs/ai-tooling">Registry details<ArrowRightIcon size={14} /></a>
        </Callout>
      </Section>

      <Section id="next" title="Next">
        <p>
          Set up the provider properly next, or jump straight to the material.{' '}
          <a className="text-link" href="#/docs/provider">Provider<ArrowRightIcon size={14} /></a>{' '}
          <a className="text-link" href="#/docs/theming">Theming<ArrowRightIcon size={14} /></a>{' '}
          <a className="text-link" href="#/components">Components<ArrowRightIcon size={14} /></a>
        </p>
      </Section>
    </>
  ),
  slug: 'installation',
  summary: 'Install, import the stylesheet, add the provider, render your first surface.',
}
