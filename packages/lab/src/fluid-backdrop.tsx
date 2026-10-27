import { useLiquefyConfig, useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cssColor, deepShade, readColors, type BackdropRgb } from './backdrop-color'
import { createBackdropContext, watchContextLoss } from './backdrop-gl'
import { useBackdropLoop } from './backdrop-loop'
import { FluidRenderer, type FluidTier } from './fluid-gl'
import {
  fluidSplash,
  FluidStirrer,
  paletteAt,
  PointerStroke,
  resolveFluidOptions,
  VortexField,
  type FluidOptions,
} from './fluid-motion'
import { cssPalette, useBackdropPalette } from './use-backdrop-palette'
import { useBeforePaint } from './use-before-paint'

export type FluidBackdropProps = Omit<HTMLAttributes<HTMLDivElement>, 'color'> & LiquidStyleProps & Partial<FluidOptions> & {
  /** What the colour floats on. Defaults to a deep, nearly black shade of the first colour. */
  background?: string
  /** Laid over the water: the glass and whatever else the backdrop is behind. */
  children?: ReactNode
  /** The colours poured into the water, any CSS colours. Defaults to the tint spread into four neighbouring hues. */
  colors?: readonly string[]
  /** Whether a pointer moving over the backdrop stirs the water. */
  interactive?: boolean
  /** The colour the palette is spread from when there are no `colors`. Defaults to the provider's tint. */
  tint?: string
}

/** Frames simulated before the first one is shown, so the water is already turning. */
const WARM_UP = 24

/** Frames simulated for the still picture shown with motion off. */
const STILL = 90

/** Where the stand-in's pools of colour sit, as percentages across and down. */
const POOLS = [[18, 26], [78, 20], [64, 78], [24, 82], [48, 50]] as const

/**
 * The stand-in for the water where it cannot be drawn — on the server, and
 * without WebGL2: the same colours in still, soft pools, laid over the base
 * as the background colour. An image list rather than the `background`
 * shorthand, which is a great deal more for a CSS parser to match.
 */
const fallbackPools = (colors: readonly string[]): string => colors
  .slice(0, POOLS.length)
  .map((color, index) => {
    const [x, y] = POOLS[index] ?? [50, 50]
    return `radial-gradient(farthest-side at ${x}% ${y}%, color-mix(in srgb, ${color} 72%, transparent), transparent)`
  })
  .join(', ')

/**
 * A backdrop of moving water with colour poured in. Stir it with a pointer
 * and the colour swirls after it; leave it and it keeps turning, slowly
 * stirred by itself. Made to sit behind glass: the glass bends and frosts
 * what moves underneath.
 *
 * The water is Jos Stam's stable fluids on the GPU — velocity carried along
 * by itself, kept from compressing by a pressure solve, and the colour
 * carried by the velocity. A pointer anywhere over the backdrop stirs it,
 * including over the glass and buttons on top, which still get every event:
 * the backdrop only listens.
 *
 * Without float textures it falls back to colour carried by a handful of
 * moving vortices; without WebGL2, to still pools of the same colours in CSS.
 * With `motion={false}` on the provider it is one still frame. Like the rest
 * of liquefy-ui it does not read prefers-reduced-motion itself.
 */
export const FluidBackdrop = forwardRef<HTMLDivElement, FluidBackdropProps>(({
  background,
  children,
  className,
  colors,
  dyeResolution,
  fade,
  interactive = true,
  maxPixelRatio,
  pressureIterations,
  resolution,
  speed,
  stir,
  style,
  styles,
  tint,
  vorticity,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const animated = config.motion
  const options = useMemo(
    () => resolveFluidOptions({ dyeResolution, fade, maxPixelRatio, pressureIterations, resolution, speed, stir, vorticity }),
    [dyeResolution, fade, maxPixelRatio, pressureIterations, resolution, speed, stir, vorticity],
  )
  const tintColor = tint ?? config.tint

  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<FluidRenderer | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [tier, setTier] = useState<FluidTier | null>(null)
  // Whether the water on the canvas has been seeded with colour; it is again
  // whenever the context is rebuilt.
  const [seeded, setSeeded] = useState(false)

  const [stirrer] = useState(() => new FluidStirrer())
  const [vortices] = useState(() => new VortexField())
  const strokesRef = useRef(new Map<number, PointerStroke>())
  const timeRef = useRef(0)

  const palette = useBackdropPalette(canvasRef, colors, tintColor, 4)
  const [base, setBase] = useState<BackdropRgb | null>(null)
  const paletteRef = useRef(palette)
  paletteRef.current = palette
  const baseRef = useRef(base)
  baseRef.current = base

  useBeforePaint(() => {
    const canvas = canvasRef.current
    if (!canvas || !palette) return
    const [resolved] = background ? readColors(canvas, [background]) : []
    setBase(resolved ?? deepShade(palette[0] ?? [0.5, 0.5, 0.5]))
  }, [background, palette])

  const setRoot = useCallback((element: HTMLDivElement | null) => {
    rootRef.current = element
    if (typeof forwardedRef === 'function') forwardedRef(element)
    else if (forwardedRef) forwardedRef.current = element
  }, [forwardedRef])

  /** Moves the water on by `dt` seconds of its own time, and draws it unless told not to. */
  const advance = useCallback((dt: number, draw = true) => {
    const renderer = rendererRef.current
    const colours = paletteRef.current
    const floor = baseRef.current
    if (!renderer?.supported || !colours || !floor) return
    const { stir: strength } = optionsRef.current
    if (dt > 0) {
      timeRef.current += dt
      const time = timeRef.current
      const splats = stirrer.splats(time, dt, colours, strength)
      const ink = paletteAt(colours, time)
      for (const stroke of strokesRef.current.values()) {
        const splat = stroke.take(ink)
        if (!splat) continue
        splats.push(splat)
        vortices.push(splat)
      }
      vortices.step(dt)
      renderer.splat(splats)
      renderer.step(dt, renderer.tier === 'vortices' ? vortices.vortices(stirrer, time, strength) : [])
    } else {
      // Held still: what the pointer did meanwhile is let go rather than
      // stored up and thrown in all at once.
      for (const stroke of strokesRef.current.values()) stroke.take([0, 0, 0])
    }
    if (draw) renderer.render(floor)
  }, [stirrer, vortices])

  /** Empties the water, pours in its opening colour and runs it on for `frames` frames. */
  const seed = useCallback((frames: number) => {
    const renderer = rendererRef.current
    const colours = paletteRef.current
    if (!renderer?.supported || !colours) return
    renderer.reset()
    renderer.splat(fluidSplash(colours))
    for (let frame = 0; frame < frames; frame += 1) advance(1 / 60, frame === frames - 1)
  }, [advance])

  const refitRef = useRef<(() => void) | null>(null)

  // The context and the renderer, once per canvas. The canvas is sized
  // first, since the grids are fitted to it.
  useBeforePaint(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root || !config.webgl) return undefined
    const fit = () => {
      const density = Math.min(window.devicePixelRatio || 1, optionsRef.current.maxPixelRatio)
      const width = Math.max(1, Math.round(root.clientWidth * density))
      const height = Math.max(1, Math.round(root.clientHeight * density))
      if (canvas.width === width && canvas.height === height) return false
      canvas.width = width
      canvas.height = height
      return true
    }
    fit()
    const renderer = new FluidRenderer(createBackdropContext(canvas), optionsRef.current)
    if (!renderer.supported) {
      renderer.destroy()
      return undefined
    }
    rendererRef.current = renderer
    setTier(renderer.tier)

    const refit = () => {
      if (!fit()) return
      renderer.resize()
      advance(0)
    }
    refitRef.current = refit
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refit)
    observer?.observe(root)
    const unwatch = watchContextLoss(
      canvas,
      () => {
        setTier(null)
        setSeeded(false)
      },
      () => {
        renderer.restore()
        setTier(renderer.tier)
      },
    )

    return () => {
      observer?.disconnect()
      unwatch()
      renderer.destroy()
      rendererRef.current = null
      refitRef.current = null
      setTier(null)
      setSeeded(false)
    }
  }, [advance, config.webgl])

  useEffect(() => {
    rendererRef.current?.setOptions(options)
    refitRef.current?.()
  }, [options])

  // Seeds the water once there is somewhere to pour it and something to pour.
  // With motion off, it is run on far enough to look like water that has been
  // moving, then held.
  useBeforePaint(() => {
    if (seeded || !tier || !palette || !base) return
    timeRef.current = 0
    seed(animated ? WARM_UP : STILL)
    setSeeded(true)
  }, [animated, base, palette, seed, seeded, tier])

  // A still picture is not refilled when its colours change; it is poured again.
  useBeforePaint(() => {
    if (animated || !seeded) return
    setSeeded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, base])

  useBackdropLoop(rootRef, animated && seeded && tier !== null, (step) => advance(step * optionsRef.current.speed))

  // The pointer is read from the window, so it reaches the water through
  // whatever is laid over it, and never stops an event on its way.
  useEffect(() => {
    if (!interactive || !animated || !tier) return undefined
    const strokes = strokesRef.current
    const move = (event: PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      let stroke = strokes.get(event.pointerId)
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        stroke?.lift()
        return
      }
      if (!stroke) {
        stroke = new PointerStroke()
        strokes.set(event.pointerId, stroke)
      }
      stroke.move(x, y)
    }
    const end = (event: PointerEvent) => {
      strokes.get(event.pointerId)?.lift()
      if (event.pointerType !== 'mouse') strokes.delete(event.pointerId)
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', end, { passive: true })
    window.addEventListener('pointercancel', end, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      strokes.clear()
    }
  }, [animated, interactive, tier])

  const initial = cssPalette(colors, tintColor, 4)
  const floor = background
    ?? (palette ? cssColor(deepShade(palette[0] ?? [0.5, 0.5, 0.5])) : `color-mix(in srgb, ${initial[0]} 10%, #0b0b0e)`)
  const root = useLiquidStyles('lq-fluid-backdrop', {
    className,
    style: {
      backgroundColor: floor,
      backgroundImage: fallbackPools(initial),
      isolation: 'isolate',
      position: 'relative',
      ...style,
    },
    styles,
  })
  const drawing = tier !== null && seeded
  const canvasStyle: CSSProperties = {
    borderRadius: 'inherit',
    display: 'block',
    height: '100%',
    inset: 0,
    pointerEvents: 'none',
    position: 'absolute',
    visibility: drawing ? 'visible' : 'hidden',
    width: '100%',
    zIndex: -1,
  }

  return (
    <div {...props} className={root.className} data-fluid-tier={drawing ? tier : 'fallback'} ref={setRoot} style={root.style}>
      <canvas aria-hidden="true" ref={canvasRef} style={canvasStyle} />
      {children}
    </div>
  )
})

FluidBackdrop.displayName = 'FluidBackdrop'
