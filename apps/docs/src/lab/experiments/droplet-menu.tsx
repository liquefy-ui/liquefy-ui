import { useState } from 'react'
import { CalendarIcon, FileTextIcon, ImageIcon, MailIcon, PlusIcon } from '@liquefy-ui/icons'
import { DropletMenu, type DropletLayout, type DropletPlacement } from '@liquefy-ui/lab'
import { LiquidSegmented, LiquidSlider } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const LAYOUTS = [
  { label: 'Arc', value: 'arc' },
  { label: 'Line', value: 'line' },
] as const satisfies readonly { label: string; value: DropletLayout }[]

/**
 * A few of the nine placements for each layout. An arc: a ring, one side, and
 * the quarter arc a corner button wants. A line: a column up from the bottom
 * edge, and a row along it out of the corner.
 */
const PLACEMENTS = {
  arc: [
    { label: 'Around', value: 'around' },
    { label: 'Top', value: 'top' },
    { label: 'Top-left', value: 'top-left' },
  ],
  line: [
    { label: 'Top', value: 'top' },
    { label: 'Left', value: 'left' },
  ],
} as const satisfies Record<DropletLayout, readonly { label: string; value: DropletPlacement }[]>

const DEFAULT_STAGGER = 120

type Stage = { align: 'center' | 'bottom' | 'bottom-end'; height?: number }

/**
 * Where the trigger sits, and how tall the stage is, for each arrangement: the
 * middle for a ring, the bottom edge for one side or a column, the corner for a
 * quarter arc or a row. A column of four needs the extra height.
 */
const STAGE: Record<DropletLayout, Partial<Record<DropletPlacement, Stage>>> = {
  arc: { around: { align: 'center' }, top: { align: 'bottom' }, 'top-left': { align: 'bottom-end' } },
  line: { left: { align: 'bottom-end' }, top: { align: 'bottom', height: 400 } },
}

const ITEMS = [
  { icon: <ImageIcon size={20} />, label: 'Photo' },
  { icon: <FileTextIcon size={20} />, label: 'Note' },
  { icon: <CalendarIcon size={20} />, label: 'Event' },
  { icon: <MailIcon size={20} />, label: 'Message' },
]

/**
 * The demo's source for a configuration, leaving out props at their default the
 * way an app would. Exported for the docs test, which checks every name it
 * imports is real.
 */
export const dropletMenuCode = (placement: DropletPlacement, stagger: number, layout: DropletLayout = 'arc'): string => {
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
    ...(layout === 'arc' ? [] : [`layout="${layout}"`]),
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

const Playground = () => {
  const [layout, setLayout] = useState<DropletLayout>('arc')
  const [placement, setPlacement] = useState<DropletPlacement>('around')
  const [stagger, setStagger] = useState(DEFAULT_STAGGER)

  // Switching layout keeps the side when the other layout shows it, and
  // otherwise falls back to that layout's first.
  const changeLayout = (next: DropletLayout) => {
    setLayout(next)
    if (!PLACEMENTS[next].some((option) => option.value === placement)) setPlacement(PLACEMENTS[next][0].value)
  }

  return (
    <>
      <LabStage {...(STAGE[layout][placement] ?? STAGE.arc.around)}>
        <DropletMenu
          icon={<PlusIcon size={24} />}
          iconTurn={45}
          items={ITEMS}
          label="Create"
          layout={layout}
          placement={placement}
          stagger={stagger}
        />
      </LabStage>
      <LabControls>
        <LabControl label="Layout">
          <LiquidSegmented
            label="Layout"
            onValueChange={(value) => changeLayout(value as DropletLayout)}
            options={[...LAYOUTS]}
            size="sm"
            value={layout}
          />
        </LabControl>
        <LabControl label="Placement">
          <LiquidSegmented
            label="Placement"
            onValueChange={(value) => setPlacement(value as DropletPlacement)}
            options={[...PLACEMENTS[layout]]}
            size="sm"
            value={placement}
          />
        </LabControl>
        <LabControl label="Stagger" value={`${stagger} ms`}>
          <LiquidSlider aria-label="Stagger" max={400} min={0} onValueChange={setStagger} step={10} value={stagger} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'menus',
  demos: [
    {
      code: dropletMenuCode('around', DEFAULT_STAGGER),
      description: 'Press the button, or press and hold and slide onto a droplet: it swells under your finger, and letting go there chooses it. A chosen droplet bounces before it acts; letting go anywhere else closes the menu. The droplet nearest a cursor leans toward it. On an arc the arrow keys follow the droplets in the order they landed; a line is walked the way it reads.',
      render: () => <Playground />,
      title: 'Droplets over a photograph',
    },
  ],
  description:
    'A round glass trigger that buds its items off one at a time, onto an arc or in a line. Each droplet pulls a neck of glass out of the trigger, stretches along its path, swings past its place and jiggles to rest; closing calls them home in reverse. Out, they lean toward the pointer, and a press can slide straight onto one and let go to choose it.',
  importLine: "import { DropletMenu } from '@liquefy-ui/lab'",
  inspiredBy: 'LiquidFloatingActionButton and SwiftUI GlassEffectContainer',
  name: 'DropletMenu',
  order: 1,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178}>
      <DropletMenu defaultOpen icon={<PlusIcon size={22} />} iconTurn={45} items={ITEMS.slice(0, 3)} label="Create" size="md" />
    </LabStage>
  ),
  props: [
    { description: 'Each item’s label is its accessible name, its tooltip and what typeahead matches. onSelect runs once the chosen droplet has bounced, just before the menu closes.', name: 'items', required: true, type: 'DropletMenuItem[]' },
    { description: 'The trigger’s icon.', name: 'icon', required: true, type: 'ReactNode' },
    { description: 'The trigger’s accessible name and tooltip.', name: 'label', required: true, type: 'string' },
    { defaultValue: '0', description: 'Degrees the trigger’s icon turns while open. 45 turns a plus into a close mark.', name: 'iconTurn', type: 'number' },
    { defaultValue: "'around'", description: 'Which side the droplets land on: around, top, bottom, left, right, or a corner such as top-left for a trigger in the bottom-right corner.', name: 'placement', type: 'DropletPlacement' },
    { defaultValue: "'arc'", description: 'arc spreads the droplets over their side; line stacks them out of it — a column for top or bottom, a row for left or right — reading top to bottom, then left to right.', name: 'layout', type: "'arc' | 'line'" },
    { defaultValue: 'fitted', description: 'Distance from the trigger’s centre to each droplet’s, in pixels; on a line, to the nearest and between neighbours. Defaults to the closest that keeps neighbours apart.', name: 'radius', type: 'number' },
    { defaultValue: '120', description: 'Milliseconds between one droplet leaving and the next.', name: 'stagger', type: 'number' },
    { defaultValue: "'lg'", description: 'The trigger’s size. Droplets are one size down.', name: 'size', type: "'sm' | 'md' | 'lg'" },
    { description: 'Controlled or uncontrolled. A controlled close still plays the return.', name: 'open / defaultOpen / onOpenChange', type: 'boolean / boolean / (open: boolean) => void' },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
  ],
  slug: 'droplet-menu',
}
