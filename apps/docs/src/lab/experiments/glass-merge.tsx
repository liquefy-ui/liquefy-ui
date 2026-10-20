import { useState } from 'react'
import { GlassMerge, type GlassMergeShape } from '@liquefy-ui/lab'
import { LiquidSlider } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

/** The surface needs room around its shapes for the cast shadow: 30px to the sides, 40px below. */
const WIDTH = 380
const HEIGHT = 220

const circle = (x: number, y: number, r: number): GlassMergeShape => ({ height: r * 2, radius: r, width: r * 2, x, y })

const Playground = () => {
  const [gap, setGap] = useState(12)
  const [spacing, setSpacing] = useState(16)
  const left = circle(130, 96, 46)
  // The gap is measured edge to edge, so the second circle moves out as it grows.
  const right = circle(130 + 46 + gap + 34, 96, 34)

  return (
    <>
      <LabStage>
        <GlassMerge shapes={[left, right]} spacing={spacing} style={{ height: HEIGHT, width: WIDTH }} />
      </LabStage>
      <LabControls>
        <LabControl label="Gap" value={`${gap} px`}>
          <LiquidSlider aria-label="Gap" max={60} min={-20} onValueChange={setGap} step={1} value={gap} />
        </LabControl>
        <LabControl label="Spacing" value={`${spacing} px`}>
          <LiquidSlider aria-label="Spacing" max={40} min={0} onValueChange={setSpacing} step={1} value={spacing} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'surfaces',
  demos: [
    {
      code: `import { GlassMerge } from '@liquefy-ui/lab'

const circle = (x, y, r) => ({ x, y, width: r * 2, height: r * 2, radius: r })

<GlassMerge
  shapes={[circle(130, 96, 46), circle(222, 96, 34)]}
  spacing={16}
  style={{ width: 380, height: 220 }}
/>`,
      description: 'Close the gap and a neck of glass grows between the two before they touch; open it past the spacing and the neck lets go.',
      render: () => <Playground />,
      title: 'Two shapes and the neck between them',
    },
  ],
  description:
    'Glass shapes that melt into one another when they come within spacing of each other, refracting through the join. One surface draws them all, and motion code moves them once a frame through a ref without re-rendering.',
  importLine: "import { GlassMerge } from '@liquefy-ui/lab'",
  inspiredBy: 'SwiftUI GlassEffectContainer',
  name: 'GlassMerge',
  order: 1,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178}>
      <GlassMerge shapes={[circle(100, 70, 36), circle(166, 70, 26)]} spacing={16} style={{ height: 160, width: 260 }} />
    </LabStage>
  ),
  props: [
    { description: 'Shapes for a layout that holds still: { x, y, width, height, radius } with x and y the centre, plus an optional stretch along an angle.', name: 'shapes', type: 'GlassMergeShape[]' },
    { defaultValue: '16', description: 'Largest gap, in pixels, that two shapes still bridge.', name: 'spacing', type: 'number' },
    { defaultValue: '14', description: 'Width of the refracting band at the rim, in pixels.', name: 'bezel', type: 'number' },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
    { description: 'Interactive content, laid over the glass. The glass itself never takes the pointer.', name: 'children', type: 'ReactNode' },
  ],
  slug: 'glass-merge',
}
