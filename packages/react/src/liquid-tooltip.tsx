import { Tooltip } from '@base-ui/react/tooltip'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { useLiquefyPortalContainer } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// Base UI brings the parts a hand-rolled tooltip almost never gets right: the
// bubble flips and shifts to stay on screen, Escape dismisses it, focus and
// hover share one delay, and touch does not leave it stuck open.

export type LiquidTooltipProps = LiquidStyleProps & {
  children: ReactElement<Record<string, unknown>>
  className?: string
  content: ReactNode
  delay?: number
  placement?: 'top' | 'bottom' | 'left' | 'right'
  style?: CSSProperties
}

export const LiquidTooltip = ({
  children,
  className,
  content,
  delay = 120,
  placement = 'top',
  style,
  styles,
}: LiquidTooltipProps) => {
  const portalContainer = useLiquefyPortalContainer()
  // The wrapper stays the layout box, so className/style/styles keep meaning the
  // same thing they did before the bubble moved into a portal.
  const root = useLiquidStyles('lq-tooltip', { className, style, styles })

  return (
    <span className={root.className} style={root.style}>
      <Tooltip.Root>
        <Tooltip.Trigger delay={delay} render={children} />
        <Tooltip.Portal container={portalContainer ?? undefined}>
          <Tooltip.Positioner className="lq-tooltip__positioner" side={placement} sideOffset={8}>
            <Tooltip.Popup className="lq-tooltip__bubble">{content}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </span>
  )
}
