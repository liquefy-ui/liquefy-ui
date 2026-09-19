---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

Quieten the default material

The provider's defaults change, so every surface looks different without any
code changing: `tint` `#8f8f8f`, `intensity` `0.42`, `wobbliness` `0.1`,
`dispersion` `0.8`, `elasticity` `0`, and both `lens` and `webgl` off. The old
look is one prop away — `<LiquefyProvider intensity={0.72} wobbliness={1} lens
webgl>` — and the playground writes the snippet for whatever you pick.

Two of those are worth reading twice. `webgl` off means no canvas is created at
all, and since `glow`, `ripple`, `shimmer` and `sparkle` are drawn by that pass,
all four are inert until it is switched back on. `lens` off drops the
displacement at the bezel, which is the most expensive thing the material does;
the frost, the rim and the springs are all still there.

The core fallbacks move with the provider, so `attachLiquidMotion` and
`attachLiquidLens` called directly agree with what the React layer ships.
