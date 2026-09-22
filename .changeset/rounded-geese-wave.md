---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

Rebuild the lens optics so the rim can no longer fold

The bezel cross-section is now a power curve instead of a spherical cap. A cap
is the honest shape of a lens but its slope goes vertical where it meets the
rim, so displacement jumped from nothing to its maximum within a pixel and the
backdrop folded back on itself at rounded ends — the mirrored sliver that made
edge refraction unusable on control-sized elements. Displacement is now solved
from the slope of that curve for a chosen compression, which makes folding
structurally impossible rather than something each new value had to be checked
against. `strength` reads 0 to 1 as a result: the fraction of the bend the
material can take, not a multiplier that could exceed it.

New: `LiquidGlass`, the material with its optics as props, and `glow`, `ripple`,
`shimmer` and `sparkle` as separate switches, so the optics can be had without
the ornaments. The lit rim is now two blended rings whose bright quarter follows
the pointer.
