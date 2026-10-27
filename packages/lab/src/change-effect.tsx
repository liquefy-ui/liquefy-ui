import { clamp } from '@liquefy-ui/core'
import { useLiquefyConfig } from '@liquefy-ui/react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  blendPose,
  BLEND_MS,
  glowAt,
  GLOW_MS,
  jumpHeight,
  jumpPose,
  JUMP_MS,
  shakeDistance,
  shakePose,
  SHAKE_MS,
  shineAt,
  SHINE_MS,
  SPRAY,
  SPRAY_BLEED,
  SPRAY_COUNT,
  STILL,
  type ChangeEffectName,
  type EffectPose,
} from './change-effect-motion'
import { ParticlePainter } from './particle-painter'
import { ParticleSystem } from './particle-system'

export type ChangeEffectHandle = {
  /** Plays the effect once now, as a new `trigger` would: for a change that leaves the value where it was. */
  play: () => void
}

export type ChangeEffectProps = {
  /** What the effect plays on: a button, a field, a count. Its behaviour is left exactly as it is. */
  children: ReactNode
  className?: string
  effect: ChangeEffectName
  /** How fast it plays: 2 is twice as fast, 0.5 half. */
  speed?: number
  /** Applied to the wrapper, which is an `inline-flex` box around `children`. */
  style?: CSSProperties
  /** The colour of a glow's light and of a spray's droplets, any CSS colour. The provider's tint when left out. */
  tint?: string
  /**
   * Plays the effect once each time this changes, compared with `Object.is`,
   * and never on mount — a count, a value, anything that changes when the
   * effect should. The same as `IconEffect`'s.
   */
  trigger?: unknown
}

/** The longest frame the effects count, in seconds: a stalled frame slows them rather than skipping them. */
const MAX_FRAME = 1 / 30

const LAYER: CSSProperties = { inset: 0, pointerEvents: 'none', position: 'absolute' }

/**
 * Where each effect draws, if it draws anything of its own: a glow behind the
 * content, so glass over it is lit from behind and bends it; a shine over it,
 * clipped to its shape; a spray over it and out past its edges. A jump and a
 * shake move the content itself and add nothing.
 */
const LAYERS: Record<ChangeEffectName, CSSProperties | null> = {
  glow: { ...LAYER, zIndex: -1 },
  jump: null,
  shake: null,
  shine: { ...LAYER, overflow: 'hidden', zIndex: 1 },
  spray: { ...LAYER, zIndex: 1 },
}

/**
 * The light that crosses in a shine: a soft band with a bright line down its
 * middle, at 45 degrees, on a box three times the element's size so it can
 * start beyond one corner and finish beyond the other.
 */
const SHINE_BAND = 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.18) 46%, '
  + 'rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.18) 54%, transparent 60%)'

/** A glow is the tint lifted toward white, so even a dark tint gives off light. */
const GLOW_COLOR = 'color-mix(in srgb, var(--lq-particle-tint) 50%, white)'

const poseTransform = ({ rotate, scaleX, scaleY, x, y }: EffectPose): string =>
  `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rotate.toFixed(2)}deg) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`

const element = (parent: HTMLElement, style: Partial<CSSStyleDeclaration>): HTMLElement => {
  const node = parent.ownerDocument.createElement('span')
  Object.assign(node.style, style)
  parent.append(node)
  return node
}

/**
 * The corners an effect follows: those of the first thing inside the wrapper
 * that has any, looking a few levels in — a text field's rounded control sits
 * inside a square box of its own.
 */
const radiusOf = (root: HTMLElement): string => {
  let node = root.firstElementChild
  for (let depth = 0; node && depth < 4; depth += 1, node = node.firstElementChild) {
    const radius = getComputedStyle(node).borderRadius
    if (radius && !/^0(px)?$/.test(radius)) return radius
  }
  return '0px'
}

type Move = { from: EffectPose; height: number; speed: number; start: number; width: number }
type Timed = { node: HTMLElement | null; speed: number; start: number }
type Spray = { canvas: HTMLCanvasElement; painter: ParticlePainter; speed: number; system: ParticleSystem }

/**
 * Plays one kind of effect on one wrapper, as often as it is asked, on a clock
 * of its own that only moves when a frame runs. Every play is kept until it has
 * finished, so plays overlap: a second shine crosses behind the first, a second
 * spray throws more droplets into the air, and a jump started mid-air leaves
 * from where it was caught.
 */
class EffectPlayer {
  private clock = 0
  private frame = 0
  private glows: Timed[] = []
  private halo: HTMLElement | null = null
  private last = 0
  private move: Move | null = null
  private restingTransform = ''
  private restingOrigin = ''
  private shines: Timed[] = []
  private spray: Spray | null = null

  public constructor(
    private readonly effect: ChangeEffectName,
    private readonly root: HTMLElement,
    private readonly layer: HTMLElement | null,
  ) {}

  public play(speed: number): void {
    const rate = speed > 0 && Number.isFinite(speed) ? speed : 1
    const { effect, layer, root } = this
    if (effect === 'jump' || effect === 'shake') {
      if (!this.move) {
        this.restingTransform = root.style.transform
        this.restingOrigin = root.style.transformOrigin
      }
      const from = this.move ? this.pose(this.move) : STILL
      this.move = { from, height: root.offsetHeight, speed: rate, start: this.clock, width: root.offsetWidth }
      if (effect === 'jump') root.style.transformOrigin = '50% 100%'
    } else if (effect === 'shine' && layer) {
      layer.style.borderRadius = radiusOf(root)
      const node = element(layer, {
        background: SHINE_BAND,
        height: '300%',
        left: '-100%',
        position: 'absolute',
        top: '-100%',
        transform: 'translate(-33.34%, -33.34%)',
        width: '300%',
      })
      this.shines.push({ node, speed: rate, start: this.clock })
    } else if (effect === 'glow' && layer) {
      this.halo ??= element(layer, {
        background: GLOW_COLOR,
        borderRadius: radiusOf(root),
        boxShadow: `0 0 28px 12px ${GLOW_COLOR}`,
        inset: '0',
        opacity: '0',
        position: 'absolute',
      })
      this.glows.push({ node: null, speed: rate, start: this.clock })
    } else if (effect === 'spray' && layer) {
      this.startSpray(rate)
    }
    this.wake()
  }

  /** Stops everything at once and puts the wrapper back as it was. */
  public stop(): void {
    cancelAnimationFrame(this.frame)
    this.frame = 0
    if (this.move) this.settle()
    for (const shine of this.shines) shine.node?.remove()
    this.shines = []
    this.glows = []
    this.halo?.remove()
    this.halo = null
    this.spray?.canvas.remove()
    this.spray = null
  }

  private startSpray(speed: number): void {
    const { layer, root } = this
    if (!layer) return
    const width = root.offsetWidth
    const height = root.offsetHeight
    if (!this.spray) {
      const canvas = root.ownerDocument.createElement('canvas')
      const painter = new ParticlePainter(canvas)
      if (!painter.ready) return
      const { bottom, left, right, top } = SPRAY_BLEED
      Object.assign(canvas.style, {
        height: `${height + top + bottom}px`,
        left: `${-left}px`,
        position: 'absolute',
        top: `${-top}px`,
        width: `${width + left + right}px`,
      })
      layer.append(canvas)
      painter.resize(width + left + right, height + top + bottom, left, top)
      this.spray = { canvas, painter, speed, system: new ParticleSystem(SPRAY) }
    }
    this.spray.speed = speed
    this.spray.system.resize(width, height, SPRAY_BLEED)
    this.spray.system.burst(SPRAY_COUNT)
  }

  private wake(): void {
    if (this.frame) return
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  private readonly tick = (now: number): void => {
    const delta = clamp((now - this.last) / 1000, 0, MAX_FRAME)
    this.last = now
    this.clock += delta * 1000
    const busy = this.update(delta)
    this.frame = busy ? requestAnimationFrame(this.tick) : 0
  }

  private elapsed({ speed, start }: { speed: number; start: number }): number {
    return (this.clock - start) * speed
  }

  private pose(move: Move): EffectPose {
    const elapsed = this.elapsed(move)
    const pose = this.effect === 'jump'
      ? jumpPose(elapsed, jumpHeight(move.height))
      : shakePose(elapsed, shakeDistance(move.width))
    const share = clamp(elapsed / BLEND_MS, 0, 1)
    return share < 1 ? blendPose(move.from, pose, 1 - (1 - share) * (1 - share)) : pose
  }

  private settle(): void {
    this.move = null
    this.root.style.transform = this.restingTransform
    this.root.style.transformOrigin = this.restingOrigin
  }

  /** Draws this frame; whether anything is still playing. */
  private update(delta: number): boolean {
    const move = this.move
    if (move) {
      if (this.elapsed(move) >= (this.effect === 'jump' ? JUMP_MS : SHAKE_MS)) {
        this.settle()
      } else {
        this.root.style.transform = `${this.restingTransform} ${poseTransform(this.pose(move))}`.trim()
      }
    }

    this.shines = this.shines.filter((shine) => {
      const elapsed = this.elapsed(shine)
      if (elapsed >= SHINE_MS) {
        shine.node?.remove()
        return false
      }
      // From a third of its own size up and left (the band beyond the top-left
      // corner) to a third down and right (beyond the bottom-right).
      const offset = ((shineAt(elapsed) * 2 - 1) * 33.34).toFixed(3)
      if (shine.node) shine.node.style.transform = `translate(${offset}%, ${offset}%)`
      return true
    })

    if (this.halo) {
      this.glows = this.glows.filter((glow) => this.elapsed(glow) < GLOW_MS)
      // Glows that overlap take the brighter of the two, rather than adding up.
      let level = 0
      let spread = 0
      for (const glow of this.glows) {
        const frame = glowAt(this.elapsed(glow))
        if (frame.level >= level) ({ level, spread } = frame)
      }
      if (this.glows.length === 0) {
        this.halo.remove()
        this.halo = null
      } else {
        this.halo.style.opacity = level.toFixed(3)
        this.halo.style.transform = `scale(${(1 + 0.12 * spread).toFixed(4)})`
      }
    }

    const spray = this.spray
    if (spray) {
      const busy = spray.system.step(delta * spray.speed)
      spray.painter.draw(spray.system)
      if (!busy) {
        spray.canvas.remove()
        this.spray = null
      }
    }

    return this.move !== null || this.shines.length > 0 || this.halo !== null || this.spray !== null
  }
}

/**
 * Plays an effect on what it wraps each time a value changes: Pow's change
 * effects for the web.
 *
 * - `spray` throws droplets of glass up out of it, every size, that fall back
 *   and shrink away — a like.
 * - `jump` crouches, hops, and lands with a squash it wobbles out of.
 * - `shine` runs a band of light across it, from the top-left corner to the
 *   bottom-right.
 * - `shake` shakes it from side to side, quickly and smaller each time — a
 *   wrong passcode.
 * - `glow` lights it up from behind and lets the light fade.
 *
 * ```tsx
 * <ChangeEffect effect="spray" trigger={likes}>
 *   <LiquidIconButton label="Like" onClick={like}><HeartIcon /></LiquidIconButton>
 * </ChangeEffect>
 * ```
 *
 * Effects nest, so a like can spray and jump at once; put the spray outside,
 * so its droplets stay where they were thrown while the button jumps. The
 * wrapper is an `inline-flex` box with nothing on it that would stop glass
 * inside from refracting; what the effects draw is `aria-hidden`, and the
 * content's behaviour is untouched. The motion runs on a clock of its own that
 * only moves when a frame runs, so a busy main thread slows an effect rather
 * than skipping it. With `motion={false}` on the provider nothing plays.
 */
export const ChangeEffect = forwardRef<ChangeEffectHandle, ChangeEffectProps>(({
  children,
  className,
  effect,
  speed = 1,
  style,
  tint,
  trigger,
}, ref) => {
  // Like every @liquefy-ui/react component, this answers to the provider's
  // `motion` switch only, not to prefers-reduced-motion.
  const { motion } = useLiquefyConfig()
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const layerRef = useRef<HTMLSpanElement | null>(null)
  const playerRef = useRef<EffectPlayer | null>(null)
  const settings = useRef({ motion, speed })
  settings.current = { motion, speed }
  const layer = LAYERS[effect]

  const play = useCallback(() => {
    const root = rootRef.current
    if (!settings.current.motion || !root) return
    playerRef.current ??= new EffectPlayer(effect, root, layerRef.current)
    playerRef.current.play(settings.current.speed)
  }, [effect])

  useImperativeHandle(ref, () => ({ play }), [play])

  const lastTrigger = useRef(trigger)
  useEffect(() => {
    if (Object.is(lastTrigger.current, trigger)) return
    lastTrigger.current = trigger
    play()
    // Only a new `trigger` plays; a change to the options waits for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  useEffect(() => {
    if (!motion) playerRef.current?.stop()
  }, [motion])

  useEffect(() => () => {
    playerRef.current?.stop()
    playerRef.current = null
  }, [effect])

  return (
    <span
      className={className}
      data-change-effect={effect}
      ref={rootRef}
      style={{
        '--lq-particle-tint': tint ?? 'var(--lq-accent)',
        display: 'inline-flex',
        // A glow sits behind the content at z-index -1, which needs a stacking
        // context of its own to stay in front of whatever is behind the wrapper.
        isolation: 'isolate',
        position: 'relative',
        verticalAlign: 'middle',
        ...style,
      } as CSSProperties}
    >
      {children}
      {layer && <span aria-hidden="true" ref={layerRef} style={layer} />}
    </span>
  )
})

ChangeEffect.displayName = 'ChangeEffect'
