import { useEffect, useState } from 'react'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
} from '@liquefy-ui/icons'
import { LiquidIsland, type LiquidIslandView } from '@liquefy-ui/lab'
import { LiquidAvatar, LiquidIconButton, LiquidProgress, LiquidSegmented, LiquidSlider } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

type Activity = 'idle' | 'music' | 'download' | 'message'

const ACTIVITIES = [
  { label: 'Idle', value: 'idle' },
  { label: 'Music', value: 'music' },
  { label: 'Download', value: 'download' },
  { label: 'Message', value: 'message' },
] as const

const Track = ({ playing, onToggle }: { onToggle: () => void; playing: boolean }) => (
  <div className="lab-island-track">
    <img alt="" src="/scenes/coast.jpg" />
    <span>Hold On</span>
    <LiquidIconButton label={playing ? 'Pause' : 'Play'} onClick={onToggle} shape="circle" size="sm">
      {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
    </LiquidIconButton>
  </div>
)

const PlayerPanel = ({ onToggle, playing }: { onToggle: () => void; playing: boolean }) => {
  const [position, setPosition] = useState(74)
  return (
    <div className="lab-morph-player lab-island-player">
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
        <LiquidIconButton label={playing ? 'Pause' : 'Play'} onClick={onToggle} shape="circle">
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </LiquidIconButton>
        <LiquidIconButton label="Next" shape="circle" size="sm"><ChevronRightIcon size={18} /></LiquidIconButton>
      </div>
    </div>
  )
}

const Playground = () => {
  const [activity, setActivity] = useState<Activity>('music')
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const toggle = () => setPlaying((value) => !value)

  // A download that runs on its own: it fills, turns into a tick, and the
  // island goes back to rest.
  useEffect(() => {
    if (activity !== 'download') return undefined
    setProgress(0)
    const timer = window.setInterval(() => setProgress((value) => Math.min(100, value + 4)), 120)
    return () => window.clearInterval(timer)
  }, [activity])
  useEffect(() => {
    if (activity !== 'download' || progress < 100) return undefined
    const timer = window.setTimeout(() => setActivity('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [activity, progress])

  const views: Record<string, LiquidIslandView> = {
    done: {
      announce: 'Download complete',
      bounce: true,
      content: <span className="lab-island-done"><CheckIcon size={18} /></span>,
      height: 44,
      width: 44,
    },
    download: {
      announce: 'Downloading Fjord route.pdf',
      content: (
        <div className="lab-island-download">
          <DownloadIcon size={16} />
          <LiquidProgress aria-label="Fjord route.pdf" value={progress} />
          <span>{progress}%</span>
        </div>
      ),
    },
    message: {
      announce: 'Mika Kuroda: Running five minutes late',
      content: (
        <div className="lab-island-message">
          <LiquidAvatar name="Mika Kuroda" size="md" />
          <span>
            <strong>Mika Kuroda</strong>
            <em>Running five minutes late</em>
          </span>
        </div>
      ),
    },
    music: { content: <Track onToggle={toggle} playing={playing} /> },
  }
  const view = activity === 'download' && progress >= 100 ? 'done' : activity

  return (
    <>
      <LabStage align="top" height={340} scene="coast">
        <LiquidIsland
          label="Now playing"
          panel={activity === 'music'
            ? { content: <PlayerPanel onToggle={toggle} playing={playing} />, label: 'Player', width: 300 }
            : undefined}
          size={44}
          view={view}
          views={views}
        />
      </LabStage>
      <LabControls>
        <LabControl label="Activity">
          <LiquidSegmented
            label="Activity"
            onValueChange={(value) => setActivity(value as Activity)}
            options={[...ACTIVITIES]}
            size="sm"
            value={activity}
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
      code: `import { CheckIcon, DownloadIcon } from '@liquefy-ui/icons'
import { LiquidIsland } from '@liquefy-ui/lab'
import { LiquidProgress } from '@liquefy-ui/react'

<LiquidIsland
  label="Now playing"
  size={44}
  view={done ? 'done' : 'download'}
  views={{
    music: { content: <Track /> },
    download: {
      announce: 'Downloading Fjord route.pdf',
      content: <LiquidProgress aria-label="Fjord route.pdf" value={progress} />,
    },
    done: {
      announce: 'Download complete',
      bounce: true,
      content: <CheckIcon size={18} />,
      width: 44,
      height: 44,
    },
  }}
  panel={{ content: <Player />, label: 'Player', width: 300 }}
/>`,
      description: 'Pick an activity. Between views the glass gathers in before it spreads out and swings past its new shape; a finished download shrinks into a tick that lands with a pop. With music playing, press the island to open the player in place — Escape or a press outside closes it.',
      render: () => <Playground />,
      title: 'An island over a photograph',
    },
  ],
  description:
    'A glass capsule in the manner of the Dynamic Island: a small bubble at rest that stretches into whatever is going on — a track, a download, a message — and opens into a panel when pressed. The change of shape is the show: it gathers, spreads, overshoots and pops.',
  importLine: "import { LiquidIsland } from '@liquefy-ui/lab'",
  inspiredBy: 'the Dynamic Island on iPhone',
  name: 'LiquidIsland',
  order: 3,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage align="top" height={178} scene="coast">
      <LiquidIsland
        label="Messages"
        size={40}
        view="message"
        views={{
          message: {
            content: (
              <div className="lab-island-message">
                <LiquidAvatar name="Mika Kuroda" size="sm" />
                <span>
                  <strong>Mika Kuroda</strong>
                  <em>Running five minutes late</em>
                </span>
              </div>
            ),
          },
        }}
      />
    </LabStage>
  ),
  props: [
    { description: 'Which of views is showing. A key with no view is the resting bubble.', name: 'view', required: true, type: 'string' },
    { description: 'Each view’s content, its size (either side left out is measured from the content), what it announces as it arrives, and whether it lands with a pop.', name: 'views', type: 'Record<string, LiquidIslandView>' },
    { description: 'The island’s accessible name, carried by its button when there is a panel.', name: 'label', required: true, type: 'string' },
    { description: 'What the island opens into when pressed, with its size and label. A function is handed { close }. Without a panel the island is not a button.', name: 'panel', type: 'LiquidIslandPanel' },
    { description: 'Controlled or uncontrolled panel.', name: 'open / defaultOpen / onOpenChange', type: 'boolean / boolean / (open: boolean) => void' },
    { defaultValue: '36', description: 'The resting bubble’s diameter, which is also the room the island takes in the layout. Larger views float over what is around it.', name: 'size', type: 'number' },
    { defaultValue: "'top'", description: 'The point that stays put while the island changes shape.', name: 'origin', type: 'MorphOrigin' },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
  ],
  slug: 'liquid-island',
}
