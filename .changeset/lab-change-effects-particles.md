---
"@liquefy-ui/lab": minor
---

`ChangeEffect` and `ParticleField`: Pow's change effects and Vortex's particles.

- **`ChangeEffect`** wraps something and plays an effect on it once each time
  `trigger` changes, never on mount, the same as `IconEffect`: `spray` throws glass
  droplets of every size up out of it, `jump` hops and lands with a squash it wobbles
  out of, `shine` runs a band of light from the top-left corner to the bottom-right,
  `shake` shakes it from side to side, and `glow` lights it from behind. Effects nest,
  plays overlap, and a ref's `play()` plays one without a change of value. What it
  draws is `aria-hidden`; what it wraps behaves as before.
- **`ParticleField`** draws particles on a 2D canvas, with presets for `rain`, `snow`,
  `confetti`, `fireworks`, `bubbles` and `magic`, or a `config` of your own — rate,
  speed, gravity, spread, colours, size, lifetime and more. Without children it fills
  its positioned parent, so glass laid over it refracts it; with them it draws over or
  behind them, past their edges by `bleed`. A ref's `burst(count)` fires particles at
  once. It stops drawing off screen and in a background tab, and keeps at most
  `MAX_PARTICLES` alive.
- **`ParticleSystem`** is the particles with no DOM attached, seeded so the same seed
  and the same steps draw the same particles; `PARTICLE_PRESETS`, `PARTICLE_DEFAULTS`,
  `particleConfig` and `createRandom` come with it.

With `motion={false}` on the provider no effect plays and no field draws.
