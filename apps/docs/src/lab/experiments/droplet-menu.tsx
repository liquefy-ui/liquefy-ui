import { useState } from 'react'
import { CalendarIcon, FileTextIcon, ImageIcon, MailIcon, PlusIcon } from '@liquefy-ui/icons'
import { DropletMenu, type DropletPlacement } from '@liquefy-ui/lab'
import { LiquidSegmented, LiquidSlider } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

/** Three of the nine placements: a ring, one side, and the quarter arc a corner button wants. */
const PLACEMENTS = [
  { label: 'Around', value: 'around' },
  { label: 'Top', value: 'top' },
  { label: 'Top-left', value: 'top-left' },
] as const satisfies readonly { label: string; value: DropletPlacement }[]

const DEFAULT_STAGGER = 120

/** Where the trigger sits for each placement: the middle for a ring, the bottom edge for one side, the corner for a quarter arc. */
const ALIGN = { around: 'center', top: 'bottom', 'top-left': 'bottom-end' } as const

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

const Playground = () => {
  const [placement, setPlacement] = useState<DropletPlacement>('around')
  const [stagger, setStagger] = useState(DEFAULT_STAGGER)

  return (
    <>
      <LabStage align={ALIGN[placement as keyof typeof ALIGN]}>
        <DropletMenu
          icon={<PlusIcon size={24} />}
          iconTurn={45}
          items={ITEMS}
          label="Create"
          placement={placement}
          stagger={stagger}
        />
      </LabStage>
      <LabControls>
        <LabControl label="Placement">
          <LiquidSegmented
            label="Placement"
            onValueChange={(value) => setPlacement(value as DropletPlacement)}
            options={[...PLACEMENTS]}
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
      description: 'Press the button. Each droplet leaves one stagger after the one before it and comes home last-first; the arrow keys move through them in the order they landed.',
      render: () => <Playground />,
      title: 'Droplets over a photograph',
    },
  ],
  description:
    'A round glass trigger that buds its items off one at a time. Each droplet pulls a neck of glass out of the trigger, stretches along its path, swings past its place and jiggles to rest; closing calls them home in reverse.',
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
    { description: 'Each item’s label is its accessible name, its tooltip and what typeahead matches.', name: 'items', required: true, type: 'DropletMenuItem[]' },
    { description: 'The trigger’s icon.', name: 'icon', required: true, type: 'ReactNode' },
    { description: 'The trigger’s accessible name and tooltip.', name: 'label', required: true, type: 'string' },
    { defaultValue: '0', description: 'Degrees the trigger’s icon turns while open. 45 turns a plus into a close mark.', name: 'iconTurn', type: 'number' },
    { defaultValue: "'around'", description: 'Where the droplets land: around, top, bottom, left, right, or a quarter arc such as top-left for a trigger in the bottom-right corner.', name: 'placement', type: 'DropletPlacement' },
    { defaultValue: 'fitted', description: 'Distance from the trigger’s centre to each droplet’s, in pixels. Defaults to the closest that keeps neighbours apart.', name: 'radius', type: 'number' },
    { defaultValue: '120', description: 'Milliseconds between one droplet leaving and the next.', name: 'stagger', type: 'number' },
    { defaultValue: "'lg'", description: 'The trigger’s size. Droplets are one size down.', name: 'size', type: "'sm' | 'md' | 'lg'" },
    { description: 'Controlled or uncontrolled. A controlled close still plays the return.', name: 'open / defaultOpen / onOpenChange', type: 'boolean / boolean / (open: boolean) => void' },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
  ],
  slug: 'droplet-menu',
}
