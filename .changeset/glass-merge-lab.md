---
"@liquefy-ui/lab": minor
---

`GlassMerge`: a surface that draws glass shapes melting into one another, with
your content laid over it. Pass `shapes` for a layout that holds still, or call
`setShapes` on its ref from motion code once a frame without re-rendering; the
ref's `mode` says whether the refracting lens or the clipped outline is drawn.
The provider's `lens`, `transparency` and `refraction` apply. The surface has no
fill, border or shadow of its own, and must not sit under anything with
`opacity`, `filter`, `clip-path`, `mask` or `will-change: opacity`.
