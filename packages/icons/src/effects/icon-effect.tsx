import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import {
  canAnimate,
  elapsed,
  iconOf,
  play,
  StrokeDrawing,
  useBeforePaint,
  useMotionGate,
} from './dom'
import {
  atSpeed,
  bounceTrack,
  breatheTrack,
  breathVelocity,
  landingTrack,
  poseTransform,
  REST,
  settleTrack,
  trackKeyframes,
  TURN_MS,
  turnTrack,
  wiggleTrack,
  withRest,
  type BounceDirection,
  type DrawOrder,
  type RotateDirection,
  type Track,
  type WiggleDirection,
} from './motion'

export type IconBounceDirection = BounceDirection
export type IconWiggleDirection = WiggleDirection
export type IconRotateDirection = RotateDirection
export type IconDrawOrder = DrawOrder

type EffectBase = {
  /** The icon: any element that renders an `<svg>`, such as the icons in this package. */
  children: ReactNode
  /**
   * Whether the effect may move. Left out, it follows the nearest
   * `LiquefyProvider`'s `motion` and moves when there is none; it never reads
   * `prefers-reduced-motion`. False holds the icon still, and a drawing goes
   * straight to where `drawn` says.
   */
  motion?: boolean
  /** How fast it plays: 2 is twice as fast, 0.5 half. */
  speed?: number
}

type Discrete = {
  /**
   * Plays the effect once each time this changes, compared with `Object.is`,
   * and never on mount — a count, a value, anything that changes when the
   * effect should. SF Symbols' `value:`.
   */
  trigger?: unknown
}

type Indefinite = Discrete & {
  /**
   * Plays the effect over and over while true, and lets it come to rest when it
   * turns false: a spin finishes its turn, a breath sinks back. SF Symbols'
   * `isActive:`.
   */
  active?: boolean
}

export type IconEffectProps =
  | (EffectBase & Indefinite & {
    /** `up` crouches and hops; `down` is pressed in and springs back. */
    direction?: BounceDirection
    effect: 'bounce'
  })
  | (EffectBase & Indefinite & {
    /** How far a `clockwise` or `counterClockwise` wiggle rocks, in degrees. */
    angle?: number
    /**
     * Which way it sets off: `left`, `right`, `up` and `down` slide it, a
     * number is any other heading in degrees clockwise from right, and
     * `clockwise` and `counterClockwise` rock it about its centre.
     */
    direction?: WiggleDirection
    effect: 'wiggle'
  })
  | (EffectBase & Indefinite & { effect: 'breathe' })
  | (EffectBase & Indefinite & { direction?: RotateDirection; effect: 'rotate' })
  | (EffectBase & Discrete & {
    /**
     * Whether the icon is drawn. Turning true draws its strokes on, turning
     * false draws them off again in reverse; false on mount renders it hidden
     * (on the server too), keeping its space. `trigger` draws it on afresh.
     */
    drawn?: boolean
    effect: 'draw'
    /** One stroke after another in the order the icon was written, or all at once. */
    strokes?: DrawOrder
  })

export type IconEffectName = IconEffectProps['effect']

type MotionProps = Exclude<IconEffectProps, { effect: 'draw' }>
type DrawProps = Extract<IconEffectProps, { effect: 'draw' }>
type MotionShape = {
  angle?: number
  direction?: BounceDirection | RotateDirection | WiggleDirection
  effect: MotionProps['effect']
  speed: number
}

/** The wrapper adds no box of its own, so wrapping an icon changes nothing about where it sits. */
const WRAPPER = { display: 'contents' } as const

/** Stillness between the plays of a repeating bounce or wiggle, in milliseconds at speed 1. */
const REPEAT_REST = 700

const once = ({ angle, direction, effect, speed }: MotionShape): Track => {
  switch (effect) {
    case 'bounce':
      return atSpeed(bounceTrack(direction as BounceDirection | undefined), speed)
    case 'wiggle':
      return atSpeed(wiggleTrack(direction as WiggleDirection | undefined, angle), speed)
    case 'breathe':
      return atSpeed(breatheTrack(), speed)
    case 'rotate':
      return atSpeed(turnTrack(direction as RotateDirection | undefined), speed)
  }
}

const playTrack = (icon: Element, track: Track, iterations = 1): Animation | null =>
  play(icon, trackKeyframes(track), { composite: 'add', duration: track.duration, easing: 'linear', iterations })

/** An animation bringing a loop to rest, and for a spin, how far round it has got. */
type Settling = { angle?: () => number; animation: Animation }

/** A running loop and how to bring it to rest. */
type Loop = { animation: Animation; settle: () => Settling | null }

const startLoop = (icon: Element, shape: MotionShape, angle: number): Loop | null => {
  const { direction, effect, speed } = shape
  if (effect === 'rotate') {
    const sign = direction === 'counterClockwise' ? -1 : 1
    const duration = TURN_MS / (speed > 0 ? speed : 1)
    const animation = play(
      icon,
      [{ transform: poseTransform(REST) }, { transform: poseTransform({ ...REST, rotate: sign * 360 }) }],
      { composite: 'add', duration, easing: 'linear', iterations: Number.POSITIVE_INFINITY },
    )
    if (!animation) return null
    // Pick up where a spin that was just coming to rest had got to.
    animation.currentTime = (angle / 360) * duration
    return {
      animation,
      settle: () => {
        const turned = ((elapsed(animation) % duration) / duration) * 360
        animation.cancel()
        const track = landingTrack(turned, direction as RotateDirection | undefined, speed)
        const landing = playTrack(icon, track)
        if (!landing) return null
        const angle = () => ((sign * track.at(elapsed(landing)).rotate) % 360 + 360) % 360
        return { angle, animation: landing }
      },
    }
  }

  if (effect === 'breathe') {
    const track = atSpeed(breatheTrack(), speed)
    const animation = playTrack(icon, track, Number.POSITIVE_INFINITY)
    if (!animation) return null
    return {
      animation,
      settle: () => {
        const at = elapsed(animation) % track.duration
        const scale = track.at(at).scaleX
        animation.cancel()
        const settling = playTrack(icon, settleTrack(scale, breathVelocity(at * speed) * speed))
        return settling ? { animation: settling } : null
      },
    }
  }

  const track = withRest(once(shape), REPEAT_REST / (speed > 0 ? speed : 1))
  const moving = once(shape).duration
  const animation = playTrack(icon, track, Number.POSITIVE_INFINITY)
  if (!animation) return null
  return {
    animation,
    settle: () => {
      // Mid-hop, let this hop land; already resting, there is nothing to finish.
      const iteration = Math.floor(elapsed(animation) / track.duration)
      if (elapsed(animation) % track.duration >= moving) {
        animation.cancel()
        return null
      }
      animation.effect?.updateTiming({ iterations: iteration + 1 })
      return { animation }
    },
  }
}

const MotionEffect = (props: MotionProps): ReactElement => {
  const { active = false, children, effect, motion, speed = 1, trigger } = props
  const direction = 'direction' in props ? props.direction : undefined
  const angle = props.effect === 'wiggle' ? props.angle : undefined
  const ref = useRef<HTMLSpanElement>(null)
  const gate = useMotionGate(ref, motion)
  const plays = useRef(new Set<Animation>())
  const resting = useRef<Settling | null>(null)
  const shape: MotionShape = { angle, direction, effect, speed }
  const latest = useRef(shape)
  latest.current = shape
  const lastTrigger = useRef(trigger)

  const keep = (animation: Animation | null): void => {
    if (!animation) return
    plays.current.add(animation)
    const forget = () => plays.current.delete(animation)
    animation.finished.then(forget, forget)
  }

  useEffect(() => {
    if (Object.is(lastTrigger.current, trigger)) return
    lastTrigger.current = trigger
    const icon = iconOf(ref.current)
    if (!icon || !gate.allowed()) return
    keep(playTrack(icon, once(latest.current)))
    // Only a new `trigger` plays; a change to the options waits for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  useEffect(() => {
    const icon = iconOf(ref.current)
    const settling = resting.current
    if (!gate.allowed()) {
      settling?.animation.cancel()
      resting.current = null
      return
    }
    if (!active || !icon || !canAnimate(icon)) return

    // A loop started while the last one is still coming to rest takes over from it.
    const turned = latest.current.effect === 'rotate' ? settling?.angle?.() ?? 0 : 0
    settling?.animation.cancel()
    resting.current = null
    const loop = startLoop(icon, latest.current, turned)
    if (!loop) return

    return () => {
      if (!icon.isConnected || !gate.allowed()) {
        loop.animation.cancel()
        return
      }
      const settling = loop.settle()
      if (!settling) return
      keep(settling.animation)
      resting.current = settling
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, angle, direction, effect, gate.revision, motion, speed])

  useEffect(() => () => {
    for (const animation of plays.current) animation.cancel()
    resting.current?.animation.cancel()
  }, [])

  return <span data-icon-effect={effect} ref={ref} style={WRAPPER}>{children}</span>
}

const DrawEffect = ({ children, drawn = true, motion, speed = 1, strokes = 'sequential', trigger }: DrawProps): ReactElement => {
  const ref = useRef<HTMLSpanElement>(null)
  const gate = useMotionGate(ref, motion)
  const [hidden, setHidden] = useState(!drawn)
  const drawing = useRef<StrokeDrawing | null>(null)
  const shown = useRef(drawn)
  const lastTrigger = useRef(trigger)
  const options = useRef({ order: strokes, speed })
  options.current = { order: strokes, speed }

  const drawTo = (to: 0 | 1, afresh: boolean): void => {
    const wrapper = ref.current
    const icon = iconOf(wrapper)
    if (!wrapper || !icon || !gate.allowed() || !canAnimate(icon)) {
      drawing.current?.dispose()
      drawing.current = null
      setHidden(to === 0)
      return
    }

    if (afresh) {
      drawing.current?.dispose()
      drawing.current = null
    }
    // From nothing, a drawing starts where the icon stands: hidden if it is
    // being drawn on (or drawn afresh), whole if it is being drawn off.
    const current = drawing.current ?? new StrokeDrawing(icon, to === 1 ? 0 : 1)
    drawing.current = current
    if (to === 1) {
      wrapper.style.visibility = ''
      setHidden(false)
    }
    void current.run(to, options.current).then((done) => {
      if (!done || drawing.current !== current) return
      // Hide before the dashes go, or the frame between shows it whole.
      if (to === 0) {
        wrapper.style.visibility = 'hidden'
        setHidden(true)
      }
      current.dispose()
      drawing.current = null
    })
  }

  useBeforePaint(() => {
    if (shown.current === drawn) return
    shown.current = drawn
    drawTo(drawn ? 1 : 0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn])

  useBeforePaint(() => {
    if (Object.is(lastTrigger.current, trigger)) return
    lastTrigger.current = trigger
    if (shown.current) drawTo(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  useEffect(() => () => drawing.current?.dispose(), [])

  return (
    <span data-icon-effect="draw" ref={ref} style={hidden ? { ...WRAPPER, visibility: 'hidden' } : WRAPPER}>
      {children}
    </span>
  )
}

/**
 * Moves an icon the way SF Symbols' symbol effects do: `bounce`, `wiggle`,
 * `breathe`, `rotate`, and `draw` for Draw On and Draw Off.
 *
 * ```tsx
 * <IconEffect effect="bounce" trigger={count}><BellIcon /></IconEffect>
 * <IconEffect active={syncing} effect="rotate"><SettingsIcon /></IconEffect>
 * <IconEffect drawn={saved} effect="draw"><CircleCheckIcon /></IconEffect>
 * ```
 *
 * The wrapper is a `display: contents` span, so it adds no box, and the motion
 * is a spring sampled into Web Animations keyframes, which the browser plays
 * off the main thread. Transforms are added on top of the icon's own, so
 * effects nest: an icon can spin and bounce at once.
 */
export const IconEffect = (props: IconEffectProps): ReactElement =>
  props.effect === 'draw' ? <DrawEffect {...props} /> : <MotionEffect {...props} />
