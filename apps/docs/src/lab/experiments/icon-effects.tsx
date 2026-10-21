import { useState, type ComponentType, type ReactNode } from 'react'
import {
  BellIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  HeartIcon,
  InfoIcon,
  LockIcon,
  LockOpenIcon,
  MailIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  XIcon,
  type IconProps,
} from '@liquefy-ui/icons'
import {
  IconEffect,
  MagicReplace,
  type IconDrawOrder,
  type MagicReplaceTransition,
} from '@liquefy-ui/icons/effects'
import { LiquidButton, LiquidIconButton, LiquidSegmented, LiquidSelect, LiquidSlider, LiquidSwitch } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

type Counts = Record<'bounce' | 'breathe' | 'draw' | 'rotate' | 'wiggle', number>

const BOUNCE_DIRECTIONS = [
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
] as const

const WIGGLE_DIRECTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Rock', value: 'clockwise' },
] as const

/** A little less padding than a button's own, so all five fit on one line of the stage. */
const PILL = { px: 4 } as const

const EffectsPlayground = () => {
  const [counts, setCounts] = useState<Counts>({ bounce: 0, breathe: 0, draw: 0, rotate: 0, wiggle: 0 })
  const [bounce, setBounce] = useState<'down' | 'up'>('up')
  const [wiggle, setWiggle] = useState<'clockwise' | 'left' | 'right'>('left')
  const [repeat, setRepeat] = useState(false)
  const [speed, setSpeed] = useState(1)
  const press = (effect: keyof Counts) => setCounts((current) => ({ ...current, [effect]: current[effect] + 1 }))

  return (
    <>
      <LabStage height={260} scene="fjord">
        <div className="lab-row lab-row--tight" style={{ justifyContent: 'center' }}>
          <LiquidButton
            iconBefore={(
              <IconEffect active={repeat} direction={bounce} effect="bounce" speed={speed} trigger={counts.bounce}>
                <HeartIcon size={20} />
              </IconEffect>
            )}
            onClick={() => press('bounce')}
            styles={PILL}
          >
            Bounce
          </LiquidButton>
          <LiquidButton
            iconBefore={(
              <IconEffect active={repeat} direction={wiggle} effect="wiggle" speed={speed} trigger={counts.wiggle}>
                <BellIcon size={20} />
              </IconEffect>
            )}
            onClick={() => press('wiggle')}
            styles={PILL}
          >
            Wiggle
          </LiquidButton>
          <LiquidButton
            iconBefore={(
              <IconEffect active={repeat} effect="breathe" speed={speed} trigger={counts.breathe}>
                <SparklesIcon size={20} />
              </IconEffect>
            )}
            onClick={() => press('breathe')}
            styles={PILL}
          >
            Breathe
          </LiquidButton>
          <LiquidButton
            iconBefore={(
              <IconEffect active={repeat} effect="rotate" speed={speed} trigger={counts.rotate}>
                <SettingsIcon size={20} />
              </IconEffect>
            )}
            onClick={() => press('rotate')}
            styles={PILL}
          >
            Rotate
          </LiquidButton>
          <LiquidButton
            iconBefore={(
              <IconEffect effect="draw" speed={speed} trigger={counts.draw}>
                <CircleCheckIcon size={20} />
              </IconEffect>
            )}
            onClick={() => press('draw')}
            styles={PILL}
          >
            Draw
          </LiquidButton>
        </div>
      </LabStage>
      <LabControls>
        <LabControl label="Bounce">
          <LiquidSegmented label="Bounce direction" onValueChange={(value) => setBounce(value as 'down' | 'up')} options={[...BOUNCE_DIRECTIONS]} size="sm" value={bounce} />
        </LabControl>
        <LabControl label="Wiggle">
          <LiquidSegmented label="Wiggle direction" onValueChange={(value) => setWiggle(value as 'clockwise' | 'left' | 'right')} options={[...WIGGLE_DIRECTIONS]} size="sm" value={wiggle} />
        </LabControl>
        <LabControl label="Keep going" value={repeat ? 'active' : 'off'}>
          <LiquidSwitch checked={repeat} label="Keep going" onCheckedChange={setRepeat} />
        </LabControl>
        <LabControl label="Speed" value={`${speed.toFixed(1)}×`}>
          <LiquidSlider aria-label="Speed" max={2} min={0.5} onValueChange={setSpeed} step={0.1} value={speed} />
        </LabControl>
      </LabControls>
    </>
  )
}

const DRAW_ICONS = {
  check: CircleCheckIcon,
  mail: MailIcon,
  settings: SettingsIcon,
  sun: SunIcon,
} satisfies Record<string, ComponentType<IconProps>>

const DRAW_OPTIONS = [
  { label: 'Check in a circle', value: 'check' },
  { label: 'Envelope', value: 'mail' },
  { label: 'Gear', value: 'settings' },
  { label: 'Sun and rays', value: 'sun' },
]

const STROKE_OPTIONS = [
  { label: 'One by one', value: 'sequential' },
  { label: 'Together', value: 'together' },
] as const

/** A large glass disc to hold one icon up on: what the draw and replace demos show their icon in. */
const Hero = ({ children, label, onPress }: { children: ReactNode; label: string; onPress: () => void }) => (
  <LiquidIconButton label={label} onClick={onPress} styles={{ size: 112 }}>
    {children}
  </LiquidIconButton>
)

const DrawPlayground = () => {
  const [icon, setIcon] = useState<keyof typeof DRAW_ICONS>('check')
  const [drawn, setDrawn] = useState(true)
  const [strokes, setStrokes] = useState<IconDrawOrder>('sequential')
  const [again, setAgain] = useState(0)
  const Icon = DRAW_ICONS[icon]

  return (
    <>
      <LabStage height={300} scene="coast">
        <Hero label={drawn ? 'Draw off' : 'Draw on'} onPress={() => setDrawn((value) => !value)}>
          <IconEffect drawn={drawn} effect="draw" strokes={strokes} trigger={again}>
            <Icon size={56} strokeWidth={1.6} />
          </IconEffect>
        </Hero>
      </LabStage>
      <LabControls>
        <LabControl label="Icon">
          <LiquidSelect
            aria-label="Icon"
            onValueChange={(value) => {
              setIcon(value as keyof typeof DRAW_ICONS)
              setDrawn(true)
              setAgain((count) => count + 1)
            }}
            options={DRAW_OPTIONS}
            value={icon}
          />
        </LabControl>
        <LabControl label="Strokes">
          <LiquidSegmented label="Strokes" onValueChange={(value) => setStrokes(value as IconDrawOrder)} options={[...STROKE_OPTIONS]} size="sm" value={strokes} />
        </LabControl>
        <LabControl label="Drawn" value={drawn ? 'on' : 'off'}>
          <LiquidSwitch checked={drawn} label="Drawn" onCheckedChange={setDrawn} />
        </LabControl>
        <LabControl label="Draw on again">
          <div className="lab-row lab-row--tight">
            <LiquidButton disabled={!drawn} onClick={() => setAgain((count) => count + 1)} size="sm">Redraw</LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

/** Icons to swap between, in order. The first three have strokes in common; the last two do not. */
const PAIRS = {
  chevron: [ChevronDownIcon, ChevronUpIcon],
  lock: [LockIcon, LockOpenIcon],
  media: [PlayIcon, PauseIcon],
  plus: [PlusIcon, XIcon],
  status: [CircleCheckIcon, CircleAlertIcon, InfoIcon, ClockIcon],
} satisfies Record<string, ComponentType<IconProps>[]>

const PAIR_OPTIONS = [
  { label: 'Lock and open lock', value: 'lock' },
  { label: 'Four status marks', value: 'status' },
  { label: 'Chevron down and up', value: 'chevron' },
  { label: 'Plus and close', value: 'plus' },
  { label: 'Play and pause', value: 'media' },
]

const TRANSITION_OPTIONS = [
  { label: 'Magic', value: 'magic' },
  { label: 'Scale', value: 'scale' },
  { label: 'Draw', value: 'draw' },
] as const

const ReplacePlayground = () => {
  const [pair, setPair] = useState<keyof typeof PAIRS>('lock')
  const [index, setIndex] = useState(0)
  const [transition, setTransition] = useState<MagicReplaceTransition>('magic')
  const icons = PAIRS[pair]
  const Icon = icons[index % icons.length]!
  const next = () => setIndex((value) => value + 1)

  return (
    <>
      <LabStage height={300} scene="summit">
        <Hero label="Replace" onPress={next}>
          <MagicReplace transition={transition}>
            <Icon key={`${pair}-${index % icons.length}`} size={56} strokeWidth={1.6} />
          </MagicReplace>
        </Hero>
      </LabStage>
      <LabControls>
        <LabControl label="Icons">
          <LiquidSelect
            aria-label="Icons"
            onValueChange={(value) => {
              setPair(value as keyof typeof PAIRS)
              setIndex(0)
            }}
            options={PAIR_OPTIONS}
            value={pair}
          />
        </LabControl>
        <LabControl label="Transition">
          <LiquidSegmented label="Transition" onValueChange={(value) => setTransition(value as MagicReplaceTransition)} options={[...TRANSITION_OPTIONS]} size="sm" value={transition} />
        </LabControl>
        <LabControl label="Next icon" value={`${(index % icons.length) + 1} of ${icons.length}`}>
          <div className="lab-row lab-row--tight">
            <LiquidButton onClick={next} size="sm">Replace</LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'icons',
  demos: [
    {
      code: `import { BellIcon, HeartIcon, SettingsIcon } from '@liquefy-ui/icons'
import { IconEffect } from '@liquefy-ui/icons/effects'

// Once, each time the value changes
<IconEffect effect="bounce" trigger={likes}>
  <HeartIcon />
</IconEffect>
<IconEffect direction="clockwise" effect="wiggle" trigger={unread}>
  <BellIcon />
</IconEffect>

// Over and over while it is true, then to rest
<IconEffect active={syncing} effect="rotate">
  <SettingsIcon />
</IconEffect>`,
      description:
        'Press a button to play its icon’s effect once. Keep going plays the first four over and over until it is switched off, and each comes to rest rather than stopping dead: a spin finishes its turn and swings past upright, a breath sinks back.',
      render: () => <EffectsPlayground />,
      title: 'Five effects, one press each',
    },
    {
      code: `import { CircleCheckIcon } from '@liquefy-ui/icons'
import { IconEffect } from '@liquefy-ui/icons/effects'

<IconEffect drawn={saved} effect="draw">
  <CircleCheckIcon />
</IconEffect>`,
      description:
        'Draw On traces each stroke in the order the icon was drawn, the circle first and the tick after it; Draw Off takes them away in reverse. Flip it mid-way and it turns round from where it is. Together draws every stroke at once.',
      render: () => <DrawPlayground />,
      title: 'Draw On and Draw Off',
    },
    {
      code: `import { LockIcon, LockOpenIcon } from '@liquefy-ui/icons'
import { MagicReplace } from '@liquefy-ui/icons/effects'

<MagicReplace>
  {locked ? <LockIcon /> : <LockOpenIcon />}
</MagicReplace>`,
      description:
        'Magic keeps what two icons share. The lock keeps its body and lifts its shackle; the status marks keep their circle and redraw what is inside it; a chevron and a plus bend into their partners. Play and pause have nothing in common, so they shrink and grow instead.',
      render: () => <ReplacePlayground />,
      title: 'Magic Replace',
    },
  ],
  description:
    'SF Symbols’ effects for the icons: a bounce, a wiggle, a breath, a spin, strokes drawn on and off, and Magic Replace. Each one runs on a spring and settles with a little overshoot, and stays still under a provider with motion off.',
  importLine: "import { IconEffect, MagicReplace } from '@liquefy-ui/icons/effects'",
  inspiredBy: 'SF Symbols symbol effects',
  name: 'Icon effects',
  order: 1,
  package: '@liquefy-ui/icons',
  preview: () => (
    <LabStage height={178} scene="fjord">
      <div className="lab-row">
        <LiquidIconButton label="Syncing" size="lg">
          <IconEffect active effect="rotate"><SettingsIcon size={22} /></IconEffect>
        </LiquidIconButton>
        <LiquidIconButton label="Recording" size="lg">
          <IconEffect active effect="breathe"><HeartIcon size={22} /></IconEffect>
        </LiquidIconButton>
        <LiquidIconButton label="Ringing" size="lg">
          <IconEffect active direction="clockwise" effect="wiggle"><BellIcon size={22} /></IconEffect>
        </LiquidIconButton>
      </div>
    </LabStage>
  ),
  props: [
    { description: 'Which effect plays.', name: 'effect', required: true, type: "'bounce' | 'wiggle' | 'breathe' | 'rotate' | 'draw'" },
    { description: 'Plays the effect once each time it changes, never on mount: SF Symbols’ value:. For draw, draws the icon on afresh.', name: 'trigger', type: 'unknown' },
    { defaultValue: 'false', description: 'Plays the effect over and over while true, and lets it come to rest when it turns false: SF Symbols’ isActive:. Not for draw.', name: 'active', type: 'boolean' },
    { defaultValue: 'true', description: 'draw only. Turning true draws the strokes on, false draws them off in reverse; false on mount renders the icon hidden, keeping its space.', name: 'drawn', type: 'boolean' },
    { defaultValue: "'sequential'", description: 'draw only. One stroke after another in the order the icon was written, or all at once.', name: 'strokes', type: "'sequential' | 'together'" },
    { description: 'bounce: up (crouch and hop, the default) or down. wiggle: left (the default), right, up, down, clockwise, counterClockwise, or a heading in degrees. rotate: clockwise (the default) or counterClockwise.', name: 'direction', type: 'string | number' },
    { defaultValue: '12', description: 'wiggle only. How far a clockwise or counterClockwise wiggle rocks, in degrees.', name: 'angle', type: 'number' },
    { defaultValue: '1', description: 'How fast it plays: 2 is twice as fast.', name: 'speed', type: 'number' },
    { description: 'False holds the icon still. Left out, the nearest LiquefyProvider’s motion decides; prefers-reduced-motion is never read.', name: 'motion', type: 'boolean' },
    { description: 'On MagicReplace: magic keeps the strokes two icons share, scale shrinks one away as the other grows in, draw draws one off and the other on.', name: 'transition', type: "'magic' | 'scale' | 'draw'" },
    { defaultValue: "'scale'", description: 'On MagicReplace: what magic does when the two icons share nothing.', name: 'fallback', type: "'scale' | 'draw'" },
    { description: 'The icon. On MagicReplace, a different component or key starts a replacement.', name: 'children', required: true, type: 'ReactElement' },
  ],
  propsTitle: 'IconEffect and MagicReplace',
  slug: 'icon-effects',
}
