import { useRef, useState } from 'react'
import { SparklesIcon, StarIcon } from '@liquefy-ui/icons'
import {
  PARTICLE_PRESETS,
  ParticleField,
  type ParticleConfig,
  type ParticleFieldHandle,
  type ParticlePreset,
  type ParticleShape,
} from '@liquefy-ui/lab'
import { GlassCard, LiquidButton, LiquidSegmented, LiquidSelect, LiquidSlider, LiquidSwitch } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const PRESETS: { label: string; value: ParticlePreset }[] = [
  { label: 'Snow', value: 'snow' },
  { label: 'Rain', value: 'rain' },
  { label: 'Bubbles', value: 'bubbles' },
  { label: 'Magic', value: 'magic' },
  { label: 'Confetti', value: 'confetti' },
  { label: 'Fireworks', value: 'fireworks' },
]

/** The field fills the stage; following its rounded corners keeps the particles inside them. */
const FILL_STAGE = { borderRadius: 'inherit', overflow: 'hidden' } as const

/** What the card over the field says about the preset under it: its real numbers. */
const describe = ({ lifetime, rate }: ParticleConfig): string => `${rate} a second, ${lifetime} s each`

const PresetPlayground = () => {
  const [preset, setPreset] = useState<ParticlePreset>('snow')
  const [glass, setGlass] = useState(true)
  const [paused, setPaused] = useState(false)
  const label = PRESETS.find((option) => option.value === preset)?.label ?? preset

  return (
    <>
      <LabStage height={360} scene="fjord">
        <ParticleField paused={paused} preset={preset} style={FILL_STAGE} />
        {glass && (
          <GlassCard description={describe(PARTICLE_PRESETS[preset])} styles={{ w: 300 }} title={label}>
            <span />
          </GlassCard>
        )}
      </LabStage>
      <LabControls>
        <LabControl label="Preset">
          <LiquidSelect aria-label="Preset" onValueChange={(value) => setPreset(value as ParticlePreset)} options={PRESETS} value={preset} />
        </LabControl>
        <LabControl label="Glass in front" value={glass ? 'on' : 'off'}>
          <LiquidSwitch checked={glass} label="Glass in front" onCheckedChange={setGlass} />
        </LabControl>
        <LabControl label="Paused" value={paused ? 'yes' : 'no'}>
          <LiquidSwitch checked={paused} label="Paused" onCheckedChange={setPaused} />
        </LabControl>
      </LabControls>
    </>
  )
}

/** Confetti fired from the button rather than falling from the top: born in the middle, thrown up in a cone. */
const CANNON: Partial<ParticleConfig> = {
  angle: -90,
  drag: 0.9,
  emitter: 'center',
  gravity: 520,
  lifetime: 2.4,
  prewarm: 0,
  rate: 0,
  speed: 560,
  speedVariation: 0.45,
  spread: 70,
}

const OverPlayground = () => {
  const cannon = useRef<ParticleFieldHandle>(null)
  const [sparkling, setSparkling] = useState(true)

  return (
    <>
      <LabStage height={320} scene="summit">
        <div className="lab-row" style={{ gap: 48 }}>
          <ParticleField bleed={28} paused={!sparkling} preset="magic">
            <LiquidButton iconBefore={<SparklesIcon size={20} />} size="lg">Upgrade</LiquidButton>
          </ParticleField>
          <ParticleField bleed={160} config={CANNON} preset="confetti" ref={cannon}>
            <LiquidButton iconBefore={<StarIcon size={20} />} onClick={() => cannon.current?.burst(80)} size="lg">
              Celebrate
            </LiquidButton>
          </ParticleField>
        </div>
      </LabStage>
      <LabControls>
        <LabControl label="Sparkle" value={sparkling ? 'on' : 'off'}>
          <LiquidSwitch checked={sparkling} label="Sparkle" onCheckedChange={setSparkling} />
        </LabControl>
        <LabControl label="Confetti">
          <div className="lab-row lab-row--tight">
            <LiquidButton onClick={() => cannon.current?.burst(80)} size="sm">Fire 80</LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

const SHAPES: { label: string; value: ParticleShape }[] = [
  { label: 'Bead', value: 'bead' },
  { label: 'Bubble', value: 'bubble' },
  { label: 'Flake', value: 'flake' },
  { label: 'Sparkle', value: 'sparkle' },
  { label: 'Confetti', value: 'confetti' },
]

/** A fountain from the middle of the bottom edge: what the sliders start from. */
const FOUNTAIN: Partial<ParticleConfig> = {
  angle: -90,
  colors: ['var(--lq-particle-tint)', '#ffffff'],
  drag: 0.2,
  emitter: { height: 0, width: 0, x: 0.5, y: 1 },
  fadeOut: 0.3,
  limit: 600,
  sizeVariation: 0.5,
  speedVariation: 0.3,
}

const CustomPlayground = () => {
  const [rate, setRate] = useState(60)
  const [speed, setSpeed] = useState(380)
  const [gravity, setGravity] = useState(400)
  const [spread, setSpread] = useState(40)
  const [size, setSize] = useState(10)
  const [lifetime, setLifetime] = useState(2.4)
  const [shape, setShape] = useState<ParticleShape>('bead')

  return (
    <>
      <LabStage height={360} scene="fjord">
        <ParticleField config={{ ...FOUNTAIN, gravity, lifetime, rate, shape, size, speed, spread }} style={FILL_STAGE} />
      </LabStage>
      <LabControls>
        <LabControl label="Shape">
          <LiquidSegmented label="Shape" onValueChange={(value) => setShape(value as ParticleShape)} options={SHAPES} size="sm" value={shape} />
        </LabControl>
        <LabControl label="Rate" value={`${rate} a second`}>
          <LiquidSlider aria-label="Rate" max={200} min={0} onValueChange={setRate} step={5} value={rate} />
        </LabControl>
        <LabControl label="Speed" value={`${speed} px/s`}>
          <LiquidSlider aria-label="Speed" max={700} min={0} onValueChange={setSpeed} step={10} value={speed} />
        </LabControl>
        <LabControl label="Gravity" value={`${gravity} px/s²`}>
          <LiquidSlider aria-label="Gravity" max={800} min={-200} onValueChange={setGravity} step={20} value={gravity} />
        </LabControl>
        <LabControl label="Spread" value={`${spread}°`}>
          <LiquidSlider aria-label="Spread" max={360} min={0} onValueChange={setSpread} step={5} value={spread} />
        </LabControl>
        <LabControl label="Size" value={`${size} px`}>
          <LiquidSlider aria-label="Size" max={24} min={1} onValueChange={setSize} step={1} value={size} />
        </LabControl>
        <LabControl label="Lifetime" value={`${lifetime.toFixed(1)} s`}>
          <LiquidSlider aria-label="Lifetime" max={6} min={0.4} onValueChange={setLifetime} step={0.1} value={lifetime} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'effects',
  demos: [
    {
      code: `import { ParticleField } from '@liquefy-ui/lab'
import { GlassCard } from '@liquefy-ui/react'

// The field fills its positioned parent; the glass after it bends it
<section style={{ position: 'relative' }}>
  <ParticleField preset="snow" />
  <GlassCard title="Snow">…</GlassCard>
</section>`,
      description:
        'Six presets, running behind a glass card that refracts them. Switching keeps what is already in the air: the rain falls out as the snow begins. Pausing stops new particles being born and lets the rest see out their lives.',
      render: () => <PresetPlayground />,
      title: 'Six presets behind glass',
    },
    {
      code: `import { ParticleField } from '@liquefy-ui/lab'
import type { ParticleFieldHandle } from '@liquefy-ui/lab'
import { LiquidButton } from '@liquefy-ui/react'

<ParticleField bleed={28} preset="magic">
  <LiquidButton>Upgrade</LiquidButton>
</ParticleField>

// A cannon: nothing born on its own, a burst on each press
const cannon = useRef<ParticleFieldHandle>(null)
<ParticleField
  bleed={160}
  config={{ angle: -90, emitter: 'center', gravity: 520, rate: 0, speed: 560, spread: 70 }}
  preset="confetti"
  ref={cannon}
>
  <LiquidButton onClick={() => cannon.current?.burst(80)}>Celebrate</LiquidButton>
</ParticleField>`,
      description:
        'Wrapped around something, the field draws over it and spills past its edges by bleed pixels. Magic sparkles around Upgrade; Celebrate fires a burst of confetti from its middle through the handle, with nothing born in between.',
      render: () => <OverPlayground />,
      title: 'Over a button',
    },
    {
      code: `import { ParticleField } from '@liquefy-ui/lab'

<ParticleField
  config={{
    angle: -90,
    emitter: { x: 0.5, y: 1, width: 0, height: 0 },
    gravity: 400,
    lifetime: 2.4,
    rate: 60,
    shape: 'bead',
    size: 10,
    speed: 380,
    spread: 40,
  }}
/>`,
      description:
        'A system of your own, here a fountain of glass beads from the middle of the bottom edge. Every setting can change while it runs; the particles already in the air keep the settings they were born with.',
      render: () => <CustomPlayground />,
      title: 'Your own settings',
    },
  ],
  description:
    'Vortex’s particles for the web: rain, snow, confetti, fireworks, rising bubbles and magic sparkles, or a system of your own, drawn on a canvas behind glass or around a button. It stops drawing off screen and in a background tab, and draws nothing under a provider with motion off.',
  importLine: "import { ParticleField, ParticleSystem } from '@liquefy-ui/lab'",
  inspiredBy: 'Vortex',
  name: 'ParticleField',
  order: 2,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178} scene="fjord">
      <ParticleField preset="snow" seed={7} style={FILL_STAGE} />
      <GlassCard styles={{ w: 180 }} title="Snow">
        <span />
      </GlassCard>
    </LabStage>
  ),
  props: [
    { description: 'Rain, snow, confetti, fireworks, bubbles or magic.', name: 'preset', type: "'rain' | 'snow' | 'confetti' | 'fireworks' | 'bubbles' | 'magic'" },
    { description: 'Settings over the preset’s, or over PARTICLE_DEFAULTS without one: rate, speed, gravity, spread, colors, size, lifetime, shape, emitter and the rest.', name: 'config', type: 'Partial<ParticleConfig>' },
    { description: 'Without them, the field fills its nearest positioned ancestor. With them, it wraps them and draws over or behind them.', name: 'children', type: 'ReactNode' },
    { defaultValue: "'over'", description: 'With children, whether the particles are drawn over them or behind them.', name: 'layer', type: "'over' | 'behind'" },
    { defaultValue: '0', description: 'Pixels the particles are drawn past the field’s edges on every side.', name: 'bleed', type: 'number' },
    { defaultValue: 'false', description: 'Stops new particles being born; the rest see out their lives.', name: 'paused', type: 'boolean' },
    { description: 'Seeds the random numbers, so the field draws the same particles each time it mounts.', name: 'seed', type: 'number' },
    { description: 'What var(--lq-particle-tint) in a colour list stands for. The provider’s tint when left out.', name: 'tint', type: 'string' },
    { description: 'A handle whose burst(count) bears that many particles at once.', name: 'ref', type: 'Ref<ParticleFieldHandle>' },
  ],
  slug: 'particles',
}
