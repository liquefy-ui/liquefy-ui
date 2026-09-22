---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

Drop `dispersion` and `elasticity`, and make the provider need nothing

Removed: `dispersion` and `elasticity` are gone from `LiquefyProvider` and from
`LiquidGlass`. Neither earned its place in the material — the channel split was
a rim effect nobody was turning up, and the lean toward an approaching pointer
read as drift rather than as life. `@liquefy-ui/core` keeps both as low-level
options; `attachLiquidLens` simply no longer splits the channels unless asked.

`<LiquefyProvider>` now needs nothing but `children`. Its defaults are the
material the library ships with — `veil` 0, `intensity` 1.2, `refraction` 1,
`frost` 0, `wobbliness` 0.1, glow and shimmer on, ripple and sparkle off — so
every prop on it is a departure from that rather than something you have to
supply to get the look. The READMEs and the provider page show it bare.
