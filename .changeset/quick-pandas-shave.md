---
'@liquefy-ui/core': minor
'@liquefy-ui/react': minor
---

Turn the optics up, and let every component take them from the provider

The defaults move again: `intensity` `1.2`, `dispersion` `0.55`, and both `lens`
and `webgl` on. The material arrives lit and refracting rather than waiting to
be switched on.

The larger change is that components stop overruling it. `GlassCard`,
`LiquidAccordion`, `LiquidList`, `LiquidTable`, `LiquidButton`,
`LiquidIconButton`, `LiquidChip`, `LiquidPagination`, and every control from
`LiquidCheckbox` to `LiquidTextarea` used to pin `lens` — and some of them
`webgl` — to `false` regardless of what the provider said. Several of those
pins date from when the bezel could fold the backdrop back on itself at small
sizes, which it no longer can. They now read the provider like everything else,
so `<LiquefyProvider lens={false}>` means what it says and so does the default.

Two things worth knowing before upgrading. The lens is an SVG filter inside
`backdrop-filter`, which is among the most expensive things a browser
composites, so a page dense with lit controls now costs more than it did —
`lens={false}` on the provider, or per component, takes it straight back.
`LiquidChip` and `LiquidPagination` still render no shader canvas of their own,
by design: they travel in groups, and a WebGL context each is not a trade worth
making.
