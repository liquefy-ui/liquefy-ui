---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

The rim is now a neutral line by default. `shimmer` defaults to `false` and owns all of the colour the material adds on its own — the iridescent band, the red/green/blue split across the rim and the cool cast on the highlight — so buttons and fields no longer pick up a blue or purple edge on plain pages. Pass `shimmer` to `LiquefyProvider` (or to a single `LiquidGlass`) to bring the coloured rim back.
