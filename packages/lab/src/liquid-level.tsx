import { clamp } from '@liquefy-ui/core'
import { LiquidSurface, useLiquefyConfig, type LiquidStyleProps } from '@liquefy-ui/react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { LiquidLevelSimulation } from './liquid-level-motion'

export type LiquidLevelShape = 'capsule' | 'circle' | 'rounded'

export type LiquidLevelProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & LiquidStyleProps & {
  /** Replaces the percentage in the middle — a volume, a temperature, an icon. It is drawn twice, once each side of the surface. */
  children?: ReactNode
  /** What is being measured. Required: a vessel with no name is just a glass of water. */
  label: string
  max?: number
  /** The vessel: a `circle`, an upright `capsule`, or a `rounded` rectangle. */
  shape?: LiquidLevelShape
  /** The vessel's height in pixels; a circle's diameter. */
  size?: number
  /** Whether the liquid leans toward a pointer over the vessel. */
  tilt?: boolean
  /** The liquid's colour. Defaults to the provider's tint. */
  tint?: string
  /** Current reading, from 0 to `max`. Out-of-range values are clamped. */
  value: number
}

type Box = { height: number; radius: number; width: number }

type Rgb = readonly [number, number, number]

type Palette = {
  body: string
  deep: string
  far: string
  ink: string
  meniscus: string
  surface: string
}

const vesselBox = (shape: LiquidLevelShape, size: number): Box => {
  if (shape === 'capsule') {
    const width = Math.round(size * 0.5)
    return { height: size, radius: width / 2, width }
  }
  if (shape === 'rounded') return { height: size, radius: Math.round(size * 0.18), width: Math.round(size * 0.78) }
  // In pixels rather than 50%: the lens reads the radius back as a length.
  return { height: size, radius: size / 2, width: size }
}

const WHITE = '#ffffff'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** WCAG relative luminance of an sRGB colour. */
const luminance = ([r, g, b]: Rgb): number => {
  const linear = (channel: number) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/**
 * `foreground` is the colour the reading has above the surface. Under it the
 * reading takes the opposite: white under dark lettering, the tint's own
 * darkest shade under light lettering — and under a tint too pale to carry
 * white, whatever the theme.
 */
const liquidPalette = (rgb: Rgb, foreground: Rgb | null): Palette => {
  /** The tint at `alpha`, `lift` of the way toward white. */
  const shade = (alpha: number, lift = 0) => {
    const [r, g, b] = rgb.map((channel) => Math.round(channel + (255 - channel) * lift))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const lightLettering = foreground !== null && luminance(foreground) > 0.4
  return {
    body: shade(0.44),
    deep: shade(0.66),
    far: shade(0.3, 0.14),
    ink: lightLettering || luminance(rgb) > 0.55
      ? `rgb(${rgb.map((channel) => Math.round(channel * 0.2)).join(', ')})`
      : WHITE,
    meniscus: 'rgba(255, 255, 255, 0.62)',
    surface: shade(0.5, 0.3),
  }
}

/**
 * Resolves whatever CSS colour the element's `color` holds — a hex, a
 * custom property, `oklch()` — to sRGB bytes, by painting one pixel of it.
 */
const readColor = (element: HTMLElement): Rgb | null => {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const context = probe.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.fillStyle = getComputedStyle(element).color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** Traces a surface from wall to wall through the middle of each column, smoothed between them. */
const traceSurface = (
  context: CanvasRenderingContext2D,
  y: (index: number) => number,
  columns: number,
  width: number,
): void => {
  const step = width / columns
  context.moveTo(0, y(0))
  context.lineTo(step / 2, y(0))
  for (let index = 0; index < columns - 1; index += 1) {
    const here = y(index)
    context.quadraticCurveTo((index + 0.5) * step, here, (index + 1) * step, (here + y(index + 1)) / 2)
  }
  context.lineTo(width, y(columns - 1))
}

const drawLiquid = (
  context: CanvasRenderingContext2D,
  simulation: LiquidLevelSimulation,
  width: number,
  height: number,
  palette: Palette,
): void => {
  const { columns } = simulation
  context.clearRect(0, 0, width, height)

  // The far side of the surface sits a little higher than the near one, the
  // way the back rim of a glass of water does when you look down into it. It
  // shrinks away with the liquid, so an empty vessel shows no band.
  const lift = clamp(Math.min(width, height) * 0.045, 1.5, 9) * clamp(simulation.current / 0.08, 0, 1)
  const near = (index: number) => height * (1 - simulation.front(index))
  const far = (index: number) => height * (1 - simulation.back(index)) - lift

  context.beginPath()
  traceSurface(context, far, columns, width)
  context.lineTo(width, height)
  context.lineTo(0, height)
  context.closePath()
  context.fillStyle = palette.far
  context.fill()

  let top = height
  for (let index = 0; index < columns; index += 1) top = Math.min(top, near(index))
  const depth = Math.max(1, height - top)
  const gradient = context.createLinearGradient(0, top, 0, height)
  gradient.addColorStop(0, palette.surface)
  gradient.addColorStop(Math.min(1, 10 / depth), palette.body)
  gradient.addColorStop(1, palette.deep)

  context.beginPath()
  traceSurface(context, near, columns, width)
  context.lineTo(width, height)
  context.lineTo(0, height)
  context.closePath()
  context.fillStyle = gradient
  context.fill()

  // The meniscus: a lit line along the near surface, the brightest thing in
  // the liquid, which is what tells the eye where the level is.
  context.beginPath()
  traceSurface(context, near, columns, width)
  context.lineWidth = clamp(Math.min(width, height) * 0.012, 1, 2.5)
  context.strokeStyle = palette.meniscus
  context.stroke()
}

/** The part of the vessel under the near surface, as a clip path in the vessel's own pixels. */
const submergedPath = (simulation: LiquidLevelSimulation, width: number, height: number): string => {
  const { columns } = simulation
  const step = width / columns
  const y = (index: number) => (height * (1 - simulation.front(index))).toFixed(2)
  const points = [`0px ${y(0)}px`]
  for (let index = 0; index < columns; index += 1) points.push(`${((index + 0.5) * step).toFixed(2)}px ${y(index)}px`)
  points.push(`${width}px ${y(columns - 1)}px`, `${width}px ${height}px`, `0px ${height}px`)
  return `polygon(${points.join(', ')})`
}

/**
 * A glass vessel with liquid inside whose level follows a value. The level
 * springs past its mark and settles back, the surface sloshes when it jumps
 * and leans toward a pointer, and the reading turns to the liquid's ink where
 * the liquid covers it.
 *
 * The vessel is a `LiquidSurface`, so the backdrop still refracts through
 * the glass; the liquid is drawn on a canvas inside it, under the lit rim. It
 * is a meter in the WAI-ARIA sense, like `LiquidGauge`: a level, not progress.
 * With `motion={false}` on the provider the level moves straight to its mark
 * with a still surface. Like `@liquefy-ui/react`, it does not read
 * prefers-reduced-motion itself; map that to `motion` if the app wants to.
 */
export const LiquidLevel = forwardRef<HTMLDivElement, LiquidLevelProps>(({
  children,
  className,
  label,
  max = 100,
  onPointerLeave,
  onPointerMove,
  shape = 'circle',
  size = 120,
  style,
  styles,
  tilt = true,
  tint,
  value,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const animated = config.motion
  const ratio = max > 0 && Number.isFinite(value) ? clamp(value / max, 0, 1) : 0
  const percent = Math.round(ratio * 100)
  const box = vesselBox(shape, size)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const wetRef = useRef<HTMLSpanElement | null>(null)
  const paletteRef = useRef<Palette | null>(null)
  const sizeRef = useRef({ height: box.height, width: box.width })
  const frameRef = useRef(0)
  const visibleRef = useRef(true)
  const ratioRef = useRef(ratio)
  ratioRef.current = ratio

  const [ink, setInk] = useState(WHITE)
  // Until the canvas has drawn — on the server, and without a 2D context — a
  // flat band of the tint stands in for the liquid.
  const [drawn, setDrawn] = useState(false)
  // Handed to React once and never changed, so a re-render does not put the
  // flat clip back over the one each frame traces along the surface.
  const [initialClip] = useState(() => `inset(${((1 - ratio) * 100).toFixed(2)}% 0 0 0)`)

  const simulation = useMemo(
    () => new LiquidLevelSimulation(ratioRef.current, {
      aspect: sizeRef.current.width / sizeRef.current.height,
      wobbliness: config.wobbliness,
    }),
    [config.wobbliness],
  )

  const paint = useCallback(() => {
    const { height, width } = sizeRef.current
    const context = contextRef.current
    const palette = paletteRef.current
    if (context && palette && width > 0 && height > 0) drawLiquid(context, simulation, width, height, palette)
    if (wetRef.current) wetRef.current.style.clipPath = submergedPath(simulation, width, height)
  }, [simulation])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [])

  const run = useCallback(() => {
    if (frameRef.current !== 0 || !visibleRef.current) return
    let last = performance.now()
    const tick = (now: number) => {
      const busy = simulation.step((now - last) / 1000)
      last = now
      paint()
      // Stops once the surface is still, and while the vessel is off screen;
      // the observer below picks it up again when it comes back.
      frameRef.current = busy && visibleRef.current ? requestAnimationFrame(tick) : 0
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [paint, simulation])

  useEffect(() => stop, [simulation, stop])

  const setRoot = useCallback((element: HTMLDivElement | null) => {
    rootRef.current = element
    if (typeof forwardedRef === 'function') forwardedRef(element)
    else if (forwardedRef) forwardedRef.current = element
  }, [forwardedRef])

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return undefined
    contextRef.current ??= canvas.getContext('2d')
    const measure = () => {
      // The untransformed box: the vessel's own squash and tilt must not
      // resize the canvas under it.
      const width = root.clientWidth
      const height = root.clientHeight
      if (width <= 0 || height <= 0) return
      sizeRef.current = { height, width }
      const density = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * density)
      canvas.height = Math.round(height * density)
      contextRef.current?.setTransform(density, 0, 0, density, 0, 0)
      simulation.resize(width / height)
      paint()
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [paint, simulation])

  // The tint can be any CSS colour, including the provider's custom property,
  // so it is read back from the canvas's computed style rather than parsed.
  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root || !contextRef.current) return undefined
    const read = () => {
      const rgb = readColor(canvas)
      if (!rgb) return
      paletteRef.current = liquidPalette(rgb, readColor(root))
      setInk(paletteRef.current.ink)
      setDrawn(true)
      paint()
    }
    read()
    // The system theme can turn the lettering from dark to light under a
    // vessel that is already mounted, and the ink below the surface has to
    // turn with it.
    if (config.theme !== 'system' || typeof window.matchMedia !== 'function') return undefined
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', read)
    return () => scheme.removeEventListener('change', read)
  }, [config.theme, config.tint, paint, tint])

  useEffect(() => {
    simulation.setLevel(ratio)
    if (!animated) {
      stop()
      simulation.setLean(0)
      simulation.settle()
      paint()
      return
    }
    run()
  }, [animated, paint, ratio, run, simulation, stop])

  useEffect(() => {
    if (tilt || !animated) return
    simulation.setLean(0)
    run()
  }, [animated, run, simulation, tilt])

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      visibleRef.current = entries.at(-1)?.isIntersecting ?? true
      if (visibleRef.current && !simulation.settled) run()
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [run, simulation])

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event)
    if (!tilt || !animated) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    simulation.setLean(((event.clientX - rect.left) / rect.width) * 2 - 1)
    run()
  }

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event)
    if (!tilt || !animated) return
    simulation.setLean(0)
    run()
  }

  const reading = children ?? (
    <>
      {percent}
      <small style={{ fontSize: '0.55em', fontWeight: 700, marginLeft: '0.05em', opacity: 0.7 }}>%</small>
    </>
  )
  const readingStyle: CSSProperties = {
    alignItems: 'center',
    display: 'flex',
    fontSize: Math.round(Math.min(box.width, box.height) * 0.26),
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 800,
    inset: 0,
    justifyContent: 'center',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 3,
  }
  // Under the lit rim and the shader's glints (z-index 1 and 2 inside the
  // surface), so the liquid reads as inside the glass rather than on it.
  const liquidStyle: CSSProperties = {
    height: '100%',
    inset: 0,
    pointerEvents: 'none',
    position: 'absolute',
    width: '100%',
    zIndex: 0,
  }

  // A meter rather than a progressbar, for the same reason as LiquidGauge:
  // this is a level, not a task heading for done.
  return (
    <LiquidSurface
      {...props}
      aria-label={label}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={ratio * max}
      aria-valuetext={`${percent}%`}
      className={['lq-liquid-level', className].filter(Boolean).join(' ')}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      radius={box.radius}
      ref={setRoot}
      role="meter"
      style={{
        '--lq-level-tint': tint ?? 'var(--lq-accent)',
        display: 'inline-block',
        flex: 'none',
        height: box.height,
        verticalAlign: 'middle',
        width: box.width,
        ...style,
      } as CSSProperties}
      styles={styles}
      tint={tint}
    >
      {!drawn && (
        <span
          aria-hidden="true"
          style={{
            ...liquidStyle,
            background: 'color-mix(in srgb, var(--lq-level-tint) 55%, transparent)',
            height: `${(ratio * 100).toFixed(2)}%`,
            inset: 'auto 0 0',
          }}
        />
      )}
      <canvas aria-hidden="true" ref={canvasRef} style={{ ...liquidStyle, color: 'var(--lq-level-tint)' }} />
      <span aria-hidden="true" style={readingStyle}>{reading}</span>
      <span
        aria-hidden="true"
        ref={wetRef}
        style={{
          ...readingStyle,
          clipPath: initialClip,
          color: ink,
          textShadow: ink === WHITE ? '0 1px 2px rgba(0, 0, 0, 0.28)' : undefined,
        }}
      >
        {reading}
      </span>
    </LiquidSurface>
  )
})

LiquidLevel.displayName = 'LiquidLevel'
