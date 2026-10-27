import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BellIcon, HeartIcon, LockIcon, LockOpenIcon, StarIcon, SunIcon, XIcon } from '@liquefy-ui/icons'
import { ChangeEffect, type ChangeEffectHandle, type ChangeEffectName } from '@liquefy-ui/lab'
import { LiquidButton, LiquidSegmented, LiquidSlider, LiquidTextField } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const EFFECTS: { effect: ChangeEffectName; icon: ReactNode; label: string }[] = [
  { effect: 'spray', icon: <HeartIcon size={20} />, label: 'Spray' },
  { effect: 'jump', icon: <BellIcon size={20} />, label: 'Jump' },
  { effect: 'shine', icon: <StarIcon size={20} />, label: 'Shine' },
  { effect: 'shake', icon: <XIcon size={20} />, label: 'Shake' },
  { effect: 'glow', icon: <SunIcon size={20} />, label: 'Glow' },
]

/** Milliseconds between one effect and the next when they play in turn. */
const IN_TURN_MS = 520

/** A little less padding than a button's own, so all five fit on one line of the stage. */
const PILL = { px: 4 } as const

const EffectsPlayground = () => {
  const [counts, setCounts] = useState<Record<ChangeEffectName, number>>({ glow: 0, jump: 0, shake: 0, shine: 0, spray: 0 })
  const [speed, setSpeed] = useState(1)
  const timers = useRef<number[]>([])
  const press = (effect: ChangeEffectName) => setCounts((current) => ({ ...current, [effect]: current[effect] + 1 }))

  const inTurn = () => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = EFFECTS.map(({ effect }, index) =>
      window.setTimeout(() => press(effect), (index * IN_TURN_MS) / speed))
  }
  useEffect(() => () => {
    for (const timer of timers.current) window.clearTimeout(timer)
  }, [])

  return (
    <>
      <LabStage height={280} scene="coast">
        <div className="lab-row lab-row--tight" style={{ justifyContent: 'center' }}>
          {EFFECTS.map(({ effect, icon, label }) => (
            <ChangeEffect effect={effect} key={effect} speed={speed} trigger={counts[effect]}>
              <LiquidButton iconBefore={icon} onClick={() => press(effect)} styles={PILL}>{label}</LiquidButton>
            </ChangeEffect>
          ))}
        </div>
      </LabStage>
      <LabControls>
        <LabControl label="Speed" value={`${speed.toFixed(1)}×`}>
          <LiquidSlider aria-label="Speed" max={2} min={0.5} onValueChange={setSpeed} step={0.1} value={speed} />
        </LabControl>
        <LabControl label="All five">
          <div className="lab-row lab-row--tight">
            <LiquidButton onClick={inTurn} size="sm">Play in turn</LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

const TINTS = [
  { label: 'Glass', value: 'glass' },
  { label: 'Rose', value: 'rose' },
  { label: 'Sky', value: 'sky' },
] as const

type TintKey = (typeof TINTS)[number]['value']

/** Left out, the droplets take the provider's tint: the glass's own neutral. */
const TINT_COLORS: Record<TintKey, string | undefined> = { glass: undefined, rose: '#ff6f8e', sky: '#6cb6ff' }

const LikePlayground = () => {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(128)
  const [sprays, setSprays] = useState(0)
  const [tint, setTint] = useState<TintKey>('glass')
  const color = TINT_COLORS[tint]

  // Liking sprays and jumps; taking it back just counts down.
  const toggle = () => {
    setLiked(!liked)
    setLikes((count) => count + (liked ? -1 : 1))
    if (!liked) setSprays((count) => count + 1)
  }

  return (
    <>
      <LabStage height={320} scene="fjord">
        <ChangeEffect effect="spray" tint={color} trigger={sprays}>
          <ChangeEffect effect="jump" trigger={sprays}>
            <LiquidButton
              aria-pressed={liked}
              iconBefore={<HeartIcon fill={liked ? 'currentColor' : 'none'} size={22} style={{ color: liked ? color : undefined }} />}
              onClick={toggle}
              size="lg"
            >
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{likes}</span>
            </LiquidButton>
          </ChangeEffect>
        </ChangeEffect>
      </LabStage>
      <LabControls>
        <LabControl label="Droplets">
          <LiquidSegmented label="Droplets" onValueChange={(value) => setTint(value as TintKey)} options={[...TINTS]} size="sm" value={tint} />
        </LabControl>
        <LabControl label="Liked" value={liked ? 'yes' : 'no'}>
          <div className="lab-row lab-row--tight">
            <LiquidButton onClick={toggle} size="sm">{liked ? 'Unlike' : 'Like'}</LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

const PASSCODE = '2580'

const PasscodePlayground = () => {
  const shake = useRef<ChangeEffectHandle>(null)
  const [value, setValue] = useState('')
  const [unlocks, setUnlocks] = useState(0)
  const [unlocked, setUnlocked] = useState(false)

  // A wrong passcode is wrong again the second time, so the shake is played
  // through its handle rather than from a value that changes.
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value === PASSCODE) {
      setUnlocked(true)
      setUnlocks((count) => count + 1)
    } else {
      setUnlocked(false)
      shake.current?.play()
    }
    setValue('')
  }

  return (
    <>
      <LabStage height={280} scene="summit">
        <form className="lab-row lab-row--tight" onSubmit={submit}>
          <ChangeEffect effect="shake" ref={shake}>
            <ChangeEffect effect="glow" trigger={unlocks}>
              <LiquidTextField
                aria-label="Passcode"
                autoComplete="off"
                inputMode="numeric"
                onChange={(event) => setValue(event.target.value)}
                placeholder="Passcode"
                startAdornment={unlocked ? <LockOpenIcon size={18} /> : <LockIcon size={18} />}
                type="password"
                value={value}
              />
            </ChangeEffect>
          </ChangeEffect>
          <LiquidButton type="submit">Unlock</LiquidButton>
        </form>
      </LabStage>
      <LabControls>
        <LabControl label="Passcode" value={PASSCODE}>
          <div className="lab-row lab-row--tight">
            <LiquidButton onClick={() => setValue(PASSCODE)} size="sm">Fill in</LiquidButton>
          </div>
        </LabControl>
        <LabControl label="State" value={unlocked ? 'unlocked' : 'locked'}>
          <div className="lab-row lab-row--tight">
            <LiquidButton
              onClick={() => {
                setUnlocked(false)
                shake.current?.play()
              }}
              size="sm"
            >
              Try a wrong one
            </LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'effects',
  demos: [
    {
      code: `import { StarIcon } from '@liquefy-ui/icons'
import { ChangeEffect } from '@liquefy-ui/lab'
import { LiquidButton } from '@liquefy-ui/react'

// Once, each time the value changes; never on mount
<ChangeEffect effect="shine" trigger={level}>
  <LiquidButton iconBefore={<StarIcon />}>Pro</LiquidButton>
</ChangeEffect>`,
      description:
        'Press a button to play its effect once. Spray throws glass droplets up out of it; jump hops and lands with a squash it wobbles out of; shine runs a band of light from the top-left corner to the bottom-right; shake shakes it, smaller each time; glow lights it from behind, so the glass bends the light. Play in turn runs all five, one after another.',
      render: () => <EffectsPlayground />,
      title: 'Five effects, one press each',
    },
    {
      code: `import { HeartIcon } from '@liquefy-ui/icons'
import { ChangeEffect } from '@liquefy-ui/lab'
import { LiquidButton } from '@liquefy-ui/react'

// The spray outside, so the droplets stay where they were thrown while the button jumps
<ChangeEffect effect="spray" trigger={likes}>
  <ChangeEffect effect="jump" trigger={likes}>
    <LiquidButton iconBefore={<HeartIcon />} onClick={like}>{likes}</LiquidButton>
  </ChangeEffect>
</ChangeEffect>`,
      description:
        'Effects nest. Liking throws a spray of droplets of every size and makes the button jump; each droplet is a tiny lens with a lit rim and a point of light, in the provider’s tint unless it is given one. Like again before they land and more join them in the air.',
      render: () => <LikePlayground />,
      title: 'A like that sprays',
    },
    {
      code: `import { ChangeEffect } from '@liquefy-ui/lab'
import type { ChangeEffectHandle } from '@liquefy-ui/lab'
import { LiquidTextField } from '@liquefy-ui/react'

const shake = useRef<ChangeEffectHandle>(null)
// A wrong passcode twice is the same value twice, so play it by hand
const submit = () => (code === passcode ? unlock() : shake.current?.play())

<ChangeEffect effect="shake" ref={shake}>
  <LiquidTextField aria-label="Passcode" type="password" />
</ChangeEffect>`,
      description:
        'Enter anything but the passcode, 2580, and the field shakes; enter it and the field glows. The shake plays through the handle, because a wrong passcode is just as wrong the second time and leaves nothing to change.',
      render: () => <PasscodePlayground />,
      title: 'Shake on a wrong passcode',
    },
  ],
  description:
    'Pow’s change effects for the web: wrap something, and each time a value changes it sprays glass droplets, jumps, shines, shakes or glows, once. The motion is on springs that overshoot and settle; nothing it draws is announced, and what it wraps behaves exactly as before.',
  importLine: "import { ChangeEffect } from '@liquefy-ui/lab'",
  inspiredBy: 'Pow change effects',
  name: 'ChangeEffect',
  order: 1,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178} scene="coast">
      <div className="lab-row">
        <ChangeEffect effect="shine" trigger={0}>
          <LiquidButton iconBefore={<StarIcon size={20} />}>Shine</LiquidButton>
        </ChangeEffect>
        <ChangeEffect effect="spray" trigger={0}>
          <LiquidButton iconBefore={<HeartIcon size={20} />}>Spray</LiquidButton>
        </ChangeEffect>
      </div>
    </LabStage>
  ),
  props: [
    { description: 'Which effect plays.', name: 'effect', required: true, type: "'spray' | 'jump' | 'shine' | 'shake' | 'glow'" },
    { description: 'Plays the effect once each time it changes, compared with Object.is, and never on mount. The same as IconEffect’s.', name: 'trigger', type: 'unknown' },
    { defaultValue: '1', description: 'How fast it plays: 2 is twice as fast.', name: 'speed', type: 'number' },
    { description: 'The colour of a glow’s light and of a spray’s droplets. The provider’s tint when left out.', name: 'tint', type: 'string' },
    { description: 'A handle whose play() plays the effect now, for a change that leaves the value as it was.', name: 'ref', type: 'Ref<ChangeEffectHandle>' },
    { description: 'What the effect plays on. Wrapped in an inline-flex box; its behaviour is left as it is.', name: 'children', required: true, type: 'ReactNode' },
    { description: 'Applied to the wrapper.', name: 'className, style', type: 'string, CSSProperties' },
  ],
  slug: 'change-effects',
}
