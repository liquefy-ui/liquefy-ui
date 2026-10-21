import { useState } from 'react'
import { LiquidLevel } from '@liquefy-ui/lab'
import { LiquidButton, LiquidSlider } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const Playground = () => {
  const [value, setValue] = useState(62)

  return (
    <>
      <LabStage scene="coast">
        <div className="lab-row">
          <LiquidLevel label="Water tank" value={value} />
          <LiquidLevel label="Battery" shape="capsule" tint="#34c759" value={value} />
          <LiquidLevel label="Storage" max={512} shape="rounded" tint="#0a84ff" value={(value / 100) * 512}>
            {Math.round((value / 100) * 512)} GB
          </LiquidLevel>
        </div>
      </LabStage>
      <LabControls>
        <LabControl label="Value" value={`${value}%`}>
          <LiquidSlider aria-label="Value" max={100} min={0} onValueChange={setValue} step={1} value={value} />
        </LabControl>
        <LabControl label="Jump">
          <div className="lab-row lab-row--tight">
            <LiquidButton onClick={() => setValue(10)} size="sm">10%</LiquidButton>
            <LiquidButton onClick={() => setValue(90)} size="sm">90%</LiquidButton>
          </div>
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'meters',
  demos: [
    {
      code: `import { LiquidLevel } from '@liquefy-ui/lab'

<LiquidLevel label="Water tank" value={62} />
<LiquidLevel label="Battery" shape="capsule" tint="#34c759" value={35} />
<LiquidLevel label="Storage" max={512} shape="rounded" tint="#0a84ff" value={410}>
  410 GB
</LiquidLevel>`,
      description: 'Jump the value and the level swings past its mark and drops back while the surface sloshes from wall to wall. Hover a vessel and the liquid leans toward the pointer.',
      render: () => <Playground />,
      title: 'Three vessels, one value',
    },
  ],
  description:
    'A glass vessel with liquid inside whose level follows a value. The level overshoots and settles, the surface sloshes and dies away, and the reading turns to the opposite ink where the liquid covers it.',
  importLine: "import { LiquidLevel } from '@liquefy-ui/lab'",
  inspiredBy: 'BAFluidView and WaveProgressView',
  name: 'LiquidLevel',
  order: 1,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178} scene="coast">
      <LiquidLevel label="Water tank" size={110} value={62} />
    </LabStage>
  ),
  props: [
    { description: 'What is being measured; the meter’s accessible name.', name: 'label', required: true, type: 'string' },
    { description: 'The reading, from 0 to max. Out-of-range values are clamped.', name: 'value', required: true, type: 'number' },
    { defaultValue: '100', description: 'The reading that fills the vessel.', name: 'max', type: 'number' },
    { defaultValue: "'circle'", description: 'A circle, an upright capsule half as wide as it is tall, or a rounded rectangle.', name: 'shape', type: "'circle' | 'capsule' | 'rounded'" },
    { defaultValue: '120', description: 'The vessel’s height in pixels; a circle’s diameter.', name: 'size', type: 'number' },
    { description: 'The liquid’s colour, laid on as a translucent wash. Defaults to the provider’s tint.', name: 'tint', type: 'string' },
    { defaultValue: 'true', description: 'Whether the liquid leans toward a pointer over the vessel.', name: 'tilt', type: 'boolean' },
    { description: 'Replaces the percentage in the middle. Drawn twice, once each side of the surface, so keep it stateless.', name: 'children', type: 'ReactNode' },
  ],
  slug: 'liquid-level',
}
