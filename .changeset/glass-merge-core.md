---
"@liquefy-ui/core": minor
---

`attachGlassMerge(element, options)`: several glass shapes drawn on one element
that melt into each other when they come within `spacing` of one another, like
SwiftUI's `GlassEffectContainer(spacing:)`. Shapes are rounded rects given in the
element's own pixels — `x`, `y`, `width`, `height`, `radius`, and an optional
`stretch` along an `angle` — and `setShapes` is cheap enough to call on every
animation frame.

Where SVG filters run inside `backdrop-filter` (Chromium) the whole lens is built
inside one filter: the shapes are merged into one outline, the backdrop is bent
along its rim, and the rim is lit, all from the same mask, with no canvas and no
WebGL. Script per frame is a few attribute writes. Elsewhere — and with
`lens: false`, `transparency: false`, or `respectReducedTransparency` when the
user asks for less transparency — the element is clipped to the merged outline
over the usual frost (or a solid fill), with the rim drawn as SVG from the same
contour. The controller's `mode` says which one you got.

Either way the glass is dressed like `LiquidIconButton`, along the merged outline:
the lit ring of the rim, the inset highlight along the top with its shade along the
bottom, and the cast shadow, which falls outside the glass and never darkens it. The
colours come from the theme's custom properties (`--lq-rim-bright`,
`--lq-glass-bright`, `--lq-glass-shade`, `--lq-shadow-color`), so they follow light
and dark. The shadow reaches 40px below the shapes and 30px to the sides; in the lens
it is drawn inside the element, so leave the element that much room.
