import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { LiquidVariant } from '@liquefy-ui/core'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidCustomProperties, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidSurfaceProps = HTMLAttributes<HTMLDivElement> & LiquidStyleProps & {
  children?: ReactNode
  intensity?: number
  interactive?: boolean
  lens?: boolean
  radius?: number | string
  tint?: string
  variant?: LiquidVariant
  webgl?: boolean
}

export const LiquidSurface = forwardRef<HTMLDivElement, LiquidSurfaceProps>(({
  children,
  className,
  intensity,
  interactive = true,
  lens,
  radius,
  style,
  styles,
  tint,
  variant = 'clear',
  webgl,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const resolvedIntensity = intensity ?? config.intensity
  const resolvedTint = tint ?? config.tint
  const resolvedWebgl = webgl ?? config.webgl
  const resolvedLens = lens ?? config.lens
  const [elementRef, canvasRef] = useLiquidGlass(forwardedRef, {
    disabled: !interactive,
    intensity: resolvedIntensity,
    lens: resolvedLens && config.transparency,
    motion: interactive && config.motion,
    tint: resolvedTint,
    webgl: resolvedWebgl,
    wobbliness: config.wobbliness,
  })
  const vars: LiquidCustomProperties = {
    '--lq-local-intensity': resolvedIntensity,
    '--lq-radius': typeof radius === 'number' ? `${radius}px` : radius ?? 'var(--lq-radius-default)',
    '--lq-tint': resolvedTint,
  }
  const root = useLiquidStyles('lq-surface', { className, style, styles, vars })

  return (
    <div
      className={root.className}
      data-liquid-interactive={interactive}
      data-liquid-variant={variant}
      ref={elementRef}
      style={root.style}
      {...props}
    >
      <span aria-hidden="true" className="lq-surface__edge" />
      {resolvedWebgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      <span className="lq-surface__content">{children}</span>
    </div>
  )
})

LiquidSurface.displayName = 'LiquidSurface'
