import { useState } from 'react'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { LiquidSwipe } from '@liquefy-ui/lab'
import { LiquidButton, LiquidSegmented, LiquidSwitch } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

type Step = {
  /** The page's own ground: a photograph, or a flat colour. */
  background: string
  body: string
  eyebrow: string
  /** Ink for a light ground; white otherwise. */
  ink?: string
  title: string
}

/** Photographs get a shade along the bottom, so the white type over them reads. */
const shaded = (scene: string) =>
  `linear-gradient(180deg, rgb(0 0 0 / 0) 40%, rgb(0 0 0 / 0.55)), url('/scenes/${scene}.jpg') center / cover`

const STEPS: readonly Step[] = [
  {
    background: shaded('fjord'),
    body: 'Save 42 km of route, contour lines and water stops before the signal drops at the head of the fjord.',
    eyebrow: 'Offline maps',
    title: 'Take the fjord trail offline',
  },
  {
    background: '#1d5c58',
    body: 'Hourly wind and rain for every summit on your route, refreshed each morning at 06:00.',
    eyebrow: 'Weather',
    title: 'Know the ridge before you climb it',
  },
  {
    background: shaded('summit'),
    body: 'Send your planned line to two contacts. They see where you should be by now, not where you are.',
    eyebrow: 'Safety',
    title: 'Share the route, not your location',
  },
  {
    background: '#e6c27a',
    body: '1,280 marked trails within a day’s drive, sorted by how much daylight is left.',
    eyebrow: 'Ready',
    ink: '#241c0e',
    title: 'Pick your first trail',
  },
]

const PAGE_OPTIONS = STEPS.map((_, index) => ({ label: String(index + 1), value: String(index) }))

/** One onboarding page: its ground, a skip button at the top, and its words at the foot. */
const Page = ({ compact = false, last, onSkip, step }: { compact?: boolean; last: boolean; onSkip?: () => void; step: Step }) => (
  <div className="lab-swipe-page" data-compact={compact || undefined} style={{ background: step.background, color: step.ink ?? '#fff' }}>
    <div className="lab-swipe-page__top">
      <span>{step.eyebrow}</span>
      {!compact && !last && <LiquidButton onClick={onSkip} size="sm">Skip</LiquidButton>}
    </div>
    <div className="lab-swipe-page__words">
      <h3>{step.title}</h3>
      {!compact && <p>{step.body}</p>}
      {!compact && last && <LiquidButton iconAfter={<ArrowRightIcon size={16} />}>Get started</LiquidButton>}
    </div>
  </div>
)

const Playground = () => {
  const [index, setIndex] = useState(0)
  const [loop, setLoop] = useState(false)
  const lastIndex = STEPS.length - 1

  return (
    <>
      <LabStage height={600} scene="coast" style={{ padding: 16 }}>
        <LiquidSwipe className="lab-swipe" index={index} label="Getting started" loop={loop} onIndexChange={setIndex}>
          {STEPS.map((step, position) => (
            <Page key={step.title} last={position === lastIndex} onSkip={() => setIndex(lastIndex)} step={step} />
          ))}
        </LiquidSwipe>
      </LabStage>
      <LabControls>
        <LabControl label="Page">
          <LiquidSegmented
            label="Page"
            onValueChange={(value) => setIndex(Number(value))}
            options={PAGE_OPTIONS}
            size="sm"
            value={String(index)}
          />
        </LabControl>
        <LabControl label="Loop">
          <LiquidSwitch checked={loop} label="Loop" onCheckedChange={setLoop} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'surfaces',
  demos: [
    {
      code: `import { LiquidSwipe } from '@liquefy-ui/lab'

<LiquidSwipe index={index} label="Getting started" onIndexChange={setIndex}>
  <Page background="url(/fjord.jpg)" title="Take the fjord trail offline" />
  <Page background="#1d5c58" title="Know the ridge before you climb it" />
  <Page background="url(/summit.jpg)" title="Share the route, not your location" />
  <Page background="#e6c27a" title="Pick your first trail" />
</LiquidSwipe>`,
      description:
        'Pull the bulge on the right edge — or anywhere on the page — to the left, and the next page swells in after your finger’s height; let go past the middle, or flick, and it floods across and lands with a slosh. Pull from the left to go back. The glass buttons on the bulges, the arrow keys and the page picker below turn it too; Skip jumps straight to the end.',
      render: () => <Playground />,
      title: 'An onboarding flow',
    },
  ],
  description:
    'Pages turned like Cuberto’s liquid swipe: the next page peeks in at the edge as a bulge, swells like a wave as it is pulled, follows the finger’s height, and floods across the room when let go past the middle or flicked — landing with a slosh before the new handles pop in.',
  importLine: "import { LiquidSwipe } from '@liquefy-ui/lab'",
  inspiredBy: 'Cuberto’s liquid swipe',
  name: 'LiquidSwipe',
  order: 5,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={240} scene="coast" style={{ padding: 12 }}>
      <LiquidSwipe className="lab-swipe" label="Getting started">
        {STEPS.map((step, position) => (
          <Page compact key={step.title} last={position === STEPS.length - 1} step={step} />
        ))}
      </LiquidSwipe>
    </LabStage>
  ),
  props: [
    { description: 'The pages, one child each. Give each its own background: a turn is the next page flooding in over this one.', name: 'children', required: true, type: 'ReactNode' },
    { description: 'The carousel’s accessible name.', name: 'label', required: true, type: 'string' },
    { description: 'Controlled or uncontrolled. A page further than one away comes in on a single wave.', name: 'index, defaultIndex, onIndexChange', defaultValue: '0', type: 'number' },
    { description: 'Whether the last page leads on to the first and the first back to the last.', name: 'loop', defaultValue: 'false', type: 'boolean' },
    { description: 'Each page’s accessible name.', name: 'pageLabel', defaultValue: '(index, count) => `${index + 1} of ${count}`', type: '(index, count) => string' },
    { description: 'The accessible names of the buttons on the two handles.', name: 'previousLabel, nextLabel', defaultValue: "'Previous page', 'Next page'", type: 'string' },
    { description: 'A colour mixed into the glass of the handles’ buttons.', name: 'tint', type: 'string' },
  ],
  slug: 'liquid-swipe',
}
