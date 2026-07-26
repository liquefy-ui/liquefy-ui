import { GlassCard, LiquidButton } from '@liquefy-ui/react'
import { SubProvider } from '../../site/site-config'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry, PropRow } from '../types'

const propRows: PropRow[] = [
  {
    defaultValue: "'system'",
    description: 'dark, light, or system. system reads prefers-color-scheme in CSS, so it needs no JavaScript and no hydration guard.',
    name: 'theme',
    type: "'dark' | 'light' | 'system'",
  },
  {
    defaultValue: "'#8eb9ff'",
    description: 'The accent every surface tints against. Written out as --lq-accent, so a change costs no re-render of the components below.',
    name: 'tint',
    type: 'string',
  },
  {
    defaultValue: '0.72',
    description: 'Optical strength of the material: blur, saturation, and the brightness of the bezel. Useful range is roughly 0.2 to 1.2.',
    name: 'intensity',
    type: 'number',
  },
  {
    defaultValue: '1',
    description: 'How loose the springs feel. 0 keeps the transitions but removes the overshoot; values above 1 exaggerate it. Clamped to 1.5.',
    name: 'wobbliness',
    type: 'number',
  },
  {
    defaultValue: 'true',
    description: 'Master switch for the spring physics. Off leaves plain CSS transitions, so state changes are still visible.',
    name: 'motion',
    type: 'boolean',
  },
  {
    defaultValue: 'true',
    description: 'Off swaps translucent fills for opaque ones and disables the bezel lens — the contrast escape hatch.',
    name: 'transparency',
    type: 'boolean',
  },
  {
    defaultValue: 'true',
    description: 'The WebGL shine pass. Off falls back to CSS-only glass with no canvas element created at all.',
    name: 'webgl',
    type: 'boolean',
  },
  {
    defaultValue: 'true',
    description: 'The SVG displacement lens at the bezel. Off keeps the blur but drops the refraction.',
    name: 'lens',
    type: 'boolean',
  },
  {
    defaultValue: '4',
    description: 'One spacing unit, as a number of pixels or any CSS length. styles={{ p: 3 }} resolves to three of these.',
    name: 'spacing',
    type: 'number | string',
  },
  {
    defaultValue: '{ sm: 640, md: 768, lg: 1024, xl: 1280 }',
    description: 'Minimum widths behind the responsive form of the styles prop. Partial objects merge with the defaults.',
    name: 'breakpoints',
    type: 'Partial<LiquefyBreakpoints>',
  },
  {
    description: 'Added to the provider element, which is a real div in the DOM — useful for layout or for scoping your own CSS.',
    name: 'className',
    type: 'string',
  },
]

export const providerDoc: DocEntry = {
  description: 'The one component every tree needs: its props, the attributes it writes, and how to nest it.',
  name: 'Provider',
  render: () => (
    <>
      <Section id="why" title="Why it is required">
        <p>
          <code>LiquefyProvider</code> does three things that nothing else can: it writes the token
          custom properties onto a real DOM element, it carries the material config through React
          context, and it hosts the portal container that popovers render into. A component outside a
          provider gets default context values and no tokens, which is why it looks unstyled even with
          the stylesheet loaded.
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
      </Section>

      <Section id="props" title="Props">
        <div className="docs-props">
          <div className="docs-props__scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {propRows.map((prop) => (
                  <tr key={prop.name}>
                    <td><code>{prop.name}</code></td>
                    <td><code className="docs-props__type">{prop.type}</code></td>
                    <td>{prop.defaultValue ? <code>{prop.defaultValue}</code> : <span className="docs-props__dash">—</span>}</td>
                    <td>{prop.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p>
          Every one of these is also available per component. <code>LiquidSurface</code> and the
          components built on it accept <code>intensity</code>, <code>lens</code>, <code>tint</code> and{' '}
          <code>webgl</code> directly, and a component-level value wins over the provider — which is how
          you keep a heavy list cheap without changing the rest of the page.
        </p>
      </Section>

      <Section id="theme" title="Following the system, and letting people choose">
        <p>
          <code>theme=&quot;system&quot;</code> is resolved in CSS. That means no flash, no hydration
          mismatch, and no effect — prefer it whenever the app has no theme switcher of its own.
        </p>
        <p>
          A switcher needs state, and the useful shape is: follow the OS until the visitor picks
          something, then remember the pick. This site does exactly that.
        </p>
        <CodeBlock
          code={`'use client'

import { LiquefyProvider, type LiquefyTheme } from '@liquefy-ui/react'
import { useEffect, useState } from 'react'

const QUERY = '(prefers-color-scheme: dark)'

export const ThemedApp = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<LiquefyTheme>('system')
  const [chosen, setChosen] = useState(false)

  // Only subscribe while still following the OS.
  useEffect(() => {
    if (chosen) return
    const media = window.matchMedia(QUERY)
    const onChange = () => setTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [chosen])

  const choose = (next: LiquefyTheme) => {
    setTheme(next)
    setChosen(true)
    localStorage.setItem('theme', next)
  }

  return <LiquefyProvider theme={theme}>{children}</LiquefyProvider>
}`}
        />
        <Callout title="The page background is yours">
          The provider styles its own subtree, not <code>&lt;body&gt;</code>. Set the page background
          from the same theme value — otherwise a dark app sits on a white page and the glass has
          nothing interesting to refract.
        </Callout>
      </Section>

      <Section id="nesting" title="Nesting providers">
        <p>
          Providers nest, which is how a region gets its own material — a marketing hero with a
          stronger tint, a data-dense panel with the shader off. There is one sharp edge:{' '}
          <strong>a nested provider does not inherit from the one above it.</strong> Every prop it does
          not set falls back to the library default, so a bare{' '}
          <code>&lt;LiquefyProvider webgl={'{false}'}&gt;</code> inside a themed app also resets the tint,
          the intensity and the spacing scale.
        </p>
        <p>
          Wrapping it once with <code>useLiquefyConfig</code> gives you the inheriting version, and that
          is the component worth having in your own codebase:
        </p>
        <CodeBlock
          code={`import { LiquefyProvider, useLiquefyConfig, type LiquefyProviderProps } from '@liquefy-ui/react'
import type { ReactNode } from 'react'

type SubProviderProps = Partial<Omit<LiquefyProviderProps, 'children'>> & { children: ReactNode }

/** Keeps the surrounding material; replaces only what it is handed. */
export const SubProvider = ({ children, ...overrides }: SubProviderProps) => {
  const config = useLiquefyConfig()
  return <LiquefyProvider {...config} {...overrides}>{children}</LiquefyProvider>
}`}
        />
        <DemoBlock
          demo={{
            code: `<SubProvider tint="#5ccfae" wobbliness={1.6}>
  <GlassCard title="Inner material">Mint, and looser springs.</GlassCard>
</SubProvider>`,
            description: 'The inner card keeps the theme, intensity and spacing of the page and changes only the tint and the wobble. The components index on this site uses the same wrapper to turn the shader off for a gallery of thirty-three previews.',
            render: () => (
              <div className="stage-row stage-row--wrap">
                <GlassCard styles={{ maxW: 280 }} title="Outer material">
                  <LiquidButton>Inherited tint</LiquidButton>
                </GlassCard>
                <SubProvider tint="#5ccfae" wobbliness={1.6}>
                  <GlassCard styles={{ maxW: 280 }} title="Inner material">
                    <LiquidButton>Mint, looser springs</LiquidButton>
                  </GlassCard>
                </SubProvider>
              </div>
            ),
            title: 'A subtree with its own material',
            stageMinHeight: 220,
          }}
        />
        <p>
          Each provider renders a <code>div.lq-provider</code>, so a nested one is a real element in the
          layout. Give it a <code>className</code> if it needs to participate in a grid.
        </p>
      </Section>

      <Section id="reading" title="Reading the config">
        <p>
          <code>useLiquefyConfig</code> returns the resolved configuration, which is what you want when
          a component of yours has to make the same decisions the built-ins do.
        </p>
        <CodeBlock
          code={`import { useLiquefyConfig } from '@liquefy-ui/react'

export const Chart = () => {
  const { motion, tint, transparency } = useLiquefyConfig()

  return (
    <svg>
      <path fill={transparency ? \`\${tint}22\` : tint} />
      {motion && <animate attributeName="opacity" dur="600ms" />}
    </svg>
  )
}`}
        />
      </Section>

      <Section id="dom" title="What it writes to the DOM">
        <GuideTable
          headers={['Written', 'Value', 'Why it is there']}
          rows={[
            [<code>data-liquid-theme</code>, <><code>dark</code> / <code>light</code> / <code>system</code></>, 'The selector every themed token is scoped to, and what the styles prop’s _dark and _light keys hook into.'],
            [<code>data-liquid-motion</code>, <><code>on</code> / <code>off</code></>, 'Lets CSS opt out of transitions in the same breath as the springs.'],
            [<code>data-liquid-transparency</code>, <><code>on</code> / <code>off</code></>, 'Switches the fill set between translucent and opaque.'],
            [<code>--lq-accent</code>, 'the tint', 'Read by every surface, control and focus ring.'],
            [<code>--lq-intensity</code>, 'the intensity', 'Scales blur, saturation and bezel brightness.'],
            [<code>--lq-space</code>, 'the spacing unit', <>The unit behind <code>p</code>, <code>m</code>, <code>gap</code> and friends.</>],
            [<code>div.lq-portal</code>, 'an empty node', 'Where Select, Menu and Tooltip popovers mount, so they stay inside the provider and inherit the tokens.'],
          ]}
        />
        <Callout title="Portals stay inside the provider" tone="note">
          Popovers deliberately do not portal to <code>document.body</code>. If they did, they would land
          outside the element carrying the custom properties and render with no fill and no shadow. Keep
          that in mind if you portal something of your own into a liquefy surface.
        </Callout>
      </Section>

      <Section id="ssr" title="Server rendering">
        <p>
          The provider itself renders on the server without complaint: the tokens are inline styles and
          the theme attribute is static markup. Only the optics need a browser, and they attach after
          hydration.
        </p>
        <p>
          If you render to a string yourself and use conditional <code>styles</code> values, flush the
          collected rules into the document head.{' '}
          <a className="text-link" href="#/docs/styles-prop">Details<ArrowRightIcon size={14} /></a>
        </p>
      </Section>
    </>
  ),
  slug: 'provider',
  summary: 'Every LiquefyProvider prop, nesting, useLiquefyConfig, and the attributes it writes.',
}
