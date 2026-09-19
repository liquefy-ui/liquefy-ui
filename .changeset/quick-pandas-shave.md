---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

New defaults, and components that stop overruling them

The material arrives lit and refracting rather than waiting to be switched on:

| | was | now |
|---|---|---|
| `tint` | `#8eb9ff` | `#8f8f8f` |
| `intensity` | `0.72` | `1.2` |
| `wobbliness` | `1` | `0.1` |
| `dispersion` | `0.6` | `0.1` |
| `elasticity` | — | `0.02` |
| `frost` | — | `6` |
| `refraction` | — | `0.7` |
| `ripple` / `sparkle` | on | off |

`refraction` is new at the provider: how much of the bend the material can take
without folding to spend, 0 to 1. It reaches every component, not just
`LiquidGlass`.

The larger change is that components stop overruling the provider. `GlassCard`,
`LiquidAccordion`, `LiquidList`, `LiquidTable`, `LiquidButton`,
`LiquidIconButton`, `LiquidChip`, `LiquidPagination` and every control from
`LiquidCheckbox` to `LiquidTextarea` used to pin `lens` — and some of them
`webgl` — to `false` whatever the provider said. Several of those pins date
from when the bezel could fold the backdrop back on itself at small sizes,
which it no longer can. `LiquidGlass` now falls back to the provider for its
four ornaments too, instead of starting them off.

Before upgrading: the lens is an SVG filter inside `backdrop-filter`, among the
most expensive things a browser composites, and it is now on everywhere. One
page of this library's own documentation creates seventeen of them. A screen
dense with controls costs more than it did, and `lens={false}` on the provider
takes it straight back. `LiquidChip` and `LiquidPagination` still render no
shader canvas of their own by design — they travel in groups, and a WebGL
context each is not a trade worth making.
