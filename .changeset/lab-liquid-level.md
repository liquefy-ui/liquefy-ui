---
"@liquefy-ui/lab": minor
---

`LiquidLevel`: a glass vessel with liquid inside whose level follows a value. The
level springs past its mark and settles back, the surface sloshes when the value
jumps and leans toward a pointer over the vessel (`tilt`), and the reading turns
to the opposite ink where the liquid covers it.

The vessel is a `LiquidSurface` — a `circle`, an upright `capsule` or a `rounded`
rectangle — so the backdrop still refracts through the glass; the liquid is a
translucent wash of `tint` (the provider's by default) drawn under the lit rim.
It mirrors `LiquidGauge`: `value`, `max`, `size`, `tint` and `children`, and it is a
`meter` with the reading as its value text. With `motion={false}` or
`prefers-reduced-motion`, the level moves straight to its mark with a still surface.
The animation stops once the surface is still and while the vessel is off screen.

`LiquidLevelSimulation`, the level spring and surface heightfield behind it, is
exported with no DOM attached.
