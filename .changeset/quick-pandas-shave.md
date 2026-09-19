---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

New defaults, and components that stop overruling them

| | was | now |
|---|---|---|
| `tint` | `#8eb9ff` | `#8f8f8f` |
| `intensity` | `0.72` | `1.2` |
| `wobbliness` | `1` | `0.1` |
| `dispersion` | `0.6` | `0.1` |
| `elasticity` | — | `0.02` |
| `frost` | — | `6` |
| `refraction` | — | `0.7` |
| `lens` / `webgl` | on | off |
| `ripple` / `sparkle` | on | off |

`refraction` is new at the provider: how much of the bend the material can take
without folding to spend, 0 to 1. It reaches every component, not just
`LiquidGlass`.

What arrives out of the box is CSS glass — the frost, the lit rim and the
springs — with the two expensive passes waiting to be asked for. `webgl` draws
the four ornaments, so `glow`, `ripple`, `shimmer` and `sparkle` do nothing
until it is on; `lens` is what `refraction` and `dispersion` bend, so those do
nothing until it is on either. Both are one prop:
`<LiquefyProvider lens webgl>`.

The larger change is that components stop overruling the provider. `GlassCard`,
`LiquidAccordion`, `LiquidList`, `LiquidTable`, `LiquidButton`,
`LiquidIconButton`, `LiquidChip`, `LiquidPagination` and every control from
`LiquidCheckbox` to `LiquidTextarea` used to pin `lens` — and some of them
`webgl` — to `false` whatever the provider said. Several of those pins date
from when the bezel could fold the backdrop back on itself at small sizes,
which it no longer can. `LiquidGlass` now falls back to the provider for its
four ornaments too, instead of starting them off. Turning either pass on is now
a single decision for the whole tree rather than a prop per component.

Worth knowing before turning the lens on across a dense screen: it is an SVG
filter inside `backdrop-filter`, among the most expensive things a browser
composites, and one page of this library's own documentation asks for
seventeen of them. `LiquidChip` and `LiquidPagination` still render no shader
canvas of their own by design — they travel in groups, and a WebGL context each
is not a trade worth making.
