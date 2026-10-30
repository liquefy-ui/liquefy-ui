import { Popover } from '@base-ui/react/popover'
import { useLiquefyConfig, useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { GlassMerge } from './glass-merge'
import type { MorphBox, MorphOrigin } from './morph-motion'
import { useBeforePaint } from './use-before-paint'
import {
  clipPlacement,
  frostStyle,
  layerPlacement,
  originPoint,
  useGlassMorph,
  useLayers,
  type MorphSize,
} from './use-glass-morph'

/** The stage a morph is in when it is only its trigger. */
export const MORPH_CLOSED = 'closed'

export type LiquidMorphControls = {
  /** Morphs the panel back into the trigger and hands focus back to it. */
  close: () => void
  /** Moves to another stage, or to `'closed'`. */
  setStage: (stage: string) => void
  /** The stage this content is showing — on its way out, the stage it was showing as it left. */
  stage: string
}

export type LiquidMorphContent = ReactNode | ((controls: LiquidMorphControls) => ReactNode)

export type LiquidMorphStage = MorphSize & {
  /**
   * Content of this stage's own, faded in as the glass reaches it. Leave it out
   * and the stage shows the morph's `children`, which stay mounted from stage
   * to stage — so an input keeps its focus and its text while the glass grows
   * around it.
   */
  content?: LiquidMorphContent
  /** The panel's accessible name at this stage. Defaults to `label`. */
  label?: string
}

export type LiquidMorphProps = LiquidStyleProps & {
  /** What the open stages show unless they bring content of their own. */
  children?: LiquidMorphContent
  className?: string
  defaultStage?: string
  /** The trigger's accessible name and tooltip. */
  label: string
  onStageChange?: (stage: string) => void
  /** The stage the trigger opens to. Defaults to the first in `stages`. */
  openTo?: string
  /** The point of the trigger that stays put while the glass grows out of it. */
  origin?: MorphOrigin
  /** The trigger: a round icon button at one of the library's sizes, or a box of its own for an avatar or a thumbnail. */
  size?: 'sm' | 'md' | 'lg' | MorphSize
  /** Controlled stage: `'closed'` or a key of `stages`. */
  stage?: string
  /** The open stages, smallest first: each a size, and content of its own if it has any. */
  stages: Record<string, LiquidMorphStage>
  style?: CSSProperties
  tint?: string
  /** What the closed glass shows: an icon, an avatar, a thumbnail. */
  trigger: ReactNode
}

/** The icon button's side at each size — kept in step with `.lq-icon-button` in @liquefy-ui/react. */
const PIXELS = { lg: 56, md: 46, sm: 36 } as const

const panelRadius = (height: number): number => Math.min(height / 2, 24)

const triggerBox = (size: LiquidMorphProps['size']): MorphBox => {
  if (typeof size === 'string' || size === undefined) {
    const side = PIXELS[size ?? 'md']
    return { height: side, radius: side / 2, width: side }
  }
  const width = size.width ?? PIXELS.md
  const height = size.height ?? PIXELS.md
  return { height, radius: Math.min(size.radius ?? panelRadius(height), width / 2, height / 2), width }
}

/** The layer a stage shows: its own content, or the shared children. */
const layerOf = (stage: string, stages: Record<string, LiquidMorphStage>): string => {
  if (stage === MORPH_CLOSED) return MORPH_CLOSED
  return stages[stage]?.content === undefined ? 'children' : `stage:${stage}`
}

const render = (content: LiquidMorphContent | undefined, controls: LiquidMorphControls): ReactNode =>
  typeof content === 'function' ? content(controls) : content

/**
 * A button that grows into the thing it opens, rather than opening something
 * beside it. A search button stretches into a search field and then drops into
 * a panel of results; a play button spreads into a player. The glass leads —
 * sideways first, then down — swings past its new shape and settles back,
 * rounding off into a blob while it moves; the content fades in once the glass
 * has made room for it. Closing pulls the panel back into the trigger, which
 * lands with a small bounce.
 *
 * Behaviour is Base UI's popover: the trigger reports `aria-expanded`, focus
 * moves to the first thing in the panel that takes it, and Escape or a press
 * outside closes it and hands focus back to the trigger. The panel stays
 * mounted until the glass is back in the trigger. Stages between closed and
 * open are the caller's to move through, with `setStage`.
 */
export const LiquidMorph = ({
  children,
  className,
  defaultStage = MORPH_CLOSED,
  label,
  onStageChange,
  openTo,
  origin = 'top-left',
  size = 'md',
  stage: stageProp,
  stages,
  style,
  styles,
  tint,
  trigger,
}: LiquidMorphProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion.
  const animated = config.motion
  const root = useLiquidStyles('lq-liquid-morph', { className, style, styles })
  const button = useLiquidStyles('lq-liquid-morph__trigger', {
    styles: {
      // The same ring as `.lq-button:focus-visible`, which this is not.
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: 3 },
    },
  })

  const stageNames = Object.keys(stages)
  const firstStage = openTo !== undefined && openTo in stages ? openTo : stageNames[0] ?? MORPH_CLOSED
  const known = (name: string) => (name === MORPH_CLOSED || name in stages ? name : firstStage)

  const controlled = stageProp !== undefined
  const [ownStage, setOwnStage] = useState(() => known(defaultStage))
  const requested = known(controlled ? stageProp : ownStage)
  // What Base UI is told. Opening follows the caller when controlled; closing
  // is applied here first, because Base UI has already begun to close.
  const [open, setOpen] = useState(requested !== MORPH_CLOSED)
  const openRef = useRef(open)
  openRef.current = open
  const silentRef = useRef(false)
  const closingRef = useRef(false)
  // The panel stays up until the glass is back in the trigger, which outlasts `open`.
  const [returning, setReturning] = useState(false)
  const lastOpenRef = useRef(requested === MORPH_CLOSED ? firstStage : requested)
  if (requested !== MORPH_CLOSED) lastOpenRef.current = requested
  const displayed = open ? lastOpenRef.current : MORPH_CLOSED

  const closed = triggerBox(size)
  const anchor = originPoint(origin, closed.width, closed.height)
  const actionsRef = useRef<Popover.Root.Actions | null>(null)
  const portalRef = useRef<HTMLSpanElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const shownStageRef = useRef(displayed)
  const [shown, release] = useLayers(layerOf(displayed, stages))

  const finish = useCallback(() => {
    release()
    if (openRef.current || !closingRef.current) return
    closingRef.current = false
    actionsRef.current?.unmount()
    setReturning(false)
  }, [release])

  const glass = useGlassMorph({
    animated,
    anchor,
    defaultRadius: panelRadius,
    // The trigger is clear glass, like an icon button; a panel is the thick
    // glass of a dialog, which it thickens into as its content arrives.
    frost: (layer) => (layer === MORPH_CLOSED ? 0 : 1),
    layer: shown.current,
    onRest: finish,
    origin,
    // An initially open morph grows out of its trigger on mount, as it would on a press.
    start: closed,
    wobbliness: config.wobbliness,
  })

  const stageSize: MorphSize = displayed === MORPH_CLOSED ? closed : stages[displayed] ?? {}
  // Before paint, so the glass sets off in the frame the stage changes in.
  useBeforePaint(() => {
    const from = shownStageRef.current
    shownStageRef.current = displayed
    glass.show(layerOf(displayed, stages), stageSize, {
      // Back in the trigger, it lands with a pop.
      bounce: displayed === MORPH_CLOSED,
      // From one open stage to another, focus follows the content; opening
      // and closing leave it to Base UI, which moves it in and hands it back.
      handoff: from !== MORPH_CLOSED && displayed !== MORPH_CLOSED ? () => popupRef.current : undefined,
    })
    // Keyed on the size it asks for, not on the stages object a caller rebuilds every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed, stageSize.width, stageSize.height, stageSize.radius, closed.width, closed.height, closed.radius])

  const requestStage = (next: string) => {
    const target = known(next)
    if (target === MORPH_CLOSED) {
      actionsRef.current?.close()
      return
    }
    // Typing into a field that keeps asking for the stage it is in changes nothing.
    if (target === displayed) return
    if (!controlled) setOwnStage(target)
    onStageChange?.(target)
  }

  // A controlled caller that closes goes through Base UI's own close, so the
  // panel still morphs home rather than vanishing; one that opens is let in.
  useEffect(() => {
    if (!controlled) return
    if (requested !== MORPH_CLOSED && !openRef.current) setOpen(true)
    else if (requested === MORPH_CLOSED && openRef.current) {
      silentRef.current = true
      actionsRef.current?.close()
      silentRef.current = false
    }
  }, [controlled, requested])

  const handleOpenChange = (next: boolean, details: Popover.Root.ChangeEventDetails) => {
    if (!next) {
      if (animated) details.preventUnmountOnClose()
      closingRef.current = true
      setReturning(true)
      setOpen(false)
      if (!controlled) setOwnStage(MORPH_CLOSED)
      if (!silentRef.current) onStageChange?.(MORPH_CLOSED)
      return
    }
    if (!controlled) {
      setOpen(true)
      setOwnStage(firstStage)
    }
    onStageChange?.(firstStage)
  }

  const controls: LiquidMorphControls = {
    close: () => actionsRef.current?.close(),
    setStage: requestStage,
    stage: displayed,
  }

  const placement = layerPlacement(origin)
  const [clipStart] = useState(() => clipPlacement(origin))
  const [frostStart] = useState(() => frostStyle(origin))
  // A layer on its way out keeps the stage it was showing — its size, and
  // the `stage` its content is handed — rather than reflowing to the stage
  // that replaced it, or emptying itself for 'closed', while it fades.
  const layerStages = useRef(new Map<string, { size: MorphSize; stage: string }>())
  if (displayed !== MORPH_CLOSED) layerStages.current.set(shown.current, { size: stageSize, stage: displayed })
  const panelLayers = [shown.current, shown.previous].filter((key): key is string => key !== null && key !== MORPH_CLOSED)
  const out = open || returning
  const panelLabel = (displayed !== MORPH_CLOSED ? stages[displayed]?.label : undefined) ?? label

  return (
    <span
      className={root.className}
      style={{
        display: 'inline-flex',
        // Its own stacking context, so the glass, the trigger and the panel
        // keep their order whatever surrounds them; lifted to the popover layer
        // while the panel is out.
        isolation: 'isolate',
        position: 'relative',
        verticalAlign: 'middle',
        zIndex: out ? 85 : undefined,
        ...root.style,
      }}
    >
      <span aria-hidden="true" ref={glass.frostRef} style={frostStart} />
      <span aria-hidden="true" ref={glass.surfaceRef} style={{ pointerEvents: 'none', position: 'absolute' }}>
        <GlassMerge bezel={12} ref={glass.glassRef} style={{ height: '100%', width: '100%' }} tint={tint} />
      </span>
      <Popover.Root actionsRef={actionsRef} onOpenChange={handleOpenChange} open={open}>
        <Popover.Trigger
          aria-label={label}
          className={button.className}
          style={{
            alignItems: 'center',
            appearance: 'none',
            background: 'transparent',
            border: 0,
            borderRadius: closed.radius,
            color: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex',
            font: 'inherit',
            height: closed.height,
            justifyContent: 'center',
            padding: 0,
            // Positioned, so it paints over the glass that comes before it.
            position: 'relative',
            width: closed.width,
          }}
          title={label}
        >
          <span
            aria-hidden="true"
            ref={glass.layerRef(MORPH_CLOSED)}
            style={{ alignItems: 'center', display: 'inline-flex', justifyContent: 'center', transformOrigin: 'center' }}
          >
            {trigger}
          </span>
        </Popover.Trigger>
        {/* The panel is portalled next to its glass rather than out to the
            provider: content and glass are clipped and stacked by the same
            ancestors, so the panel is never seen without its glass. */}
        <span ref={portalRef} style={{ left: 0, position: 'absolute', top: 0 }} />
        <Popover.Portal container={portalRef}>
          <Popover.Positioner
            // Edge to edge with the trigger, whatever size the popup is.
            align="start"
            // The popup is laid exactly over the trigger and the glass grows
            // from it, so it must never flip or shift.
            collisionAvoidance={{ align: 'none', side: 'none' }}
            side="bottom"
            sideOffset={({ anchor: box }) => -box.height}
            style={{ pointerEvents: 'none' }}
          >
            <Popover.Popup
              aria-label={panelLabel}
              ref={popupRef}
              style={{ height: 'var(--anchor-height)', outline: 'none', position: 'relative', width: 'var(--anchor-width)' }}
            >
              <div ref={glass.clipRef('panel')} style={{ ...clipStart, pointerEvents: 'auto' }}>
                {panelLayers.map((key) => {
                  const laidOut = layerStages.current.get(key)
                  const own = laidOut?.size ?? {}
                  return (
                    <div
                      key={key}
                      ref={glass.layerRef(key)}
                      style={{
                        ...placement,
                        boxSizing: 'border-box',
                        height: own.height ?? 'auto',
                        width: own.width ?? 'max-content',
                      }}
                    >
                      {render(
                        key === 'children' ? children : stages[key.slice('stage:'.length)]?.content,
                        { ...controls, stage: laidOut?.stage ?? displayed },
                      )}
                    </div>
                  )
                })}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </span>
  )
}
