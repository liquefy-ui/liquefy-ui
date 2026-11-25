---
"@liquefy-ui/react": minor
---

Retune the default material to the playground's standard preset

`<LiquefyProvider>` with no props now gives `tint` `#ffffff`, `intensity` `1`,
`refraction` `0` and `wobbliness` `1`, with all four ornaments on — `glow`,
`ripple`, `shimmer` and `sparkle`. `veil` and `frost` stay at `0`, and `lens`,
`webgl`, `motion` and `transparency` stay on. Every app that relies on the
defaults looks different after upgrading; pass the old values to keep the old
look:

```tsx
<LiquefyProvider intensity={1.2} refraction={1} ripple={false} shimmer={false} sparkle={false} tint="#8f8f8f" wobbliness={0.1}>
```

The light theme's tokens move to a neutral grey: `--lq-solid-fill` `#e9ebf0`,
`--lq-foreground` `#1d1d1f`, black hairlines at 8–10% for controls, fields,
switches and quiet and regular surfaces, white at 72% for the clear line, and
a brighter, whiter glass. The dark theme's `--lq-muted` rises to 74% so muted
text reads more easily. Every other dark token is unchanged.

A card and a list in the light theme no longer blur and saturate what is behind
them on their own. They used to add 7px of blur and a 1.7 saturation boost that
no provider setting could take away, so at `veil={0}` and `frost={0}` the page
still went soft behind them in light but not in dark. They now take the same
optics as the clear surface in dark — the provider's frost and nothing more —
with the clear hairline and a brighter rim. Tables and accordions keep their
light-mode recipe.
