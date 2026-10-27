import { useState } from 'react'
import { SunIcon } from '@liquefy-ui/icons'
import { MESH_DEFAULTS, MeshGradient } from '@liquefy-ui/lab'
import { LiquidSegmented, LiquidSlider, LiquidSurface } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import type { LabExperiment } from '../types'

const PALETTES = {
  dawn: ['#f4683c', '#f9b16e', '#d63d6b', '#4a5fd8', '#f08aa6', '#e9822b'],
  lagoon: ['#0fb5ae', '#1f6fe0', '#7fe3c4', '#f2c14e', '#0b4f8a'],
  moss: ['#2f9e62', '#a7d46f', '#0f6b5c', '#e7e3a1', '#5fbf8f'],
  tint: undefined,
} as const satisfies Record<string, readonly string[] | undefined>

type PaletteKey = keyof typeof PALETTES

const PALETTE_OPTIONS = [
  { label: 'Dawn', value: 'dawn' },
  { label: 'Lagoon', value: 'lagoon' },
  { label: 'Moss', value: 'moss' },
  { label: 'Tint', value: 'tint' },
] as const satisfies readonly { label: string; value: PaletteKey }[]

const HOURS = [
  ['10:00', '17°'],
  ['11:00', '18°'],
  ['12:00', '20°'],
  ['13:00', '21°'],
] as const

/** A weather widget: one pane of glass, which bends the colour flowing under it. */
const Weather = () => (
  <LiquidSurface radius={28} style={{ color: '#fff', display: 'grid', gap: 16, padding: 20, textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', width: 'min(300px, 100%)' }}>
    <div style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Kyoto</span>
        <strong style={{ fontSize: 48, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}>18°</strong>
      </div>
      <SunIcon size={28} />
    </div>
    <span style={{ fontSize: 14, opacity: 0.85 }}>Mostly sunny · H 22° L 13°</span>
    <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center' }}>
      {HOURS.map(([hour, degrees]) => (
        <div key={hour} style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.72 }}>{hour}</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{degrees}</span>
        </div>
      ))}
    </div>
  </LiquidSurface>
)

const Playground = () => {
  const [palette, setPalette] = useState<PaletteKey>('dawn')
  const [grid, setGrid] = useState<number>(MESH_DEFAULTS.columns)
  // As percentages, so the sliders move in whole steps.
  const [speed, setSpeed] = useState(MESH_DEFAULTS.speed * 100)
  const [wander, setWander] = useState(MESH_DEFAULTS.wander * 100)

  return (
    <>
      <MeshGradient
        className="lab-backdrop"
        colors={PALETTES[palette]}
        columns={grid}
        rows={grid}
        speed={speed / 100}
        style={{ height: 400 }}
        wander={wander / 100}
      >
        <Weather />
      </MeshGradient>
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
        <LabControl label="Points" value={`${grid} × ${grid}`}>
          <LiquidSlider aria-label="Points" max={6} min={2} onValueChange={setGrid} step={1} value={grid} />
        </LabControl>
        <LabControl label="Speed" value={`${speed}%`}>
          <LiquidSlider aria-label="Speed" max={300} min={0} onValueChange={setSpeed} step={10} value={speed} />
        </LabControl>
        <LabControl label="Wander" value={`${wander}%`}>
          <LiquidSlider aria-label="Wander" max={45} min={0} onValueChange={setWander} step={5} value={wander} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'backdrops',
  demos: [
    {
      code: `import { MeshGradient } from '@liquefy-ui/lab'
import { LiquidSurface } from '@liquefy-ui/react'

<MeshGradient colors={['#f4683c', '#f9b16e', '#d63d6b', '#4a5fd8', '#f08aa6', '#e9822b']} style={{ height: 400 }}>
  <LiquidSurface radius={28}>…</LiquidSurface>
</MeshGradient>`,
      description: 'Colours pinned to a grid of points, blended smoothly between them, with the points drifting round their places. Edge points slide along their edge and the corners stay put, so the colour always reaches every side. More points give a busier picture at the same cost.',
      render: () => <Playground />,
      title: 'A widget on a moving wallpaper',
    },
  ],
  description:
    'A gradient in the manner of SwiftUI’s MeshGradient: a colour on every point of a grid, blended between them, and the points slowly drifting so the colour flows. Made to sit behind glass, and much lighter than FluidBackdrop — one draw a frame, nothing simulated.',
  importLine: "import { MeshGradient } from '@liquefy-ui/lab'",
  inspiredBy: 'SwiftUI MeshGradient',
  name: 'MeshGradient',
  order: 2,
  package: '@liquefy-ui/lab',
  preview: () => (
    <MeshGradient className="lab-backdrop" colors={PALETTES.dawn} style={{ height: 178 }}>
      <LiquidSurface radius={22} style={{ color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 18px', textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)' }}>
        Kyoto 18°
      </LiquidSurface>
    </MeshGradient>
  ),
  props: [
    { description: 'One CSS colour per point, row by row. A shorter list is repeated so neighbours differ.', defaultValue: 'the tint, spread', name: 'colors', type: 'readonly string[]' },
    { description: 'The colour the palette is spread from when there are no colors.', defaultValue: 'provider tint', name: 'tint', type: 'string' },
    { defaultValue: '3', description: 'Points across each row, 2 to 8.', name: 'columns', type: 'number' },
    { defaultValue: '3', description: 'Points down each column, 2 to 8.', name: 'rows', type: 'number' },
    { defaultValue: '1', description: 'How fast the points drift. 0 holds them still.', name: 'speed', type: 'number' },
    { defaultValue: '0.3', description: 'How far a point strays from its place, in cells, 0 to 0.45.', name: 'wander', type: 'number' },
    { defaultValue: '1', description: 'Most device pixels per CSS pixel the canvas is drawn at.', name: 'maxPixelRatio', type: 'number' },
    { description: 'Laid over the gradient.', name: 'children', type: 'ReactNode' },
  ],
  slug: 'mesh-gradient',
}
