---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

Compose the lens with the frost, and make the refracting material the default

Fixed: attaching an edge lens wrote `backdrop-filter` straight onto the element,
which is one declaration — so the blur, the saturation and the brightness the
material had already asked for were thrown away the moment the lens arrived.
Turning the frost up did nothing to any surface with refraction on it. The lens
now publishes `--lq-lens`, and every backdrop-filter in the stylesheet ends with
`var(--lq-lens, )`, so the refraction joins the rest of the material instead of
replacing it.

`refraction` is now a provider prop, and the defaults have moved to the material
the playground has been showing: `dispersion` 0.55 → 0.1, `elasticity` 0 → 0.02,
`frost` 0 → 6, `refraction` 0.7, with `ripple` and `sparkle` off and `glow` and
`shimmer` left on. Every component resolves refraction from the provider, so the
optics reach cards, buttons, fields and the rest rather than only the surfaces
that name them.

`LiquidGlass` ornaments now fall back to the provider instead of starting out
switched off, which makes a bare `<LiquidGlass>` the house material rather than
a stripped-down variant of it. Naming `glow`, `ripple`, `shimmer` or `sparkle`
is how an instance departs from that — including `glow={false}` to opt out.
