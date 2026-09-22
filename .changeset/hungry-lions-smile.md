---
'@liquefy-ui/react': minor
---

Add `veil`, a dial that takes the material down to nothing but an edge

`veil` is how much of the material's own dressing sits between the eye and what
is behind it: the fill, the inner sheen, the cast shadow and the lift it gives
the backdrop's colour. It runs from 1, which is the material exactly as it was,
down to 0. It is a provider prop and a prop on `LiquidSurface` and
`LiquidGlass`, so a single panel can be thinner than everything around it.

It deliberately leaves the rim and the refraction alone. Those are what make a
panel read as glass rather than as a hole cut in the page, so `veil={0}` with
`frost={0}` is a pane with nothing in it but a lit edge and the bend behind it
— which was not reachable before, because the cast shadow and the inner sheen
had no dial of their own and sat over the backdrop whatever else was turned
down.

The scaling is derived per surface rather than on the theme tokens, so a veil
set on one component still resolves there instead of being fixed at provider
scope. It covers the surface material — `LiquidSurface`, `LiquidGlass` and
`GlassCard`; the smaller controls keep the dressing their own shapes need.
