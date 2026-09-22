---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

Retune the default material

The provider's defaults change, so every surface looks different without any
code changing: `tint` becomes `#8f8f8f`, `intensity` becomes `1.2`, and
`wobbliness` becomes `0.1`. The playground writes a snippet for whatever values
you pick.

`lens` and `webgl` are on by default. Turning `webgl` off creates no presentation
canvas, and since `glow`, `ripple`, `shimmer` and `sparkle` are drawn by that
pass, all four are inert while it is off. Turning `lens` off drops the
displacement at the bezel while the frost, lit rim and springs stay in place.

The React material now arrives lit and refracting without any provider props.
