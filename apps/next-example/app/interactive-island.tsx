'use client'

import { LiquidButton, LiquidSelect, LiquidSwitch, LiquidTooltip } from '@liquefy-ui/react'
import { useState } from 'react'

const options = [
  { label: 'Clear', value: 'clear' },
  { label: 'Regular', value: 'regular' },
  { label: 'Solid', value: 'solid' },
]

/**
 * The other half of the test: components that own state, used from a real client
 * component. Anything that only works because the whole tree happened to be
 * client-side would still pass here, which is why `page.tsx` stays a server component.
 */
export const InteractiveIsland = () => {
  const [material, setMaterial] = useState('regular')
  const [motion, setMotion] = useState(true)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <LiquidSelect label="Material" onValueChange={setMaterial} options={options} value={material} />
      <LiquidSwitch checked={motion} label="Motion" onCheckedChange={setMotion} />
      <LiquidTooltip content={`Material: ${material}`}>
        <LiquidButton>Hover me</LiquidButton>
      </LiquidTooltip>
    </div>
  )
}
