import { clamp, lerp } from '@liquefy-ui/core'
import { PARTICLE_DEFAULTS, type ParticleBleed, type ParticleConfig } from './particle-system'

/**
 * The motions behind `ChangeEffect`, as plain functions of time with no DOM:
 * where an element is a given number of milliseconds into a jump or a shake,
 * how far across it a shine has got, how bright a glow is, and the particle
 * config a spray bursts with.
 */

export type ChangeEffectName = 'glow' | 'jump' | 'shake' | 'shine' | 'spray'

/** How an element sits at one moment: pixels of travel, degrees, and scale about the middle of its bottom edge. */
export type EffectPose = { rotate: number; scaleX: number; scaleY: number; x: number; y: number }

export const STILL: EffectPose = { rotate: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }

/** A spring the way SwiftUI describes one: seconds per swing, and how much of each swing it loses. */
type Spring = { damping: number; response: number }

/** Where a spring let go at `from` with `velocity` (units a second) is `seconds` later, heading for 0. Underdamped only. */
const springAt = ({ damping, response }: Spring, from: number, velocity: number, seconds: number) => {
  const natural = (2 * Math.PI) / response
  const decay = damping * natural
  const ringing = natural * Math.sqrt(1 - damping * damping)
  const b = (velocity + decay * from) / ringing
  const envelope = Math.exp(-decay * seconds)
  const cos = Math.cos(ringing * seconds)
  const sin = Math.sin(ringing * seconds)
  return {
    value: envelope * (from * cos + b * sin),
    velocity: envelope * ((b * ringing - decay * from) * cos - (from * ringing + decay * b) * sin),
  }
}

/** Milliseconds until a spring's swings stay inside `tolerance`: when the rest of it would not move a pixel. */
const settleTime = (spring: Spring, from: number, velocity: number, tolerance: number): number => {
  const step = 1 / 120
  let quiet = 0
  for (let seconds = 0; seconds < 3; seconds += step) {
    const { value, velocity: speed } = springAt(spring, from, velocity, seconds)
    if (Math.abs(value) < tolerance && Math.abs(speed) < tolerance * 10) {
      quiet += step
      // A ringing spring passes through 0 at speed, so it has to stay quiet a while.
      if (quiet >= 0.1) return (seconds - quiet + step) * 1000
    } else {
      quiet = 0
    }
  }
  return 3000
}

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** Squashed by `squash` (negative stretches it), standing `y` pixels off the floor. Wider as it gets shorter. */
const squashed = (squash: number, y: number): EffectPose => ({ rotate: 0, scaleX: 1 + squash * 0.6, scaleY: 1 - squash, x: 0, y })

const CROUCH_MS = 90
/** How far it crouches before it leaps, as a share of its height. */
const CROUCH = 0.14
const FLIGHT_MS = 340
/** Letting go of the crouch: it overshoots into a stretch as it leaves the floor, and rings back. */
const TAKEOFF: Spring = { damping: 0.32, response: 0.24 }
/** The landing: a squash it takes from the floor and wobbles out of. */
const LANDING: Spring = { damping: 0.24, response: 0.3 }
/** How hard the floor squashes it, in squash a second added at touchdown. */
const LANDING_KICK = 3.2

const touchdown = springAt(TAKEOFF, CROUCH, 0, FLIGHT_MS / 1000)
const LANDING_VELOCITY = touchdown.velocity + LANDING_KICK

export const JUMP_MS = CROUCH_MS + FLIGHT_MS + settleTime(LANDING, touchdown.value, LANDING_VELOCITY, 0.002)

/** How high an element jumps, in pixels: half its height, kept between 10 and 28. */
export const jumpHeight = (elementHeight: number): number => clamp(elementHeight * 0.5, 10, 28)

/**
 * A jump `height` pixels high, `ms` in: it crouches, springs off the floor
 * stretching as it goes, flies a parabola, and lands with a squash that it
 * wobbles out of. The squash and stretch are one spring all the way through,
 * kicked again by the floor, so nothing about its shape jumps between phases.
 */
export const jumpPose = (ms: number, height: number): EffectPose => {
  if (ms <= 0 || ms >= JUMP_MS) return STILL
  if (ms < CROUCH_MS) return squashed(CROUCH * easeOut(ms / CROUCH_MS), 0)
  const flying = ms - CROUCH_MS
  if (flying < FLIGHT_MS) {
    const across = flying / FLIGHT_MS
    return squashed(springAt(TAKEOFF, CROUCH, 0, flying / 1000).value, -height * 4 * across * (1 - across))
  }
  return squashed(springAt(LANDING, touchdown.value, LANDING_VELOCITY, (flying - FLIGHT_MS) / 1000).value, 0)
}

/** A quick, tight spring: five or six swings in under a second. */
const SHAKE: Spring = { damping: 0.13, response: 0.11 }
/** Kicked so its first swing peaks at exactly 1. */
const SHAKE_PEAK_AT = (() => {
  const natural = (2 * Math.PI) / SHAKE.response
  const ringing = natural * Math.sqrt(1 - SHAKE.damping * SHAKE.damping)
  return Math.atan2(ringing, SHAKE.damping * natural) / ringing
})()
const SHAKE_VELOCITY = 1 / springAt(SHAKE, 0, 1, SHAKE_PEAK_AT).value

export const SHAKE_MS = settleTime(SHAKE, 0, SHAKE_VELOCITY, 0.01)

/** How far an element shakes, in pixels: a sixteenth of its width, kept between 6 and 12. */
export const shakeDistance = (elementWidth: number): number => clamp(elementWidth / 16, 6, 12)

/** A shake `distance` pixels either way, `ms` in: off to the left first, back past the start, smaller each time. */
export const shakePose = (ms: number, distance: number): EffectPose => {
  if (ms <= 0 || ms >= SHAKE_MS) return STILL
  return { ...STILL, x: -distance * springAt(SHAKE, 0, SHAKE_VELOCITY, ms / 1000).value }
}

/**
 * Two poses mixed, `share` of the way from `from` to `to`. A jump or a shake
 * that starts again before the last has finished starts from where it was.
 */
export const blendPose = (from: EffectPose, to: EffectPose, share: number): EffectPose => ({
  rotate: lerp(from.rotate, to.rotate, share),
  scaleX: lerp(from.scaleX, to.scaleX, share),
  scaleY: lerp(from.scaleY, to.scaleY, share),
  x: lerp(from.x, to.x, share),
  y: lerp(from.y, to.y, share),
})

/** Milliseconds a jump or a shake started again takes to leave the pose it was caught in. */
export const BLEND_MS = 80

export const SHINE_MS = 720

/**
 * How far a shine has crossed, `ms` in: 0 while it is still beyond the
 * top-left corner, 1 once it is past the bottom-right. Slow at the ends, quick
 * through the middle, so the light seems to catch and run.
 */
export const shineAt = (ms: number): number => (ms <= 0 ? 0 : ms >= SHINE_MS ? 1 : easeInOut(ms / SHINE_MS))

export const GLOW_MS = 1300
const GLOW_RISE_MS = 200
const GLOW_HOLD_MS = 80
/** Swells past its full size as it comes on, and settles back. */
const GLOW_SWELL: Spring = { damping: 0.55, response: 0.5 }

export type GlowFrame = {
  /** 0 to 1: how bright. */
  level: number
  /** 0 to about 1.1: how far out it reaches, as a share of its full reach. */
  spread: number
}

/** A glow `ms` in: it comes up quickly, holds a moment, and fades out slowly. */
export const glowAt = (ms: number): GlowFrame => {
  if (ms <= 0 || ms >= GLOW_MS) return { level: 0, spread: 0 }
  const rise = easeOut(clamp(ms / GLOW_RISE_MS, 0, 1))
  const fade = Math.exp(-Math.max(0, ms - GLOW_RISE_MS - GLOW_HOLD_MS) / 380)
  // Brought to exactly nothing over its last 300 ms rather than left to fade forever.
  const taper = clamp((GLOW_MS - ms) / 300, 0, 1)
  return {
    level: rise * fade * taper,
    spread: 1 + springAt(GLOW_SWELL, -1, 0, ms / 1000).value,
  }
}

/** Droplets in one spray. */
export const SPRAY_COUNT = 20

/**
 * A spray's droplets: glass beads of every size, thrown up out of the middle
 * of the element in a wide fan, falling back under gravity and shrinking as
 * they go. Tinted with the tint they are given, or the provider's.
 */
export const SPRAY: ParticleConfig = {
  ...PARTICLE_DEFAULTS,
  angle: -90,
  colors: ['var(--lq-particle-tint)'],
  drag: 0.6,
  emitter: { height: 0.3, width: 0.36, x: 0.32, y: 0.3 },
  fadeOut: 0.35,
  gravity: 1000,
  lifetime: 0.9,
  lifetimeVariation: 0.25,
  limit: 120,
  rate: 0,
  shape: 'bead',
  size: 13,
  sizeAtDeath: 0.55,
  sizeVariation: 0.6,
  speed: 440,
  speedVariation: 0.35,
  spread: 84,
}

/** Room a spray is drawn in around the element, in pixels: most of it above, where the droplets fly. */
export const SPRAY_BLEED: ParticleBleed = { bottom: 80, left: 120, right: 120, top: 190 }
