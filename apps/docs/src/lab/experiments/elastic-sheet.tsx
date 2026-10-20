import { useRef, useState } from 'react'
import { ClockIcon, PinIcon, SearchIcon, StarIcon } from '@liquefy-ui/icons'
import { ElasticSheet, type ElasticSheetSnapPoint } from '@liquefy-ui/lab'
import {
  LiquidButton,
  LiquidList,
  LiquidListItem,
  LiquidSegmented,
  LiquidSwitch,
  LiquidTextField,
} from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const SNAP_POINTS = ['25%', '50%', '100%'] as const satisfies readonly ElasticSheetSnapPoint[]

const HEIGHTS = [
  { label: 'Peek', value: '25%' },
  { label: 'Half', value: '50%' },
  { label: 'Full', value: '100%' },
]

const NEARBY = [
  { meta: '350 m · 4 min walk', name: 'Ferry terminal' },
  { meta: '600 m · 8 min walk', name: 'Harbour bakery' },
  { meta: '1.8 km · 25 min walk', name: 'Lookout point' },
  { meta: '2.1 km · 28 min walk', name: 'Kayak rental' },
  { meta: '2.6 km · 34 min walk', name: 'Stone church' },
  { meta: '4.3 km · 1 h walk', name: 'Waterfall trailhead' },
]

const SAVED = [
  { meta: 'Opens 07:00', name: 'Café on the pier' },
  { meta: '12 km by road', name: 'Cabin' },
  { meta: 'Last visited in June', name: 'Upper meadow' },
]

/** What the sheet holds: a search field, then the places a maps app would list under it. */
const Places = () => (
  <div style={{ display: 'grid', gap: 16 }}>
    <LiquidTextField aria-label="Search places" placeholder="Search places" startAdornment={<SearchIcon size={16} />} />
    <LiquidList inset>
      {NEARBY.map((place) => (
        <LiquidListItem chevron description={place.meta} icon={<PinIcon size={18} />} key={place.name} onActivate={() => {}}>
          {place.name}
        </LiquidListItem>
      ))}
    </LiquidList>
    <LiquidList inset>
      {SAVED.map((place, index) => (
        <LiquidListItem
          chevron
          description={place.meta}
          icon={index === 0 ? <ClockIcon size={18} /> : <StarIcon size={18} />}
          key={place.name}
          onActivate={() => {}}
        >
          {place.name}
        </LiquidListItem>
      ))}
    </LiquidList>
  </div>
)

/**
 * The stage is the sheet's room: a layer over the photograph that clips the
 * sheet to the stage's rounded corners. It isolates, so the sheet's own layer
 * stays inside the stage instead of rising over the docs header.
 */
const ROOM = {
  borderRadius: 'inherit',
  inset: 0,
  isolation: 'isolate',
  overflow: 'clip',
  pointerEvents: 'none',
  position: 'absolute',
  // Over the trigger, which the sheet covers while it is up.
  zIndex: 1,
} as const

const Playground = () => {
  const room = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(true)
  const [snap, setSnap] = useState<ElasticSheetSnapPoint>('25%')
  const [modal, setModal] = useState(false)
  const [dismissible, setDismissible] = useState(true)

  return (
    <>
      <LabStage align="bottom" height={560} scene="fjord">
        <div ref={room} style={ROOM} />
        <ElasticSheet
          container={room}
          dismissible={dismissible}
          modal={modal}
          onOpenChange={setOpen}
          onSnapChange={setSnap}
          open={open}
          snap={snap}
          snapPoints={SNAP_POINTS}
          title="Explore"
          // The tallest height leaves the clifftops in view, with room to stretch into.
          topInset={72}
          trigger={<LiquidButton iconBefore={<SearchIcon size={16} />}>Explore</LiquidButton>}
        >
          <Places />
        </ElasticSheet>
      </LabStage>
      <LabControls>
        <LabControl label="Height">
          <LiquidSegmented
            label="Height"
            onValueChange={(value) => {
              setSnap(value as ElasticSheetSnapPoint)
              setOpen(true)
            }}
            options={HEIGHTS}
            size="sm"
            value={String(snap)}
          />
        </LabControl>
        <LabControl label="Modal">
          <LiquidSwitch checked={modal} label="Modal" onCheckedChange={setModal} />
        </LabControl>
        <LabControl label="Flick down to close">
          <LiquidSwitch
            checked={dismissible}
            label="Flick down to close"
            onCheckedChange={(next) => {
              setDismissible(next)
              if (!next) setOpen(true)
            }}
          />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'surfaces',
  demos: [
    {
      code: `import { SearchIcon } from '@liquefy-ui/icons'
import { ElasticSheet } from '@liquefy-ui/lab'
import { LiquidButton } from '@liquefy-ui/react'

<ElasticSheet
  defaultOpen
  modal={false}
  snapPoints={['25%', '50%', '100%']}
  title="Explore"
  trigger={<LiquidButton iconBefore={<SearchIcon size={16} />}>Explore</LiquidButton>}
>
  <Places />
</ElasticSheet>`,
      description:
        'Drag the sheet by its grabber or its content. Let go slowly and it settles on the nearest height; flick it and it coasts on — a hard flick up runs to the top, one down puts it away. Pull past the top and it stretches, narrows and reaches for your finger.',
      render: () => <Playground />,
      title: 'A maps-style sheet',
    },
  ],
  description:
    'A sheet pulled up from the bottom that follows the finger, stretches against a rubber band past its ends, and coasts to the height the flick carries it to, swinging past and settling with a quiver. Short it floats in from the edges; tall it anchors to them.',
  importLine: "import { ElasticSheet } from '@liquefy-ui/lab'",
  inspiredBy: 'the sheets in Apple Maps',
  name: 'ElasticSheet',
  order: 4,
  package: '@liquefy-ui/lab',
  props: [
    { description: 'The heights it rests at. A percentage or a number up to 1 is a share of the room; pixels or a number above 1 are exact.', name: 'snapPoints', defaultValue: "['50%', '100%']", type: "Array<number | `${number}%` | `${number}px`>" },
    { description: 'The snap point it rests at, when controlled. The sheet follows a drag wherever it is let go and reports it through onSnapChange.', name: 'snap', type: 'ElasticSheetSnapPoint' },
    { description: 'The snap point an uncontrolled sheet opens at.', name: 'defaultSnap', defaultValue: 'first snap point', type: 'ElasticSheetSnapPoint' },
    { description: 'Called with the snap point the sheet is heading for, after a drag, a key or a press on the grabber.', name: 'onSnapChange', type: '(snap) => void' },
    { description: 'Controlled or uncontrolled. A controlled close still slides the sheet away.', name: 'open, defaultOpen, onOpenChange', type: 'boolean' },
    { description: 'Dims what is behind, keeps focus inside and locks the page. Off, the page stays live around the sheet.', name: 'modal', defaultValue: 'true', type: 'boolean' },
    { description: 'Whether a flick down, Escape, the close button and a press outside put it away. Off, the lowest height holds against a rubber band.', name: 'dismissible', defaultValue: 'true', type: 'boolean' },
    { description: 'The element it moves in instead of the viewport. Give it a position and clip its overflow.', name: 'container', type: 'HTMLElement | RefObject<HTMLElement | null>' },
    { description: 'An element that opens the sheet; focus goes back to it on close.', name: 'trigger', type: 'ReactElement' },
    { description: 'The heading, which also names the dialog. Without one, give it a label.', name: 'title, label', type: 'ReactNode, string' },
    { description: 'Space kept clear above the sheet at its tallest.', name: 'topInset', defaultValue: '48', type: 'number' },
    { description: 'The widest it gets; it is centred in anything wider.', name: 'maxWidth', defaultValue: '640', type: 'number' },
    { description: 'The accessible names of the grabber and the close button.', name: 'grabberLabel, closeLabel', defaultValue: "'Sheet height', 'Close'", type: 'string' },
  ],
  slug: 'elastic-sheet',
}
