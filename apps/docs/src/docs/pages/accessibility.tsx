import { LiquidButton, LiquidIconButton, LiquidSwitch } from '@liquefy-ui/react'
import { SubProvider } from '../../site/site-config'
import { ArrowRightIcon, SettingsIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const accessibilityDoc: DocEntry = {
  description: 'What the components handle, what your app still has to decide, and the two switches that exist for contrast.',
  name: 'Accessibility',
  render: () => (
    <>
      <Section id="free" title="What you get without asking">
        <ul className="docs-prose__list">
          <li>
            <strong>Real semantics.</strong> Buttons are <code>&lt;button&gt;</code>, switches carry{' '}
            <code>role=&quot;switch&quot;</code> with <code>aria-checked</code>, progress bars carry{' '}
            <code>role=&quot;progressbar&quot;</code> with its value attributes, and the dialog is a
            native <code>&lt;dialog&gt;</code>.
          </li>
          <li>
            <strong>Base UI underneath the hard parts.</strong> Menu, Select, Tabs, Accordion, Dialog,
            Drawer and Tooltip are built on Base UI primitives, so focus trapping, roving tabindex,
            typeahead, dismissal and anchor positioning are handled by code whose only job is that.
          </li>
          <li>
            <strong>Focus that survives transparency.</strong> Every interactive surface has a{' '}
            <code>:focus-visible</code> treatment tuned per theme — it does not rely on the browser
            default outline, which disappears against glass.
          </li>
          <li>
            <strong>Disabled means disabled.</strong> The native attribute is set, the springs detach,
            and the pointer tracking stops, so a disabled control cannot be made to look alive.
          </li>
        </ul>
      </Section>

      <Section id="keyboard" title="Keyboard map">
        <GuideTable
          headers={['Component', 'Keys']}
          rows={[
            [<>Button, Icon button, Chip</>, <><kbd>Enter</kbd> / <kbd>Space</kbd> activate. Native behaviour, including form submission.</>],
            [<>Switch, Checkbox</>, <><kbd>Space</kbd> toggles.</>],
            [<>Radio group</>, <>Arrow keys move and select within the group; the group is one tab stop.</>],
            [<>Slider, Rating</>, <>Arrow keys step, <kbd>Home</kbd> / <kbd>End</kbd> jump to the ends.</>],
            [<>Tabs</>, <>Arrows move, <kbd>Home</kbd> / <kbd>End</kbd> jump; the panel is the next tab stop.</>],
            [<>Select, Menu</>, <><kbd>Enter</kbd> / <kbd>Space</kbd> / <kbd>↓</kbd> open, arrows move, typeahead jumps, <kbd>Esc</kbd> closes and returns focus to the trigger.</>],
            [<>Dialog, Drawer</>, <>Focus is trapped inside while open, <kbd>Esc</kbd> closes, and focus returns to whatever opened it.</>],
            [<>Accordion</>, <><kbd>Enter</kbd> / <kbd>Space</kbd> toggle the focused header.</>],
            [<>Tooltip</>, <>Shows on focus as well as hover, and <kbd>Esc</kbd> dismisses it.</>],
          ]}
        />
      </Section>

      <Section id="labels" title="Labels are not optional">
        <p>
          Anything that renders an icon and nothing else requires a name, and the API forces the issue:{' '}
          <code>LiquidIconButton</code> has a <strong>required</strong> <code>label</code> prop, and{' '}
          <code>DockItem</code> requires one too. Icons themselves are marked{' '}
          <code>aria-hidden</code> unless you give them an <code>aria-label</code>, which is what you want
          inside an already-labelled control.
        </p>
        <DemoBlock
          demo={{
            code: `{/* label is required — it becomes the accessible name */}
<LiquidIconButton label="Open settings"><SettingsIcon /></LiquidIconButton>

{/* Visible text already names this one, so the icon stays hidden */}
<LiquidButton iconBefore={<SettingsIcon />}>Settings</LiquidButton>

{/* Switches take a label even when it is only for assistive tech */}
<LiquidSwitch defaultChecked label="Email notifications" />`,
            description: 'Screen-reader output for these three, in order: “Open settings, button”, “Settings, button”, “Email notifications, switch, on”.',
            render: () => (
              <div className="stage-row">
                <LiquidIconButton label="Open settings"><SettingsIcon /></LiquidIconButton>
                <LiquidButton iconBefore={<SettingsIcon />}>Settings</LiquidButton>
                <LiquidSwitch defaultChecked label="Email notifications" />
              </div>
            ),
            title: 'Naming things',
          }}
        />
        <p>
          Fields work the other way round: <code>label</code> on <code>LiquidTextField</code>,{' '}
          <code>LiquidSelect</code> and friends renders visible text <em>and</em> wires up the
          association. Use <code>hint</code> for help text — it is linked with{' '}
          <code>aria-describedby</code> rather than left as a floating paragraph.
        </p>
      </Section>

      <Section id="contrast" title="Contrast over a transparent surface">
        <p>
          A translucent fill means text contrast depends on the backdrop, and no component can promise a
          ratio it does not control. Two switches exist for that, and both are provider props so a whole
          route can opt out:
        </p>
        <GuideTable
          headers={['Switch', 'Effect', 'When']}
          rows={[
            [<code>transparency={'{false}'}</code>, 'Opaque fills, no bezel lens. Contrast becomes a fixed, testable number.', 'Forms, tables, checkout — anywhere a number has to be right.'],
            [<code>intensity</code>, 'More blur and a brighter bezel, so the backdrop behind text turns to mush.', 'Marketing surfaces over photography, where you want to keep the effect.'],
          ]}
        />
        <DemoBlock
          demo={{
            code: `<LiquefyProvider transparency={false}>
  <LiquidButton>Opaque material</LiquidButton>
</LiquefyProvider>`,
            description: 'The same button with transparency off — same layout, same tokens, a fill you can measure.',
            render: () => (
              <div className="stage-row">
                <LiquidButton>Transparent (default)</LiquidButton>
                <SubProvider transparency={false}>
                  <LiquidButton>Opaque</LiquidButton>
                </SubProvider>
              </div>
            ),
            title: 'Opting out of transparency',
          }}
        />
      </Section>

      <Section id="preferences" title="OS preferences: wired by you, on purpose">
        <p>
          The components do not read <code>prefers-reduced-motion</code> or{' '}
          <code>prefers-reduced-transparency</code> by themselves. Both are single props, and mapping them
          is a handful of lines — but which way to map them is a product decision, and a library that
          silently made it would leave you no way to make it differently.
        </p>
        <CodeBlock
          code={`'use client'

import { LiquefyProvider } from '@liquefy-ui/react'
import { useEffect, useState } from 'react'

const watch = (query: string, set: (value: boolean) => void) => {
  const media = window.matchMedia(query)
  set(media.matches)
  const onChange = () => set(media.matches)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [reducedTransparency, setReducedTransparency] = useState(false)

  useEffect(() => watch('(prefers-reduced-motion: reduce)', setReducedMotion), [])
  useEffect(() => watch('(prefers-reduced-transparency: reduce)', setReducedTransparency), [])

  return (
    <LiquefyProvider motion={!reducedMotion} transparency={!reducedTransparency}>
      {children}
    </LiquefyProvider>
  )
}`}
        />
        <Callout title="Do this once, at the root">
          Because both are inherited through context, wiring them at the provider covers every component
          in the tree — including ones added later, and ones from the registry copy.
        </Callout>
      </Section>

      <Section id="testing" title="Testing it">
        <p>
          The components render fine under jsdom; the optics simply do not attach, because there is no
          WebGL context and no layout to measure. Nothing throws. If canvas noise in snapshots bothers
          you, turn the shader off for the test tree:
        </p>
        <CodeBlock
          code={`import { render } from '@testing-library/react'
import { LiquefyProvider } from '@liquefy-ui/react'

const renderUI = (ui: React.ReactNode) =>
  render(<LiquefyProvider motion={false} theme="light" webgl={false}>{ui}</LiquefyProvider>)

test('the switch announces its state', async () => {
  const { getByRole } = renderUI(<LiquidSwitch label="Refraction" />)
  expect(getByRole('switch')).toHaveAttribute('aria-checked', 'false')
})`}
        />
        <p>
          Query by role and accessible name rather than by class — the class names are part of the
          material, and the roles are the contract.
        </p>
      </Section>

      <Section id="limits" title="What is still yours to get right">
        <ul className="docs-prose__list">
          <li>Heading order, landmarks, and page titles. The library ships no page structure.</li>
          <li>
            Error messaging on forms. There is no <code>invalid</code> prop: fields forward native
            attributes, so pass <code>aria-invalid</code> and a <code>hint</code> yourself — the{' '}
            <code>styles</code> prop&rsquo;s <code>_invalid</code> key matches either one.
          </li>
          <li>Backdrop choice. Glass over a high-frequency photograph will fight your text no matter how the material is tuned.</li>
          <li>
            Announcing async results. Toasts render in a live region, but whether a save was successful is
            something only your app knows.{' '}
            <a className="text-link" href="#/components/toast">Toast<ArrowRightIcon size={14} /></a>
          </li>
        </ul>
      </Section>
    </>
  ),
  slug: 'accessibility',
  summary: 'Semantics, the keyboard map, required labels, contrast switches, and OS preferences.',
}
