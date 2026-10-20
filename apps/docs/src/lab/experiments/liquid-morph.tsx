import { useState } from 'react'
import {
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  MailIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  XIcon,
} from '@liquefy-ui/icons'
import { LiquidMorph, type LiquidMorphControls } from '@liquefy-ui/lab'
import {
  LiquidAvatar,
  LiquidButton,
  LiquidIconButton,
  LiquidListItem,
  LiquidSegmented,
  LiquidSlider,
} from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const PLACES = [
  { detail: 'Photos · 214', icon: <ImageIcon size={16} />, label: 'Preikestolen viewpoint' },
  { detail: 'Ferry · daily at 09:30', icon: <CalendarIcon size={16} />, label: 'Geiranger to Hellesylt' },
  { detail: 'Notes · 27 km return', icon: <FileTextIcon size={16} />, label: 'Trolltunga trail' },
  { detail: 'Opened 3 days ago', icon: <ClockIcon size={16} />, label: 'Lofoten cabins' },
]

/**
 * One field for both open stages, so the input keeps its focus and its text
 * while the glass drops open under it.
 */
const SearchPanel = ({ close, setStage, stage }: LiquidMorphControls) => {
  const [query, setQuery] = useState('')
  const matches = PLACES.filter((place) => place.label.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="lab-morph-search">
      <div className="lab-morph-search__field">
        <SearchIcon size={18} />
        <input
          aria-label="Search places"
          onChange={(event) => {
            setQuery(event.target.value)
            setStage(event.target.value ? 'results' : 'field')
          }}
          placeholder="Search anything…"
          value={query}
        />
        <LiquidIconButton label="Close search" onClick={close} shape="circle" size="sm">
          <XIcon size={14} />
        </LiquidIconButton>
      </div>
      {stage === 'results' && (
        <ul aria-label={query ? 'Matches' : 'Recent'} className="lq-list__items lab-morph-search__results">
          {matches.map((place) => (
            <LiquidListItem description={place.detail} icon={place.icon} key={place.label} onActivate={close}>
              {place.label}
            </LiquidListItem>
          ))}
          {matches.length === 0 && <li className="lab-morph-search__empty">No places match “{query}”</li>}
        </ul>
      )}
    </div>
  )
}

const STAGES = [
  { label: 'Closed', value: 'closed' },
  { label: 'Field', value: 'field' },
  { label: 'Results', value: 'results' },
]

const SearchPlayground = () => {
  const [stage, setStage] = useState('closed')

  return (
    <>
      <LabStage align="top" height={400}>
        <LiquidMorph
          label="Search"
          onStageChange={setStage}
          origin="top"
          stage={stage}
          stages={{ field: { height: 52, width: 320 }, results: { width: 320 } }}
          trigger={<SearchIcon size={20} />}
        >
          {(controls) => <SearchPanel {...controls} />}
        </LiquidMorph>
      </LabStage>
      <LabControls>
        <LabControl label="Stage">
          <LiquidSegmented label="Stage" onValueChange={setStage} options={STAGES} size="sm" value={stage} />
        </LabControl>
      </LabControls>
    </>
  )
}

const Player = () => {
  const [playing, setPlaying] = useState(true)
  const [position, setPosition] = useState(74)

  return (
    <div className="lab-morph-player">
      <div className="lab-morph-player__track">
        <img alt="" src="/scenes/coast.jpg" />
        <span>
          <strong>Hold On</strong>
          <em>Light Years</em>
        </span>
      </div>
      <LiquidSlider aria-label="Position" max={212} min={0} onValueChange={setPosition} step={1} value={position} />
      <div className="lab-morph-player__controls">
        <LiquidIconButton label="Previous" shape="circle" size="sm"><ChevronLeftIcon size={18} /></LiquidIconButton>
        <LiquidIconButton label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} shape="circle">
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </LiquidIconButton>
        <LiquidIconButton label="Next" shape="circle" size="sm"><ChevronRightIcon size={18} /></LiquidIconButton>
      </div>
    </div>
  )
}

const NOTIFICATIONS = [
  { detail: 'Running five minutes late', from: 'Mika Kuroda', time: '2 min' },
  { detail: 'Shared “Fjord route.pdf”', from: 'Aron Lie', time: '18 min' },
  { detail: 'Ferry 09:30 is on time', from: 'Fjord1', time: '1 h' },
]

const Notifications = ({ close }: LiquidMorphControls) => (
  <div className="lab-morph-list">
    <strong>Notifications</strong>
    <ul className="lq-list__items">
      {NOTIFICATIONS.map((notification) => (
        <LiquidListItem
          description={notification.detail}
          end={notification.time}
          icon={<MailIcon size={16} />}
          key={notification.from}
          onActivate={close}
        >
          {notification.from}
        </LiquidListItem>
      ))}
    </ul>
  </div>
)

const Profile = ({ close }: LiquidMorphControls) => (
  <div className="lab-morph-profile">
    <LiquidAvatar name="Mika Kuroda" size="xl" />
    <span>
      <strong>Mika Kuroda</strong>
      <em>Product designer · Oslo</em>
    </span>
    <div className="lab-morph-profile__actions">
      <LiquidButton onClick={close} size="sm">Close</LiquidButton>
      <LiquidButton onClick={close} size="sm">Message</LiquidButton>
    </div>
  </div>
)

const Gallery = () => (
  <LabStage align="top" height={400} scene="coast">
    <div className="lab-row lab-morph-gallery">
      <LiquidMorph label="Now playing" stages={{ player: { width: 280 } }} trigger={<PlayIcon size={20} />}>
        <Player />
      </LiquidMorph>
      <LiquidMorph label="Notifications" origin="top" stages={{ list: { width: 320 } }} trigger={<BellIcon size={20} />}>
        {(controls) => <Notifications {...controls} />}
      </LiquidMorph>
      <LiquidMorph
        label="Mika Kuroda"
        origin="top-right"
        stages={{ card: { width: 280 } }}
        trigger={<LiquidAvatar name="Mika Kuroda" size="md" />}
      >
        {(controls) => <Profile {...controls} />}
      </LiquidMorph>
    </div>
  </LabStage>
)

export const experiment: LabExperiment = {
  category: 'surfaces',
  demos: [
    {
      code: `import { SearchIcon } from '@liquefy-ui/icons'
import { LiquidMorph } from '@liquefy-ui/lab'

const [stage, setStage] = useState('closed')

<LiquidMorph
  label="Search"
  origin="top"
  stage={stage}
  onStageChange={setStage}
  stages={{
    field: { width: 320, height: 52 },
    results: { width: 320 }, // height follows the list
  }}
  trigger={<SearchIcon size={20} />}
>
  {({ stage, setStage, close }) => (
    <SearchPanel
      onQuery={(query) => setStage(query ? 'results' : 'field')}
      onClose={close}
      showResults={stage === 'results'}
    />
  )}
</LiquidMorph>`,
      description: 'Press the button, or step through the stages below. The glass spreads out to both sides into a field, then drops into a panel as you type — one field throughout, so it keeps its focus and its text. Escape or a press outside pulls it back into the button.',
      render: () => <SearchPlayground />,
      title: 'A search button in three stages',
    },
    {
      code: `import { BellIcon, PlayIcon } from '@liquefy-ui/icons'
import { LiquidMorph } from '@liquefy-ui/lab'
import { LiquidAvatar } from '@liquefy-ui/react'

<LiquidMorph label="Now playing" stages={{ player: { width: 280 } }} trigger={<PlayIcon size={20} />}>
  <Player />
</LiquidMorph>

<LiquidMorph label="Notifications" origin="top" stages={{ list: { width: 320 } }} trigger={<BellIcon size={20} />}>
  {({ close }) => <Notifications onOpen={close} />}
</LiquidMorph>

<LiquidMorph
  label="Mika Kuroda"
  origin="top-right"
  stages={{ card: { width: 280 } }}
  trigger={<LiquidAvatar name="Mika Kuroda" size="md" />}
>
  {({ close }) => <Profile onClose={close} />}
</LiquidMorph>`,
      description: 'A play button that spreads into a player, a bell into its list, an avatar into a card. `origin` is the point that stays put: the top-left corner, the middle of the top edge, the top-right corner.',
      render: () => <Gallery />,
      title: 'Whatever the button opens',
    },
  ],
  description:
    'A button that grows into what it opens instead of opening something beside it. The glass spreads, drops, swings past its new shape and settles, rounding into a blob while it moves and thickening as the content arrives; closing pulls it back into the button with a small pop.',
  importLine: "import { LiquidMorph } from '@liquefy-ui/lab'",
  inspiredBy: 'Motion Primitives’ Morphing Dialog',
  name: 'LiquidMorph',
  order: 2,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage align="top" height={178}>
      <LiquidMorph defaultStage="field" label="Search" origin="top" stages={{ field: { height: 48, width: 230 } }} trigger={<SearchIcon size={20} />}>
        <div className="lab-morph-search__field">
          <SearchIcon size={18} />
          <span className="lab-morph-search__placeholder">Search anything…</span>
        </div>
      </LiquidMorph>
    </LabStage>
  ),
  props: [
    { description: 'What the closed glass shows: an icon, an avatar, a thumbnail.', name: 'trigger', required: true, type: 'ReactNode' },
    { description: 'The trigger’s accessible name and tooltip.', name: 'label', required: true, type: 'string' },
    { description: 'The open stages, smallest first. Each is a width and height (either left out is measured from the content), a corner radius, and optionally content and a label of its own.', name: 'stages', required: true, type: 'Record<string, LiquidMorphStage>' },
    { description: 'What the stages show unless they bring content of their own. A function is handed { stage, setStage, close }. It stays mounted from stage to stage.', name: 'children', type: 'ReactNode | (controls) => ReactNode' },
    { description: 'Controlled or uncontrolled stage: \'closed\' or a key of stages.', name: 'stage / defaultStage / onStageChange', type: 'string / string / (stage: string) => void' },
    { defaultValue: 'first stage', description: 'The stage the trigger opens to.', name: 'openTo', type: 'string' },
    { defaultValue: "'top-left'", description: 'The point of the trigger that stays put while the glass grows: a corner, the middle of an edge, or the centre.', name: 'origin', type: 'MorphOrigin' },
    { defaultValue: "'md'", description: 'A round icon trigger at the library’s sizes, or { width, height, radius } for an avatar or a thumbnail.', name: 'size', type: "'sm' | 'md' | 'lg' | MorphSize" },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
  ],
  slug: 'liquid-morph',
}
