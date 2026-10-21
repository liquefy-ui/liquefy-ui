import { useState } from 'react'
import { DownloadIcon, HeartIcon, ShareIcon } from '@liquefy-ui/icons'
import { MAGNETIC_DEFAULTS, MagneticActions, type MagneticOrientation } from '@liquefy-ui/lab'
import { LiquidSegmented, LiquidSlider } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage } from '../stage'
import type { LabExperiment } from '../types'

const ORIENTATIONS = [
  { label: 'Row', value: 'horizontal' },
  { label: 'Column', value: 'vertical' },
] as const satisfies readonly { label: string; value: MagneticOrientation }[]

const DEFAULT_SPACING = 12

const ACTIONS = [
  { icon: <HeartIcon size={22} />, label: 'Favourite' },
  { icon: <ShareIcon size={22} />, label: 'Share' },
  { icon: <DownloadIcon size={22} />, label: 'Save' },
]

const Playground = () => {
  const [orientation, setOrientation] = useState<MagneticOrientation>('horizontal')
  // As a percentage, so the slider moves in whole steps.
  const [strength, setStrength] = useState(MAGNETIC_DEFAULTS.strength * 100)
  const [reach, setReach] = useState<number>(MAGNETIC_DEFAULTS.reach)
  const [spacing, setSpacing] = useState(DEFAULT_SPACING)

  return (
    <>
      <LabStage height={orientation === 'vertical' ? 380 : 300} scene="coast">
        <MagneticActions
          actions={ACTIONS}
          label="Photo"
          orientation={orientation}
          reach={reach}
          size="lg"
          spacing={spacing}
          strength={strength / 100}
        />
      </LabStage>
      <LabControls>
        <LabControl label="Orientation">
          <LiquidSegmented
            label="Orientation"
            onValueChange={(value) => setOrientation(value as MagneticOrientation)}
            options={[...ORIENTATIONS]}
            size="sm"
            value={orientation}
          />
        </LabControl>
        <LabControl label="Strength" value={`${strength}%`}>
          <LiquidSlider aria-label="Strength" max={100} min={0} onValueChange={setStrength} step={5} value={strength} />
        </LabControl>
        <LabControl label="Reach" value={`${reach} px`}>
          <LiquidSlider aria-label="Reach" max={240} min={20} onValueChange={setReach} step={10} value={reach} />
        </LabControl>
        <LabControl label="Spacing" value={`${spacing} px`}>
          <LiquidSlider aria-label="Spacing" max={30} min={0} onValueChange={setSpacing} step={1} value={spacing} />
        </LabControl>
      </LabControls>
    </>
  )
}

export const experiment: LabExperiment = {
  category: 'menus',
  demos: [
    {
      code: `import { DownloadIcon, HeartIcon, ShareIcon } from '@liquefy-ui/icons'
import { MagneticActions } from '@liquefy-ui/lab'

export const PhotoActions = ({ onFavourite, onShare, onSave }: PhotoActionsProps) => (
  <MagneticActions
    actions={[
      { icon: <HeartIcon size={22} />, label: 'Favourite', onClick: onFavourite },
      { icon: <ShareIcon size={22} />, label: 'Share', onClick: onShare },
      { icon: <DownloadIcon size={22} />, label: 'Save', onClick: onSave },
    ]}
    label="Photo"
    size="lg"
  />
)`,
      description: 'Bring the cursor up to the row: the nearest button reaches for it and its neighbours lean in, and two drawn close enough melt together. Take the cursor away and they spring back past their places. Press one and it gives under the press. From the keyboard it is one tab stop, walked with the arrow keys, and nothing moves.',
      render: () => <Playground />,
      title: 'Actions over a photograph',
    },
  ],
  description:
    'A row of round glass action buttons that reach for the pointer. The nearest is drawn toward a cursor coming close and its neighbours a little, buttons drawn together melt into one body of glass, and when the pointer goes they spring back past their places and settle.',
  importLine: "import { MagneticActions } from '@liquefy-ui/lab'",
  inspiredBy: 'magnetic buttons and SwiftUI GlassEffectContainer',
  name: 'MagneticActions',
  order: 3,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178} scene="coast">
      <MagneticActions actions={ACTIONS} label="Photo" />
    </LabStage>
  ),
  props: [
    { description: 'Each action’s label is its accessible name and tooltip. onClick runs on a click, a tap, Enter or Space; a disabled action stays in the arrow-key order with aria-disabled but neither acts nor moves.', name: 'actions', required: true, type: 'MagneticAction[]' },
    { description: 'The toolbar’s accessible name.', name: 'label', required: true, type: 'string' },
    { defaultValue: "'horizontal'", description: 'Which way the row runs, and which arrow keys walk it.', name: 'orientation', type: "'horizontal' | 'vertical'" },
    { defaultValue: String(MAGNETIC_DEFAULTS.strength), description: '0 to 1: how hard the buttons are drawn toward the pointer. 0 holds them still.', name: 'strength', type: 'number' },
    { defaultValue: String(MAGNETIC_DEFAULTS.reach), description: 'Pixels beyond a button’s edge at which the pointer is first felt.', name: 'reach', type: 'number' },
    { defaultValue: String(DEFAULT_SPACING), description: 'Largest gap, in pixels, that two buttons’ glass still bridges. Kept under gap, they rest apart and melt only when drawn together.', name: 'spacing', type: 'number' },
    { defaultValue: '14', description: 'Clear space between neighbouring buttons at rest, in pixels.', name: 'gap', type: 'number' },
    { defaultValue: "'md'", description: 'Each button’s side: 36, 46 or 56px, as LiquidIconButton.', name: 'size', type: "'sm' | 'md' | 'lg'" },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
  ],
  slug: 'magnetic-actions',
}
