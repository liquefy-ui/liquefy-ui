import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@liquefy-ui/icons'
import { FLUID_DEFAULTS, FluidBackdrop } from '@liquefy-ui/lab'
import { LiquidIconButton, LiquidProgress, LiquidSegmented, LiquidSlider, LiquidSurface } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import type { LabExperiment } from '../types'

const PALETTES = {
  ember: ['#ff5a36', '#ffb03a', '#e0245e', '#ffd9a0'],
  lagoon: ['#0fb5ae', '#1f6fe0', '#7fe3c4', '#f2c14e'],
  moss: ['#2f9e62', '#a7d46f', '#0f6b5c', '#e7e3a1'],
  tint: undefined,
} as const satisfies Record<string, readonly string[] | undefined>

type PaletteKey = keyof typeof PALETTES

const PALETTE_OPTIONS = [
  { label: 'Lagoon', value: 'lagoon' },
  { label: 'Ember', value: 'ember' },
  { label: 'Moss', value: 'moss' },
  { label: 'Tint', value: 'tint' },
] as const satisfies readonly { label: string; value: PaletteKey }[]

/** A player laid on the water: one pane of glass with a transport of glass buttons. */
const NowPlaying = () => {
  const [playing, setPlaying] = useState(true)
  return (
    <LiquidSurface radius={28} style={{ color: '#fff', display: 'grid', gap: 16, padding: 20, width: 'min(320px, 100%)' }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', opacity: 0.72, textTransform: 'uppercase' }}>
          Now playing
        </span>
        <strong style={{ fontSize: 20, fontWeight: 700 }}>Clair de lune</strong>
        <span style={{ fontSize: 14, opacity: 0.8 }}>Claude Debussy · Suite bergamasque</span>
      </div>
      <LiquidProgress label="Elapsed" max={302} value={118} />
      <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
        <LiquidIconButton label="Previous" shape="circle"><ChevronLeftIcon size={20} /></LiquidIconButton>
        <LiquidIconButton label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} shape="circle" size="lg">
          {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        </LiquidIconButton>
        <LiquidIconButton label="Next" shape="circle"><ChevronRightIcon size={20} /></LiquidIconButton>
      </div>
    </LiquidSurface>
  )
}

const Playground = () => {
  const [palette, setPalette] = useState<PaletteKey>('lagoon')
  // As percentages, so the sliders move in whole steps.
  const [speed, setSpeed] = useState(FLUID_DEFAULTS.speed * 100)
  const [stir, setStir] = useState(FLUID_DEFAULTS.stir * 100)
  const [iterations, setIterations] = useState<number>(FLUID_DEFAULTS.pressureIterations)
  const [vorticity, setVorticity] = useState<number>(FLUID_DEFAULTS.vorticity)

  return (
    <>
      <FluidBackdrop
        className="lab-backdrop"
        colors={PALETTES[palette]}
        pressureIterations={iterations}
        speed={speed / 100}
        stir={stir / 100}
        style={{ height: 420 }}
        vorticity={vorticity}
      >
        <NowPlaying />
      </FluidBackdrop>
      <LabControls>
        <LabControl label="Colours">
          <LiquidSegmented
            label="Colours"
            onValueChange={(value) => setPalette(value as PaletteKey)}
            options={[...PALETTE_OPTIONS]}
            size="sm"
            value={palette}
          />
        </LabControl>
        <LabControl label="Speed" value={`${speed}%`}>
          <LiquidSlider aria-label="Speed" max={200} min={0} onValueChange={setSpeed} step={10} value={speed} />
        </LabControl>
        <LabControl label="Stirring by itself" value={`${stir}%`}>
          <LiquidSlider aria-label="Stirring by itself" max={100} min={0} onValueChange={setStir} step={5} value={stir} />
        </LabControl>
        <LabControl label="Pressure iterations" value={iterations}>
          <LiquidSlider aria-label="Pressure iterations" max={60} min={1} onValueChange={setIterations} step={1} value={iterations} />
        </LabControl>
        <LabControl label="Swirl" value={vorticity}>
          <LiquidSlider aria-label="Swirl" max={50} min={0} onValueChange={setVorticity} step={1} value={vorticity} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'backdrops',
  demos: [
    {
      code: `import { FluidBackdrop } from '@liquefy-ui/lab'
import { LiquidSurface } from '@liquefy-ui/react'

<FluidBackdrop colors={['#0fb5ae', '#1f6fe0', '#7fe3c4', '#f2c14e']} style={{ height: 420 }}>
  <LiquidSurface radius={28}>…</LiquidSurface>
</FluidBackdrop>`,
      description: 'Move a pointer anywhere over it — over the glass and its buttons too — and the colour swirls after it. Leave it and it keeps turning on its own. Fewer pressure iterations are cheaper; too few and the water starts to compress and the swirls go soft.',
      render: () => <Playground />,
      title: 'Water under glass',
    },
  ],
  description:
    'Moving water with colour poured in, to sit behind glass. A pointer stirs it, and when nobody does it slowly stirs itself. It is a real fluid simulation on the GPU — Jos Stam’s stable fluids — with a coarse grid for the water and a finer one for the colour.',
  importLine: "import { FluidBackdrop } from '@liquefy-ui/lab'",
  inspiredBy: 'Pavel Dobryakov’s WebGL Fluid Simulation',
  name: 'FluidBackdrop',
  order: 1,
  package: '@liquefy-ui/lab',
  preview: () => (
    <FluidBackdrop className="lab-backdrop" colors={PALETTES.lagoon} dyeResolution={256} resolution={64} style={{ height: 178 }}>
      <LiquidSurface radius={22} style={{ color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 18px' }}>
        Clair de lune
      </LiquidSurface>
    </FluidBackdrop>
  ),
  props: [
    { description: 'The colours poured into the water, any CSS colours.', defaultValue: 'the tint, spread', name: 'colors', type: 'readonly string[]' },
    { description: 'The colour the palette is spread from when there are no colors.', defaultValue: 'provider tint', name: 'tint', type: 'string' },
    { description: 'What the colour floats on.', defaultValue: 'a deep shade of the first colour', name: 'background', type: 'string' },
    { defaultValue: '1', description: 'How fast time runs. 0 holds the water still.', name: 'speed', type: 'number' },
    { defaultValue: '0.5', description: 'How hard the water stirs itself when nobody is touching it, 0 to 1.', name: 'stir', type: 'number' },
    { defaultValue: 'true', description: 'Whether a pointer over the backdrop stirs it.', name: 'interactive', type: 'boolean' },
    { defaultValue: '20', description: 'Jacobi iterations of the pressure solve per frame, 1 to 80.', name: 'pressureIterations', type: 'number' },
    { defaultValue: '22', description: 'How strongly small eddies are kept spinning, 0 to 80.', name: 'vorticity', type: 'number' },
    { defaultValue: '0.22', description: 'How fast the colour fades, per second.', name: 'fade', type: 'number' },
    { defaultValue: '128', description: 'Cells across the short side of the velocity grid.', name: 'resolution', type: 'number' },
    { defaultValue: '512', description: 'Cells across the short side of the colour, never more than the canvas has pixels.', name: 'dyeResolution', type: 'number' },
    { defaultValue: '1', description: 'Most device pixels per CSS pixel the canvas is drawn at.', name: 'maxPixelRatio', type: 'number' },
    { description: 'Laid over the water.', name: 'children', type: 'ReactNode' },
  ],
  slug: 'fluid-backdrop',
}
