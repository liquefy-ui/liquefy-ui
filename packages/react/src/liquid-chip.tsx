import {
  forwardRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { XGlyph } from './internal-glyphs'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'
import { useLiquidGlass } from './use-liquid-glass'

export type LiquidChipProps = HTMLAttributes<HTMLSpanElement> & LiquidStyleProps & {
  children: ReactNode
  deleteLabel?: string
  icon?: ReactNode
  onDelete?: () => void
  selected?: boolean
  size?: 'sm' | 'md'
  tint?: string
  variant?: 'clear' | 'tinted'
}

export const LiquidChip = forwardRef<HTMLSpanElement, LiquidChipProps>(({
  children,
  className,
  deleteLabel = 'Remove',
  icon,
  onClick,
  onDelete,
  onPointerEnter,
  selected = false,
  size = 'md',
  style,
  styles,
  tint,
  variant = 'clear',
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const interactive = Boolean(onClick)
  const Tag = interactive ? 'button' : 'span'
  const [elementRef, , pulse] = useLiquidGlass<HTMLElement>(forwardedRef as Ref<HTMLElement>, {
    bounce: 0.09,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 2,
    tint: tint ?? config.tint,
    // Chips travel in lists; skip the shader canvas and just ride the springs.
    webgl: false,
    wobbliness: config.wobbliness,
  })

  const handlePointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    pulse(0.85)
    onPointerEnter?.(event)
  }
  const root = useLiquidStyles('lq-chip', {
    className,
    style,
    styles,
    vars: tint ? { '--lq-chip-tint': tint } : undefined,
  })

  return (
    <Tag
      className={root.className}
      data-interactive={interactive}
      data-liquid-size={size}
      data-liquid-variant={variant}
      data-selected={selected}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      ref={elementRef as never}
      style={root.style}
      type={interactive ? 'button' : undefined}
      {...props}
    >
      {icon && <span className="lq-chip__icon">{icon}</span>}
      <span className="lq-chip__label">{children}</span>
      {onDelete && (
        <button
          aria-label={deleteLabel}
          className="lq-chip__delete"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          type="button"
        >
          <XGlyph size={11} />
        </button>
      )}
    </Tag>
  )
})

LiquidChip.displayName = 'LiquidChip'
