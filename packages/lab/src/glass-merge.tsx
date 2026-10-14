import {
  attachGlassMerge,
  isLensSupported,
  type GlassMergeController,
  type GlassMergeShape,
} from '@liquefy-ui/core'
import { useLiquefyConfig, useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'

export type GlassMergeProps = LiquidStyleProps & {
  /** Width of the refracting band at the rim, in pixels. */
  bezel?: number
  /** Interactive content, laid over the glass. The glass itself never takes the pointer. */
  children?: ReactNode
  className?: string
  /** Shapes for a layout that holds still. Anything animated calls `setShapes` on the ref instead. */
  shapes?: readonly GlassMergeShape[]
  /** Largest gap, in pixels, that two shapes still bridge. */
  spacing?: number
  style?: CSSProperties
  /** A colour mixed into the glass. */
  tint?: string
}

export type GlassMergeHandle = Pick<GlassMergeController, 'mode' | 'setShapes'>

const NO_SHAPES: readonly GlassMergeShape[] = []

// Attaching before paint means a caller's own layout effect can already hand
// over shapes, and the first frame shows them. The server has no layout.
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Glass shapes that melt into one another when they come within `spacing` of
 * each other, like SwiftUI's `GlassEffectContainer`. It is one surface the size
 * of this element, drawing the shapes it is given — in its own pixels, from its
 * top-left — and nothing else: no fill, border or shadow of its own, which
 * would be rectangles. Buttons and labels go in as children, over the glass.
 *
 * Motion code drives it without re-rendering through the ref:
 * `ref.current.setShapes([...])` once a frame. `mode` says whether the
 * refracting lens is drawn, or the clipped outline that engines without SVG
 * backdrop filters, and a provider with `lens` or `transparency` off, get.
 *
 * Nothing above it may have `opacity`, `filter`, `clip-path`, `mask` or
 * `will-change: opacity` — the glass would have nothing behind it to bend.
 * Fade or clip the content instead.
 */
export const GlassMerge = forwardRef<GlassMergeHandle, GlassMergeProps>(({
  bezel,
  children,
  className,
  shapes,
  spacing,
  style,
  styles,
  tint,
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const root = useLiquidStyles('lq-glass-merge', { className, style, styles })
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<GlassMergeController | null>(null)
  // The last shapes handed over, from either side, so a controller rebuilt
  // for new options picks up where the old one was.
  const shapesRef = useRef(shapes ?? NO_SHAPES)

  useImperativeHandle(forwardedRef, () => ({
    get mode() {
      return controllerRef.current?.mode ?? (config.lens && config.transparency && isLensSupported() ? 'lens' : 'outline')
    },
    setShapes: (next: readonly GlassMergeShape[]) => {
      shapesRef.current = next
      controllerRef.current?.setShapes(next)
    },
  }), [config.lens, config.transparency])

  useBeforePaint(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined
    const controller = attachGlassMerge(surface, {
      bezel,
      lens: config.lens,
      spacing,
      strength: config.refraction,
      tint,
      transparency: config.transparency,
    })
    controllerRef.current = controller
    controller.setShapes(shapesRef.current)
    return () => {
      controllerRef.current = null
      controller.destroy()
    }
  }, [bezel, config.lens, config.refraction, config.transparency, spacing, tint])

  useBeforePaint(() => {
    if (!shapes) return
    shapesRef.current = shapes
    controllerRef.current?.setShapes(shapes)
  }, [shapes])

  return (
    <div className={root.className} style={{ isolation: 'isolate', position: 'relative', ...root.style }}>
      <div
        aria-hidden="true"
        className="lq-glass-merge__surface"
        ref={surfaceRef}
        // Behind the children whatever their positioning: the root isolates,
        // so a negative z-index stays inside it.
        style={{ inset: 0, pointerEvents: 'none', position: 'absolute', zIndex: -1 }}
      />
      {children}
    </div>
  )
})

GlassMerge.displayName = 'GlassMerge'
