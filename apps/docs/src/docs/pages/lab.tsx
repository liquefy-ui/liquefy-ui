import { useState } from 'react'
import { ArrowRightIcon, CalendarIcon, FileTextIcon, ImageIcon, MailIcon, PlusIcon } from '@liquefy-ui/icons'
import { DropletMenu, type DropletPlacement } from '@liquefy-ui/lab'
import { LiquidSegmented, LiquidSlider } from '@liquefy-ui/react'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

/** Three of the nine placements: a ring, one side, and the quarter arc a corner button wants. */
const PLACEMENTS = [
  { label: 'Around', value: 'around' },
  { label: 'Top', value: 'top' },
  { label: 'Top-left', value: 'top-left' },
] as const satisfies readonly { label: string; value: DropletPlacement }[]

const DEFAULT_STAGGER = 120

/** The smallest complete setup. Exported, like the demo's source, for the docs test. */
export const labUsage = `import { FileTextIcon, ImageIcon, PlusIcon } from '@liquefy-ui/icons'
import { DropletMenu } from '@liquefy-ui/lab'
import { LiquefyProvider } from '@liquefy-ui/react'
import '@liquefy-ui/react/styles.css'

export const App = () => (
  <LiquefyProvider>
    <DropletMenu
      icon={<PlusIcon size={24} />}
      items={[
        { icon: <ImageIcon size={20} />, label: 'Photo' },
        { icon: <FileTextIcon size={20} />, label: 'Note' },
      ]}
      label="Create"
    />
  </LiquefyProvider>
)`

const ITEMS = [
  { icon: <ImageIcon size={20} />, label: 'Photo' },
  { icon: <FileTextIcon size={20} />, label: 'Note' },
  { icon: <CalendarIcon size={20} />, label: 'Event' },
  { icon: <MailIcon size={20} />, label: 'Message' },
]

/**
 * The demo's source as it stands, so the code under it is always the menu above
 * it. Props at their default are left out, the way they would be in an app.
 * Exported for the docs test, which checks every name it imports is real.
 */
export const dropletMenuCode = (placement: DropletPlacement, stagger: number): string => {
  const props = [
    `icon={<PlusIcon size={24} />}`,
    `iconTurn={45}`,
    `items={[
      { icon: <ImageIcon size={20} />, label: 'Photo', onSelect: () => onCreate('photo') },
      { icon: <FileTextIcon size={20} />, label: 'Note', onSelect: () => onCreate('note') },
      { icon: <CalendarIcon size={20} />, label: 'Event', onSelect: () => onCreate('event') },
      { icon: <MailIcon size={20} />, label: 'Message', onSelect: () => onCreate('message') },
    ]}`,
    `label="Create"`,
    ...(placement === 'around' ? [] : [`placement="${placement}"`]),
    ...(stagger === DEFAULT_STAGGER ? [] : [`stagger={${stagger}}`]),
  ]

  return `import { CalendarIcon, FileTextIcon, ImageIcon, MailIcon, PlusIcon } from '@liquefy-ui/icons'
import { DropletMenu } from '@liquefy-ui/lab'

export const CreateMenu = ({ onCreate }: { onCreate: (kind: string) => void }) => (
  <DropletMenu
${props.map((prop) => `    ${prop}`).join('\n')}
  />
)`
}

/**
 * A photograph rather than the demo stage's own wash, because the droplets are
 * the same glass as everything else and a flat ground leaves them nothing to
 * bend. The trigger sits where each placement is meant for: the middle of the
 * stage for a ring, the bottom edge for one side, the corner for a quarter arc.
 */
const DropletMenuDemo = () => {
  const [placement, setPlacement] = useState<DropletPlacement>('around')
  const [stagger, setStagger] = useState(DEFAULT_STAGGER)

  return (
    <DemoBlock
      demo={{
        code: dropletMenuCode(placement, stagger),
        description: `Press the button. Each droplet leaves ${stagger} ms after the one before it, and they come home last-first. The arrow keys move through them in the order they landed.`,
        render: () => (
          <div className="lab-demo">
            <div className="lab-demo__scene" data-placement={placement}>
              <span className="lab-demo__credit">Photo by Alexey Topolyanskiy</span>
              <DropletMenu
                icon={<PlusIcon size={24} />}
                iconTurn={45}
                items={ITEMS}
                label="Create"
                placement={placement}
                stagger={stagger}
              />
            </div>
            <div className="lab-demo__controls">
              <div className="lab-demo__control">
                <span className="lab-demo__label">Placement</span>
                <LiquidSegmented
                  label="Placement"
                  onValueChange={(value) => setPlacement(value as DropletPlacement)}
                  options={[...PLACEMENTS]}
                  size="sm"
                  value={placement}
                />
              </div>
              <div className="lab-demo__control">
                <span className="lab-demo__label">Stagger<em>{stagger} ms</em></span>
                <LiquidSlider
                  aria-label="Stagger"
                  max={400}
                  min={0}
                  onValueChange={setStagger}
                  step={10}
                  value={stagger}
                />
              </div>
            </div>
          </div>
        ),
        title: 'Droplets over a photograph',
      }}
    />
  )
}

export const labDoc: DocEntry = {
  description: 'Experimental, motion-heavy components on top of @liquefy-ui/react. The same glass, with choreography added.',
  name: 'Lab',
  render: () => (
    <>
      <Section id="what" title="What lab is">
        <p>
          <code>@liquefy-ui/lab</code> holds components whose motion is the point: surfaces that split
          off, travel and settle, rather than only wobble in place. The material is the same — every
          droplet below is an ordinary glass icon button — so the provider&rsquo;s theme, tint and optics
          apply to it as they do to everything else.
        </p>
        <p>
          It is versioned <code>0.x</code>, and while it is, a component&rsquo;s API can change shape
          between minor versions. A caret range on a <code>0.x</code> version only takes patch releases,
          so <code>^0.1.0</code> will not pick up <code>0.2.0</code> on its own. When a component&rsquo;s
          API stops moving, it graduates into <code>@liquefy-ui/react</code>.
        </p>
      </Section>

      <Section id="install" title="Installation">
        <CodeBlock code={`pnpm add @liquefy-ui/lab @liquefy-ui/react @liquefy-ui/core`} />
        <p>
          <code>@liquefy-ui/react</code> is a peer dependency, not a bundled one. Lab&rsquo;s components
          sit inside your existing <code>LiquefyProvider</code> and render their overlays into its portal,
          so there is one theme, one tint and one <code>motion</code> switch for both packages. There is
          no lab stylesheet: <code>@liquefy-ui/react/styles.css</code> already covers it.
        </p>
        <CodeBlock code={labUsage} />
        <p>
          Lab is published to npm only; the shadcn registry carries the components of{' '}
          <code>@liquefy-ui/react</code>.
        </p>
      </Section>

      <Section id="droplet-menu" title="DropletMenu">
        <p>
          A round glass trigger that buds its items off one at a time. Each droplet stretches along the
          way it is travelling, swings past its place and jiggles to rest; closing calls them home in
          reverse. The trigger gives a little as each one is pushed out and gulps as each is taken back.
        </p>
        <DropletMenuDemo />
        <p>
          The springs read <code>wobbliness</code> from the provider, so the{' '}
          <a className="text-link" href="#/playground">Playground<ArrowRightIcon size={14} /></a> dial
          changes how far these overshoot as well.
        </p>
      </Section>

      <Section id="props" title="Props">
        <GuideTable
          headers={['Prop', 'Default', 'What it does']}
          rows={[
            [<code>items</code>, '—', <><code>{'{ icon, label, onSelect?, disabled? }[]'}</code>. <code>label</code> is the droplet&rsquo;s accessible name, its tooltip and what typeahead matches.</>],
            [<><code>icon</code>, <code>label</code></>, '—', 'The trigger’s icon and accessible name.'],
            [<code>iconTurn</code>, <code>0</code>, <>Degrees the trigger&rsquo;s icon turns while open. <code>45</code> turns a plus into a close mark.</>],
            [<code>placement</code>, <code>&apos;around&apos;</code>, <>Where the droplets land: <code>around</code>, <code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code>, or a quarter arc such as <code>top-left</code> for a trigger in the bottom-right corner.</>],
            [<code>radius</code>, 'fitted', 'Distance from the trigger’s centre to each droplet’s, in pixels. Defaults to the closest that keeps neighbours apart.'],
            [<code>stagger</code>, <code>120</code>, 'Milliseconds between one droplet leaving and the next.'],
            [<code>size</code>, <code>&apos;lg&apos;</code>, <>The trigger&rsquo;s size, <code>sm</code>, <code>md</code> or <code>lg</code>. Droplets are one size down.</>],
            [<><code>open</code>, <code>defaultOpen</code>, <code>onOpenChange</code></>, '', 'Controlled or uncontrolled. A controlled close still plays the return.'],
            [<><code>tint</code>, <code>className</code>, <code>style</code>, <code>styles</code></>, '', <>As on every <code>@liquefy-ui/react</code> component.</>],
          ]}
        />
      </Section>

      <Section id="behaviour" title="Keyboard, focus and reduced motion">
        <p>
          Underneath it is Base UI&rsquo;s menu. The arrow keys move through the droplets in the order they
          land, which is clockwise; typeahead matches labels; Escape closes and focus goes back to the
          trigger. A disabled item stays reachable with <code>aria-disabled</code>, as the WAI-ARIA menu
          pattern asks, and does nothing when chosen.
        </p>
        <p>
          The popup stays mounted until the last droplet is home, while <code>aria-expanded</code> turns
          false the moment the menu closes — assistive technology hears the close when it happens, not
          when the animation ends.
        </p>
        <Callout title="Lab reads prefers-reduced-motion">
          The components in <code>@liquefy-ui/react</code> leave that preference to you. A menu that flies
          its items across the screen is a different case, so with <code>prefers-reduced-motion: reduce</code>,
          or <code>motion={'{false}'}</code> on the provider, the droplets appear and disappear in place.{' '}
          <a className="text-link" href="#/docs/motion">Motion<ArrowRightIcon size={14} /></a>
        </Callout>
      </Section>

      <Section id="timeline" title="The timeline on its own">
        <p>
          <code>DropletChoreography</code> is the motion model with no DOM attached: springs for each
          droplet&rsquo;s position and size, the trigger&rsquo;s squash, and a stagger clock that only
          advances when a frame is stepped — so a main-thread stall slows the sequence down rather than
          releasing every droplet at once. <code>dropletAngles</code>, <code>dropletOffsets</code> and{' '}
          <code>dropletRadius</code> are the layout. All four are exported for building other
          droplet-shaped components.
        </p>
      </Section>
    </>
  ),
  slug: 'lab',
  summary: 'Experimental components that are still moving, starting with DropletMenu.',
}
