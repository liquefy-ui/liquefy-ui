import { useLiquefyConfig } from '@liquefy-ui/react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { ParticlePainter } from './particle-painter'
import {
  particleConfig,
  ParticleSystem,
  type ParticleConfig,
  type ParticlePreset,
} from './particle-system'
import { useBeforePaint } from './use-before-paint'

export type ParticleFieldHandle = {
  /** Bears `count` particles at once from the emitter, as many as the limits allow: a confetti cannon, say. */
  burst: (count?: number) => void
}

export type ParticleFieldProps = {
  /** Pixels the particles are drawn past the field's edges, on every side: room for sparkles to spill out of a button. */
  bleed?: number
  /**
   * What the particles play around. Without children, the field fills its
   * nearest positioned ancestor and paints where it falls among its siblings
   * — first, under the glass that follows it. With them, it wraps them in an
   * `inline-flex` box and draws over or behind them, as `layer` says.
   */
  children?: ReactNode
  className?: string
  /** Settings over the preset's (or, with no preset, over `PARTICLE_DEFAULTS`): rate, speed, gravity, spread, colours, size, lifetime and the rest. */
  config?: Partial<ParticleConfig>
  /** With children, whether the particles are drawn over them or behind them. */
  layer?: 'behind' | 'over'
  /** Stops new particles being born; the ones in the air see out their lives. */
  paused?: boolean
  preset?: ParticlePreset
  /** Seeds the random numbers, so the field draws the same particles every time it mounts. */
  seed?: number
  style?: CSSProperties
  /** The colour a preset's `var(--lq-particle-tint)` stands for. The provider's tint when left out. */
  tint?: string
}

const CANVAS: CSSProperties = { display: 'block', height: '100%', width: '100%' }

/** What a burst bears when it is not told how many. */
const BURST = 40

type Running = { painter: ParticlePainter; system: ParticleSystem; wake: () => void }

/**
 * Particles on a canvas: rain, snow, confetti, fireworks, bubbles rising and
 * magic sparkling — Vortex's presets for the web — or a system of your own.
 *
 * ```tsx
 * // Behind glass: it fills the section, and the card over it bends it.
 * <section style={{ position: 'relative' }}>
 *   <ParticleField preset="snow" />
 *   <GlassCard>…</GlassCard>
 * </section>
 *
 * // Around something, spilling past its edges
 * <ParticleField bleed={28} preset="magic">
 *   <LiquidButton>Upgrade</LiquidButton>
 * </ParticleField>
 * ```
 *
 * It is drawn with a 2D canvas, `aria-hidden` and clear of the pointer, and it
 * stops drawing while it is off screen or its tab is in the background. The
 * particles run on a clock of their own that only moves when a frame is drawn.
 * A config can be changed while it runs: the particles already alive keep
 * theirs, so one preset gives way to the next. With `motion={false}` on the
 * provider there are no particles at all.
 */
export const ParticleField = forwardRef<ParticleFieldHandle, ParticleFieldProps>(({
  bleed = 0,
  children,
  className,
  config,
  layer = 'over',
  paused = false,
  preset,
  seed,
  style,
  tint,
}, ref) => {
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion.
  const { motion } = useLiquefyConfig()
  // Compared by value, so a config written inline does not restart anything.
  const configKey = JSON.stringify(config ?? null)
  const resolved = useMemo(
    () => particleConfig(preset, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preset, configKey],
  )
  const [firstSeed] = useState(() => seed ?? Math.floor(Math.random() * 4294967296))

  const hostRef = useRef<HTMLSpanElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const runningRef = useRef<Running | null>(null)
  const latest = useRef({ paused, resolved })
  latest.current = { paused, resolved }

  useImperativeHandle(ref, () => ({
    burst: (count = BURST) => {
      const running = runningRef.current
      if (!running) return
      running.system.burst(count)
      running.wake()
    },
  }), [])

  useBeforePaint(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!motion || !host || !canvas) return undefined
    const painter = new ParticlePainter(canvas)
    if (!painter.ready) return undefined

    const system = new ParticleSystem(latest.current.resolved, { seed: firstSeed })
    system.emitting = !latest.current.paused
    let frame = 0
    let last = 0
    let onScreen = true
    let warmed = false

    const drawing = () => onScreen && document.visibilityState !== 'hidden'
    const tick = (now: number) => {
      const busy = system.step((now - last) / 1000)
      last = now
      painter.draw(system)
      frame = busy && drawing() ? requestAnimationFrame(tick) : 0
    }
    const wake = () => {
      if (frame !== 0 || !drawing()) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    const sleep = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const measure = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (width <= 0 || height <= 0) return
      system.resize(width - bleed * 2, height - bleed * 2, { bottom: bleed, left: bleed, right: bleed, top: bleed })
      painter.resize(width, height, bleed, bleed)
      // Opens full: the first time there is somewhere to put them, the
      // particles are run on for the preset's `prewarm` before being drawn.
      if (!warmed) {
        warmed = true
        system.warm()
      }
      painter.draw(system)
      wake()
    }
    measure()

    const resizing = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizing?.observe(host)
    const watching = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
        onScreen = entries.at(-1)?.isIntersecting ?? true
        if (onScreen) wake()
        else sleep()
      })
    watching?.observe(host)
    const onVisibility = () => (drawing() ? wake() : sleep())
    document.addEventListener('visibilitychange', onVisibility)

    runningRef.current = { painter, system, wake }
    return () => {
      sleep()
      resizing?.disconnect()
      watching?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      runningRef.current = null
    }
  }, [bleed, firstSeed, motion])

  useEffect(() => {
    const running = runningRef.current
    if (!running) return
    running.system.setConfig(resolved)
    running.wake()
  }, [resolved])

  useEffect(() => {
    const running = runningRef.current
    if (!running) return
    running.system.emitting = !paused
    running.wake()
  }, [paused])

  useEffect(() => {
    runningRef.current?.painter.refresh()
  }, [tint])

  const wrapped = children !== undefined && children !== null
  const tintVariable = { '--lq-particle-tint': tint ?? 'var(--lq-accent)' } as CSSProperties
  const host = motion
    ? (
      <span
        aria-hidden="true"
        className={wrapped ? undefined : className}
        data-particle-field={preset ?? 'custom'}
        ref={hostRef}
        style={{
          ...(wrapped ? undefined : tintVariable),
          inset: -bleed,
          pointerEvents: 'none',
          position: 'absolute',
          zIndex: wrapped ? (layer === 'behind' ? -1 : 1) : undefined,
          ...(wrapped ? undefined : style),
        }}
      >
        <canvas ref={canvasRef} style={CANVAS} />
      </span>
    )
    : null

  if (!wrapped) return host

  return (
    <span
      className={className}
      style={{
        ...tintVariable,
        display: 'inline-flex',
        // Particles behind the content sit at z-index -1, which needs a
        // stacking context of its own to stay in front of the page.
        isolation: 'isolate',
        position: 'relative',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {layer === 'behind' && host}
      {children}
      {layer !== 'behind' && host}
    </span>
  )
})

ParticleField.displayName = 'ParticleField'
