---
'@liquefy-ui/icons': minor
---

Add icon effects, SF Symbols' symbol effects for these icons, from a new entry
point: `import { IconEffect, MagicReplace } from '@liquefy-ui/icons/effects'`.

- **`IconEffect`** plays `bounce` (`up` or `down`), `wiggle` (left, right, up,
  down, clockwise, counterclockwise or any heading, rocking by `angle`), `breathe`,
  `rotate` and `draw` on the icon it wraps. `trigger` plays it once each time it
  changes, and `active` plays it over and over while true — SF Symbols' `value:`
  and `isActive:`. Every effect is a spring sampled into Web Animations keyframes:
  it overshoots and settles, and a loop that is switched off comes to rest rather
  than stopping dead.
- **Draw On and Draw Off**: `effect="draw"` with `drawn` traces the strokes on in
  the order the icon was written, one after another (or `strokes="together"`), and
  takes them off again in reverse. `drawn={false}` on mount renders the icon
  hidden, on the server too.
- **`MagicReplace`** changes one icon into another when its child changes, keeping
  the strokes the two share, bending strokes written alike into each other and
  drawing the rest off and on. Icons with nothing in common shrink and grow
  (`fallback="scale"`, the default) or redraw (`fallback="draw"`); `transition`
  forces either.
- Inside a `LiquefyProvider` the effects follow its `motion`, read from the
  `data-liquid-motion` attribute it renders; `motion={false}` on an effect stills
  it anywhere. `prefers-reduced-motion` is never read.

The icons themselves are unchanged and stay server-safe; only the effects bundle
carries `'use client'`. The package still depends on nothing but React.

Also adds `LockOpenIcon`, a lock with its shackle lifted, drawn to morph from
`LockIcon`.
