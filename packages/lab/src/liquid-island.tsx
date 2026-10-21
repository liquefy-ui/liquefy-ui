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

export type LiquidIslandView = MorphSize & {
  /** Said politely by screen readers when the island changes to this view: "Download complete". */
  announce?: string
  /** Lands with a pop: the glass swells past its new size and wobbles back. */
  bounce?: boolean
  /** What the island shows. Its size is measured from it wherever `width` or `height` is left out. */
  content?: ReactNode
}

export type LiquidIslandControls = {
  /** Morphs the panel back into the island and hands focus back. */
  close: () => void
}

export type LiquidIslandPanel = MorphSize & {
  /** What the island opens into when it is pressed. */
  content: ReactNode | ((controls: LiquidIslandControls) => ReactNode)
  /** The panel's accessible name. Defaults to the island's `label`. */
  label?: string
}

export type LiquidIslandProps = LiquidStyleProps & {
  className?: string
  defaultOpen?: boolean
  /** The island's accessible name, which its button carries when there is a panel to open. */
  label: string
  onOpenChange?: (open: boolean) => void
  /** Whether the panel is open. Ignored without a `panel`. */
  open?: boolean
  /** The point that stays put while the island changes shape. `top` grows down and out to both sides. */
  origin?: MorphOrigin
  /** A larger panel the island opens into when pressed. Without one, the island is not a button. */
  panel?: LiquidIslandPanel
  /** The resting bubble's diameter, which is also the room the island takes in the layout. */
  size?: number
  style?: CSSProperties
  tint?: string
  /** Which of `views` is showing. A key with no view is the resting bubble. */
  view: string
  views?: Record<string, LiquidIslandView>
}

const islandRadius = (height: number): number => Math.min(height / 2, 32)

const VISUALLY_HIDDEN: CSSProperties = {
  border: 0,
  clipPath: 'inset(50%)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
}

/**
 * Whatever in the content can be pressed, which takes the pointer; everything
 * else lets it through to the island's own button underneath.
 */
const PRESSABLE = '& :is(a[href], button, input, select, textarea, summary, label, [tabindex]:not([tabindex="-1"]), [contenteditable="true"])'

/**
 * A glass capsule in the manner of the Dynamic Island. At rest it is a small
 * round bubble; given a view it stretches into it — a track and a play button,
 * a progress bar, a notification — and between views the glass is what moves:
 * it gathers in before it spreads out, overshoots and settles, and a view that
 * asks to `bounce` lands with a pop, like a finished download shrinking into a
 * tick. With a `panel`, pressing it opens it into that, in place.
 *
 * Views and their content are the caller's. Each view's `announce` is read out
 * through a polite live region as the view arrives, rather than the content
 * itself, which may tick over every second. Anything in a view that can be
 * pressed is pressable as it is; the rest of the island is one button that
 * opens the panel, which behaves as Base UI's popover: `aria-expanded` on the
 * button, focus into the panel, Escape or a press outside to close, focus back.
 */
export const LiquidIsland = ({
  className,
  defaultOpen = false,
  label,
  onOpenChange,
  open: openProp,
  origin = 'top',
  panel,
  size = 36,
  style,
  styles,
  tint,
  view,
  views = {},
}: LiquidIslandProps) => {
  const config = useLiquefyConfig()
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion.
  const animated = config.motion
  const root = useLiquidStyles('lq-liquid-island', { className, style, styles })
  const button = useLiquidStyles('lq-liquid-island__button', {
    styles: {
      // The same ring as `.lq-button:focus-visible`, which this is not.
      _focusVisible: { outline: '2px solid color-mix(in srgb, var(--lq-accent) 72%, white)', outlineOffset: 3 },
    },
  })
  const layerStyles = useLiquidStyles('lq-liquid-island__view', {
    styles: panel ? { pointerEvents: 'none', [PRESSABLE]: { pointerEvents: 'auto' } } : {},
  })

  const controlled = openProp !== undefined
  // What Base UI is told. Opening follows the caller when controlled; closing
  // is applied here first, because Base UI has already begun to close.
  const [open, setOpen] = useState(panel !== undefined && (openProp ?? defaultOpen))
  const openRef = useRef(open)
  openRef.current = open
  const silentRef = useRef(false)
  const closingRef = useRef(false)
  const [returning, setReturning] = useState(false)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const portalRef = useRef<HTMLSpanElement | null>(null)
  const actionsRef = useRef<Popover.Root.Actions | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const expandedRef = useRef(false)

  const bubble: MorphBox = { height: size, radius: size / 2, width: size }
  const anchor = originPoint(origin, size, size)
  const current = views[view]
  const viewSize: MorphSize = current && (current.content !== undefined || current.width !== undefined || current.height !== undefined)
    ? current
    : bubble
  const panelSize: MorphSize = panel ?? {}
  const expanded = open && panel !== undefined
  const viewLayer = `view:${view}`
  const [shown, release] = useLayers(expanded ? 'panel' : viewLayer)

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
    defaultRadius: islandRadius,
    // Thick glass throughout, the way a dialog's panel is: the island holds
    // small text over whatever the page has behind it.
    frost: () => 1,
    layer: shown.current,
    onRest: finish,
    origin,
    start: bubble,
    wobbliness: config.wobbliness,
  })

  // Before paint, so the glass sets off in the frame the view changes in.
  useBeforePaint(() => {
    const wasExpanded = expandedRef.current
    expandedRef.current = expanded
    if (expanded) glass.show('panel', panelSize)
    else {
      glass.show(viewLayer, viewSize, {
        bounce: current?.bounce,
        // A view replaced under focus hands it to the new view, or to the
        // island's button. Closing the panel leaves focus to Base UI, which
        // hands it back to the button itself.
        handoff: wasExpanded ? undefined : () => buttonRef.current,
      })
    }
    // Keyed on the sizes asked for, not on objects a caller rebuilds every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, viewLayer, viewSize.width, viewSize.height, viewSize.radius, panelSize.width, panelSize.height, panelSize.radius])

  // A controlled caller that closes goes through Base UI's own close, so the
  // panel still morphs home rather than vanishing.
  useEffect(() => {
    if (!controlled || !panel) return
    if (openProp && !openRef.current) setOpen(true)
    else if (!openProp && openRef.current) {
      silentRef.current = true
      actionsRef.current?.close()
      silentRef.current = false
    }
  }, [controlled, openProp, panel])

  const handleOpenChange = (next: boolean, details: Popover.Root.ChangeEventDetails) => {
    if (!next) {
      if (animated) details.preventUnmountOnClose()
      closingRef.current = true
      setReturning(true)
    }
    if (!next || !controlled) setOpen(next)
    if (!silentRef.current) onOpenChange?.(next)
  }

  const placement = layerPlacement(origin)
  const [clipStart] = useState(() => clipPlacement(origin))
  const [frostStart] = useState(() => frostStyle(origin))
  const clipButton = glass.clipRef('button')
  const setButton = useCallback((element: HTMLButtonElement | null) => {
    buttonRef.current = element
    clipButton(element)
  }, [clipButton])
  // The view showing stays mounted under an open panel, so whatever it holds
  // — a timer, a playing track — carries on.
  const viewLayers = [viewLayer, shown.previous]
    .filter((key, index, all): key is string => key !== null && key.startsWith('view:') && all.indexOf(key) === index)
  const panelUp = shown.current === 'panel' || shown.previous === 'panel'

  const layer = (key: string, own: MorphSize, content: ReactNode, passThrough: boolean) => (
    <div
      className={passThrough ? layerStyles.className : undefined}
      key={key}
      ref={glass.layerRef(key)}
      style={{
        ...placement,
        ...(passThrough ? layerStyles.style : undefined),
        boxSizing: 'border-box',
        height: own.height ?? 'auto',
        width: own.width ?? 'max-content',
      }}
    >
      {content}
    </div>
  )

  const viewClip = (
    <div ref={glass.clipRef('views')} style={{ ...clipStart, pointerEvents: panel ? 'none' : undefined }}>
      {viewLayers.map((key) => {
        const own = views[key.slice('view:'.length)]
        return layer(key, own ?? {}, own?.content, true)
      })}
    </div>
  )

  return (
    <div
      className={root.className}
      ref={rootRef}
      style={{
        display: 'inline-block',
        flex: 'none',
        height: size,
        // Its own stacking context, so the glass, the button and the content
        // keep their order whatever surrounds them; lifted to the popover
        // layer while the panel is out.
        isolation: 'isolate',
        position: 'relative',
        verticalAlign: 'middle',
        width: size,
        zIndex: open || returning ? 85 : undefined,
        ...root.style,
      }}
    >
      <span aria-hidden="true" ref={glass.frostRef} style={frostStart} />
      <span aria-hidden="true" ref={glass.surfaceRef} style={{ pointerEvents: 'none', position: 'absolute' }}>
        <GlassMerge bezel={12} ref={glass.glassRef} style={{ height: '100%', width: '100%' }} tint={tint} />
      </span>
      <span aria-atomic="true" aria-live="polite" role="status" style={VISUALLY_HIDDEN}>{current?.announce ?? ''}</span>
      {panel
        ? (
          <Popover.Root actionsRef={actionsRef} onOpenChange={handleOpenChange} open={open}>
            <Popover.Trigger
              aria-label={label}
              className={button.className}
              ref={setButton}
              style={{
                ...clipStart,
                appearance: 'none',
                background: 'transparent',
                border: 0,
                color: 'inherit',
                cursor: 'pointer',
                font: 'inherit',
                padding: 0,
              }}
            />
            {viewClip}
            {/* The panel is portalled next to its glass rather than out to the
                provider, so the two are clipped and stacked alike. */}
            <span ref={portalRef} style={{ left: 0, position: 'absolute', top: 0 }} />
            <Popover.Portal container={portalRef}>
              <Popover.Positioner
                // Edge to edge with the island whatever size the popup is.
                align="start"
                anchor={rootRef}
                // Laid exactly over the island, which the glass grows from.
                collisionAvoidance={{ align: 'none', side: 'none' }}
                side="bottom"
                sideOffset={({ anchor: box }) => -box.height}
                style={{ pointerEvents: 'none' }}
              >
                <Popover.Popup
                  aria-label={panel.label ?? label}
                  style={{ height: 'var(--anchor-height)', outline: 'none', position: 'relative', width: 'var(--anchor-width)' }}
                >
                  <div ref={glass.clipRef('panel')} style={{ ...clipStart, pointerEvents: 'auto' }}>
                    {panelUp && layer('panel', panelSize, typeof panel.content === 'function'
                      ? panel.content({ close: () => actionsRef.current?.close() })
                      : panel.content, false)}
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )
        : viewClip}
    </div>
  )
}
