import { clamp, lerp } from '@liquefy-ui/core'

/**
 * What a particle is drawn as. `bead` is a drop of water, `bubble` a thin
 * film of air; both are drawn as small glass, with a lit rim and a point of
 * light. The rest are flat: a soft `flake`, a `streak` along the way it moves,
 * a tumbling piece of `confetti`, a hot `spark` and a four-pointed `sparkle`.
 */
export type ParticleShape = 'bead' | 'bubble' | 'circle' | 'confetti' | 'flake' | 'spark' | 'sparkle' | 'streak'

/** A box particles are born in, in shares of the field: `x` and `y` its top-left corner, 0 to 1 across the field. */
export type ParticleEmitterBox = { height: number; width: number; x: number; y: number }

/**
 * Where particles are born. `top` and `bottom` are lines just beyond those
 * edges, long enough that slanting particles still cover the field, so they
 * come in from outside; `area` is anywhere they are drawn; `center` is the
 * field's middle. A box is in shares of the field itself.
 */
export type ParticleEmitter = 'area' | 'bottom' | 'center' | 'top' | ParticleEmitterBox

/** What a particle bursts into when its life runs out, as a firework's rocket does. Colours left out are the parent's. */
export type ParticleExplosion = Partial<Omit<ParticleConfig, 'explode'>> & {
  /** How many particles it bursts into. */
  count: number
}

export type ParticleConfig = {
  /** Degrees the particles set off toward, clockwise from right: 90 is straight down, -90 straight up. */
  angle: number
  /** Colours to pick from, any CSS colour; each particle takes one at random. */
  colors: string[]
  /**
   * 0 to 1: how much particles differ in how far away they look. A far one is
   * smaller, slower and fainter, which gives rain and snow their depth.
   */
  depth: number
  /** The share of its speed a particle loses each second to the air; 0 is none. */
  drag: number
  emitter: ParticleEmitter
  /** Bursts into new particles when its life runs out, rather than just going. */
  explode?: ParticleExplosion
  /** The share of its life a particle spends fading out at the end. */
  fadeOut: number
  /** Pixels a second, every second, downward. Negative floats up. */
  gravity: number
  /** Seconds a particle lives, unless it leaves the field first. */
  lifetime: number
  /** 0 to 1: how much a particle's lifetime varies either way. */
  lifetimeVariation: number
  /** The most of these alive at once. Every field is also held under `MAX_PARTICLES` in all. */
  limit: number
  /** 0 to 1. */
  opacity: number
  /** Seconds to run before the first frame, so a field opens full rather than empty. */
  prewarm: number
  /** Particles born a second. 0 emits only on a burst. */
  rate: number
  shape: ParticleShape
  /** Pixels across. A streak's width. */
  size: number
  /** Size at the end of life, as a share of size at birth. */
  sizeAtDeath: number
  /** 0 to 1: how much a particle's size varies either way. */
  sizeVariation: number
  /** Pixels a second at birth. */
  speed: number
  /** 0 to 1: how much a particle's speed varies either way. */
  speedVariation: number
  /** Most degrees a second a particle turns, either way. */
  spin: number
  /** Degrees across the cone particles set off in, centred on `angle`: 0 a beam, 360 every way. */
  spread: number
  /** How long a streak's (or a spark's) tail is: the distance it lags behind the head, in seconds of its own speed. */
  stretch: number
  /** Pixels a particle drifts from side to side as it goes, the way snow and bubbles do. */
  sway: number
  /** Swings a second of that drift. */
  swayRate: number
  /** 0 to 1: how much a particle flickers. */
  twinkle: number
}

export type ParticlePreset = 'bubbles' | 'confetti' | 'fireworks' | 'magic' | 'rain' | 'snow'

/**
 * The colour presets and a custom config can name for the provider's tint, or
 * the `tint` a component is given. It is a custom property, so a field and
 * everything it draws take it from wherever they are on the page.
 */
const TINT = 'var(--lq-particle-tint)'

/** What a config starts from: one plain dot a second, falling. */
export const PARTICLE_DEFAULTS: ParticleConfig = {
  angle: 90,
  colors: ['#ffffff'],
  depth: 0,
  drag: 0,
  emitter: 'top',
  fadeOut: 0.3,
  gravity: 0,
  lifetime: 3,
  lifetimeVariation: 0,
  limit: 200,
  opacity: 1,
  prewarm: 0,
  rate: 1,
  shape: 'circle',
  size: 4,
  sizeAtDeath: 1,
  sizeVariation: 0,
  speed: 100,
  speedVariation: 0,
  spin: 0,
  spread: 0,
  stretch: 0,
  sway: 0,
  swayRate: 0,
  twinkle: 0,
}

/**
 * Vortex's systems, retuned for a stage of about 480 by 320 pixels behind
 * glass. Rates are a second, whatever the size of the field, so a much larger
 * one wants a higher `rate`.
 */
export const PARTICLE_PRESETS: Record<ParticlePreset, ParticleConfig> = {
  bubbles: {
    ...PARTICLE_DEFAULTS,
    angle: -90,
    colors: [TINT],
    depth: 0.5,
    drag: 0.4,
    emitter: 'bottom',
    fadeOut: 0.1,
    gravity: -18,
    lifetime: 9,
    lifetimeVariation: 0.35,
    limit: 120,
    opacity: 0.95,
    prewarm: 8,
    rate: 9,
    shape: 'bubble',
    size: 14,
    sizeAtDeath: 1.2,
    sizeVariation: 0.6,
    speed: 50,
    speedVariation: 0.4,
    spread: 20,
    sway: 9,
    swayRate: 0.55,
  },
  confetti: {
    ...PARTICLE_DEFAULTS,
    colors: ['#ff7a6b', '#ffc94d', '#4fd1a5', '#5aa8ff', '#ffffff', TINT],
    drag: 1.1,
    emitter: 'top',
    fadeOut: 0.15,
    gravity: 170,
    lifetime: 7,
    limit: 260,
    prewarm: 6,
    rate: 34,
    shape: 'confetti',
    size: 9,
    sizeVariation: 0.3,
    speed: 90,
    speedVariation: 0.5,
    spin: 260,
    spread: 50,
    sway: 10,
    swayRate: 0.8,
  },
  fireworks: {
    ...PARTICLE_DEFAULTS,
    angle: -90,
    colors: ['#ffd27a', '#ff8f7d', '#8fd3ff', '#b9f5a6', TINT],
    emitter: { height: 0, width: 0.7, x: 0.15, y: 1 },
    explode: {
      count: 72,
      drag: 1.3,
      fadeOut: 0.45,
      gravity: 90,
      lifetime: 1.4,
      lifetimeVariation: 0.3,
      shape: 'spark',
      size: 4.5,
      sizeAtDeath: 0.5,
      sizeVariation: 0.4,
      speed: 190,
      speedVariation: 0.45,
      spread: 360,
      stretch: 0.07,
      twinkle: 0.5,
    },
    fadeOut: 0,
    gravity: 260,
    lifetime: 0.85,
    lifetimeVariation: 0.2,
    limit: 6,
    opacity: 0.95,
    prewarm: 1.2,
    rate: 1.4,
    shape: 'spark',
    size: 4.5,
    speed: 380,
    speedVariation: 0.12,
    spread: 18,
    stretch: 0.06,
  },
  magic: {
    ...PARTICLE_DEFAULTS,
    angle: -90,
    colors: ['#ffffff', TINT, '#ffe7a8'],
    drag: 0.8,
    emitter: 'area',
    fadeOut: 0,
    gravity: -10,
    lifetime: 1.4,
    lifetimeVariation: 0.4,
    limit: 90,
    opacity: 0.95,
    prewarm: 1.5,
    rate: 26,
    shape: 'sparkle',
    size: 18,
    sizeVariation: 0.5,
    speed: 12,
    speedVariation: 0.6,
    spin: 40,
    spread: 360,
    twinkle: 0.35,
  },
  rain: {
    ...PARTICLE_DEFAULTS,
    angle: 102,
    colors: ['#eef4ff'],
    depth: 0.7,
    emitter: 'top',
    fadeOut: 0,
    lifetime: 3,
    limit: 500,
    opacity: 0.75,
    prewarm: 2,
    rate: 170,
    shape: 'streak',
    size: 1.7,
    sizeVariation: 0.3,
    speed: 900,
    speedVariation: 0.12,
    spread: 2,
    stretch: 0.034,
  },
  snow: {
    ...PARTICLE_DEFAULTS,
    colors: ['#ffffff'],
    depth: 0.6,
    drag: 0.25,
    emitter: 'top',
    fadeOut: 0,
    gravity: 8,
    lifetime: 14,
    limit: 400,
    opacity: 0.9,
    prewarm: 12,
    rate: 26,
    shape: 'flake',
    size: 5,
    sizeVariation: 0.5,
    speed: 34,
    speedVariation: 0.4,
    spread: 24,
    sway: 14,
    swayRate: 0.35,
  },
}

/** A preset with some of its settings changed, or, with no preset, `PARTICLE_DEFAULTS` with them changed. */
export const particleConfig = (preset?: ParticlePreset, overrides?: Partial<ParticleConfig>): ParticleConfig => ({
  ...(preset ? PARTICLE_PRESETS[preset] : PARTICLE_DEFAULTS),
  ...overrides,
})

/** The most particles one system keeps alive, whatever its configs ask for. */
export const MAX_PARTICLES = 1500

/**
 * The longest frame the system counts, in seconds. A stalled frame slows the
 * particles down rather than throwing them across the field, and a tab coming
 * back from the background carries on where it left off.
 */
const MAX_FRAME = 1 / 30

/** How long a particle takes to fade in, at most, in seconds: long enough not to pop, short enough not to show. */
const FADE_IN = 0.12

/** Flickers a second at full `twinkle`. */
const TWINKLE_RATE = 5

/** Turns a second a piece of confetti tumbles end over end, at most. */
const FLIP_RATE = 1.6

const DEGREES = Math.PI / 180

/**
 * Numbers from 0 up to 1 that come out the same for the same seed (Mulberry32):
 * what makes a field that is seeded draw the same particles every time.
 */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** Room around the field that particles are still drawn in, in pixels on each side. */
export type ParticleBleed = { bottom: number; left: number; right: number; top: number }

/** One particle as it is drawn this frame. Positions are in the field's pixels, its top-left corner at 0, 0. */
export type ParticleFrame = {
  color: string
  /** 1 to -1: how much of its face a tumbling piece of confetti shows, negative for its back. */
  flip: number
  opacity: number
  /** Degrees clockwise. */
  rotation: number
  shape: ParticleShape
  /** Pixels across, now. */
  size: number
  /** For a streak, where its tail is from its head. */
  tailX: number
  tailY: number
  x: number
  y: number
}

export type ParticleSystemOptions = {
  /** Where the random numbers come from. Takes precedence over `seed`. */
  random?: () => number
  /** Seeds the random numbers, so the same seed and the same steps draw the same particles. */
  seed?: number
}

type Particle = {
  age: number
  color: string
  config: ParticleConfig
  /** How near it looks, 1 to about 0.4: scales its size, speed and opacity. */
  near: number
  life: number
  phase: number
  rotation: number
  size: number
  spin: number
  swayRate: number
  swaySize: number
  vx: number
  vy: number
  x: number
  y: number
}

/** 1, give or take `variation` of it, never below a twentieth. */
const vary = (random: () => number, variation: number): number =>
  Math.max(0.05, 1 + (random() * 2 - 1) * clamp(variation, 0, 1))

const NO_BLEED: ParticleBleed = { bottom: 0, left: 0, right: 0, top: 0 }

/**
 * A particle system with no DOM attached — Vortex's `VortexSystem`, for the
 * web. Give it a config and the size of its field, `step` it every frame, and
 * read back where every particle is with `each`.
 *
 * It runs on a clock of its own that only moves when it is stepped, at most a
 * thirtieth of a second a step, so a stalled frame or a tab coming back from
 * the background slows it rather than jumping it. Every random number comes
 * from one source, which a `seed` makes repeatable.
 *
 * Changing the config changes the particles born from then on; the ones
 * already alive see out their lives as they were born, so rain can turn to
 * snow without the rain vanishing.
 */
export class ParticleSystem {
  /** Whether particles are being born at `rate`. A burst emits whatever this says. */
  public emitting = true

  private bleed: ParticleBleed = NO_BLEED
  private current: ParticleConfig
  /** Particles owed by `rate` that have not been born yet. */
  private debt = 0
  private height = 0
  private readonly particles: Particle[] = []
  private readonly random: () => number
  /** Per config, how many of its particles are alive: what `limit` counts. */
  private readonly alive = new Map<ParticleConfig, number>()
  private readonly view: ParticleFrame = {
    color: '', flip: 1, opacity: 1, rotation: 0, shape: 'circle', size: 0, tailX: 0, tailY: 0, x: 0, y: 0,
  }
  private width = 0

  public constructor(config: ParticleConfig, { random, seed }: ParticleSystemOptions = {}) {
    this.current = config
    this.random = random ?? createRandom(seed ?? Math.floor(Math.random() * 4294967296))
  }

  /** Particles alive now. */
  public get count(): number {
    return this.particles.length
  }

  /** The config new particles are born from. */
  public get config(): ParticleConfig {
    return this.current
  }

  /** Born from now on with this config. Particles already alive keep theirs. */
  public setConfig(config: ParticleConfig): void {
    if (config === this.current) return
    this.current = config
    this.debt = 0
  }

  /**
   * The size of the field, in pixels, and the room around it that particles
   * are still drawn in. Particles leave when they are past that room and
   * heading away for good.
   */
  public resize(width: number, height: number, bleed: Partial<ParticleBleed> = {}): void {
    this.width = Math.max(0, width)
    this.height = Math.max(0, height)
    this.bleed = { ...NO_BLEED, ...bleed }
  }

  /** Runs `seconds` (the config's `prewarm`, left out) before anything is drawn, so a field opens already full. */
  public warm(seconds = this.current.prewarm): void {
    for (let elapsed = 0; elapsed < seconds; elapsed += MAX_FRAME) this.step(MAX_FRAME)
  }

  /** Bears `count` particles of the current config at once, whatever `rate` and `emitting` say. */
  public burst(count: number): void {
    for (let index = 0; index < count; index += 1) {
      if (!this.spawn(this.current)) break
    }
  }

  /** Takes every particle away at once. */
  public clear(): void {
    this.particles.length = 0
    this.alive.clear()
    this.debt = 0
  }

  /**
   * Moves the particles on by `delta` seconds — at most a thirtieth — bearing
   * new ones and letting old ones go. Returns whether there is anything left to
   * draw or still to come.
   */
  public step(delta: number): boolean {
    const dt = Math.min(Math.max(Number.isFinite(delta) ? delta : 0, 0), MAX_FRAME)
    const config = this.current

    if (this.emitting && config.rate > 0 && this.width > 0) {
      this.debt += config.rate * dt
      while (this.debt >= 1) {
        this.debt -= 1
        if (!this.spawn(config)) {
          // Full: what is owed is dropped rather than saved up for a flood later.
          this.debt = Math.min(this.debt, 1)
          break
        }
      }
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index]!
      const { drag, gravity } = particle.config
      particle.vy += gravity * particle.near * dt
      if (drag > 0) {
        const damping = Math.exp(-drag * dt)
        particle.vx *= damping
        particle.vy *= damping
      }
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.rotation += particle.spin * dt
      particle.age += dt

      const expired = particle.age >= particle.life
      if (expired || this.gone(particle)) {
        this.remove(index)
        if (expired && particle.config.explode) this.explode(particle)
      }
    }

    return this.particles.length > 0 || (this.emitting && config.rate > 0)
  }

  /**
   * Hands every particle to `visit` as it should be drawn now. The frame is
   * one object, reused: read it inside `visit`, do not keep it.
   */
  public each(visit: (frame: ParticleFrame) => void): void {
    const view = this.view
    for (const particle of this.particles) {
      const { config } = particle
      const progress = clamp(particle.age / particle.life, 0, 1)
      let size = particle.size * lerp(1, config.sizeAtDeath, progress)
      let opacity = config.opacity * lerp(0.45, 1, particle.near)
      opacity *= clamp(particle.age / Math.min(FADE_IN, particle.life * 0.15), 0, 1)
      if (config.fadeOut > 0) opacity *= clamp((1 - progress) / config.fadeOut, 0, 1)
      if (config.twinkle > 0) {
        opacity *= 1 - config.twinkle * (0.5 + 0.5 * Math.sin(2 * Math.PI * TWINKLE_RATE * particle.age + particle.phase))
      }
      // A sparkle swells in and shrinks away; a bubble swells as it bursts.
      if (config.shape === 'sparkle') size *= Math.sin(Math.PI * progress) ** 0.7
      if (config.shape === 'bubble' && config.fadeOut > 0) {
        size *= 1 + 0.45 * clamp(1 - (1 - progress) / config.fadeOut, 0, 1)
      }

      view.color = particle.color
      view.flip = config.shape === 'confetti'
        ? Math.cos(2 * Math.PI * FLIP_RATE * particle.swayRate * particle.age + particle.phase)
        : 1
      view.opacity = opacity
      view.rotation = particle.rotation
      view.shape = config.shape
      view.size = size
      view.tailX = -particle.vx * config.stretch
      view.tailY = -particle.vy * config.stretch
      view.x = particle.x + this.swayAt(particle)
      view.y = particle.y
      visit(view)
    }
  }

  private swayAt(particle: Particle): number {
    const { sway, swayRate } = particle.config
    if (sway === 0) return 0
    return sway * particle.swaySize * particle.near
      * Math.sin(2 * Math.PI * swayRate * particle.swayRate * particle.age + particle.phase)
  }

  private spawn(
    config: ParticleConfig,
    from?: { color: string; x: number; y: number },
  ): boolean {
    if (this.particles.length >= MAX_PARTICLES) return false
    const born = this.alive.get(config) ?? 0
    if (born >= config.limit) return false

    const random = this.random
    const near = 1 - clamp(config.depth, 0, 1) * random() * 0.6
    const speed = config.speed * vary(random, config.speedVariation) * near
    const heading = (config.angle + (random() - 0.5) * config.spread) * DEGREES
    const vx = Math.cos(heading) * speed
    const vy = Math.sin(heading) * speed
    const size = config.size * vary(random, config.sizeVariation) * near
    const particle: Particle = {
      age: 0,
      color: from?.color ?? config.colors[Math.floor(random() * config.colors.length)] ?? '#ffffff',
      config,
      life: config.lifetime * vary(random, config.lifetimeVariation),
      near,
      phase: random() * Math.PI * 2,
      rotation: random() * 360,
      size,
      spin: (random() * 2 - 1) * config.spin,
      swayRate: lerp(0.7, 1.3, random()),
      swaySize: lerp(0.5, 1.5, random()),
      vx,
      vy,
      x: from?.x ?? 0,
      y: from?.y ?? 0,
    }
    if (!from) this.place(particle, random)

    this.particles.push(particle)
    this.alive.set(config, born + 1)
    return true
  }

  /** Puts a new particle where its emitter says. */
  private place(particle: Particle, random: () => number): void {
    const { emitter, stretch } = particle.config
    const { bleed, height, width } = this
    if (typeof emitter === 'object') {
      particle.x = (emitter.x + random() * emitter.width) * width
      particle.y = (emitter.y + random() * emitter.height) * height
      return
    }
    if (emitter === 'center') {
      particle.x = width / 2
      particle.y = height / 2
      return
    }
    const left = -bleed.left
    const right = width + bleed.right
    const top = -bleed.top
    const bottom = height + bleed.bottom
    if (emitter === 'area') {
      particle.x = lerp(left, right, random())
      particle.y = lerp(top, bottom, random())
      return
    }

    // Born just past the edge, so it slides in rather than appearing. A line
    // of slanting rain is widened upwind by as far as a drop drifts crossing
    // the field, or the far corner would stay dry.
    const reach = particle.size / 2 + Math.hypot(particle.vx, particle.vy) * stretch + particle.config.sway * 1.5
    const across = bottom - top
    const drift = Math.abs(particle.vy) > 1 ? (particle.vx / Math.abs(particle.vy)) * across : 0
    particle.x = lerp(Math.min(left, left - drift), Math.max(right, right - drift), random())
    particle.y = emitter === 'top' ? top - reach : bottom + reach
  }

  /** Whether a particle is past the room around the field and will not come back. */
  private gone(particle: Particle): boolean {
    const { bleed, height, width } = this
    const { gravity, stretch, sway } = particle.config
    const margin = particle.size + Math.hypot(particle.vx, particle.vy) * stretch + sway * 1.5 + 2
    if (particle.x < -bleed.left - margin && particle.vx <= 0) return true
    if (particle.x > width + bleed.right + margin && particle.vx >= 0) return true
    // Up and down, gravity can still turn it round.
    if (particle.y < -bleed.top - margin && particle.vy <= 0 && gravity <= 0) return true
    if (particle.y > height + bleed.bottom + margin && particle.vy >= 0 && gravity >= 0) return true
    return false
  }

  /** Bursts a particle whose life has run out into its explosion's, where it was and in its colour. */
  private explode(particle: Particle): void {
    const { colors, count } = particle.config.explode!
    const sparks = this.sparksOf(particle.config)
    for (let index = 0; index < count; index += 1) {
      const color = colors?.length ? colors[Math.floor(this.random() * colors.length)]! : particle.color
      if (!this.spawn(sparks, { color, x: particle.x, y: particle.y })) break
    }
  }

  private readonly explosions = new WeakMap<ParticleConfig, ParticleConfig>()

  /** The config a parent's explosions are born with: one object per parent, so their sparks share the system's limit only. */
  private sparksOf(parent: ParticleConfig): ParticleConfig {
    const known = this.explosions.get(parent)
    if (known) return known
    const { count: _count, ...settings } = parent.explode!
    const sparks: ParticleConfig = {
      ...PARTICLE_DEFAULTS,
      ...settings,
      colors: settings.colors ?? parent.colors,
      emitter: 'center',
      limit: MAX_PARTICLES,
    }
    this.explosions.set(parent, sparks)
    return sparks
  }

  private remove(index: number): void {
    const particle = this.particles[index]!
    const last = this.particles.pop()!
    if (last !== particle) this.particles[index] = last
    const born = (this.alive.get(particle.config) ?? 1) - 1
    if (born > 0) this.alive.set(particle.config, born)
    else this.alive.delete(particle.config)
  }
}
