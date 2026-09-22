# @liquefy-ui/core

## 0.2.0

### Minor Changes

- b798158: Compose the lens with the frost, and make the refracting material the default
  
  Fixed: attaching an edge lens wrote `backdrop-filter` straight onto the element,
  which is one declaration — so the blur, the saturation and the brightness the
  material had already asked for were thrown away the moment the lens arrived.
  Turning the frost up did nothing to any surface with refraction on it. The lens
  now publishes `--lq-lens`, and every backdrop-filter in the stylesheet ends with
  `var(--lq-lens, )`, so the refraction joins the rest of the material instead of
  replacing it.
  
  `refraction` is now a provider prop. It defaults to `1`, while provider-level
  `frost` defaults to `0`; every component resolves both from the provider, so the
  optics reach cards, buttons, fields and the rest rather than only the surfaces
  that name them.
  
  `LiquidGlass` ornaments now fall back to the provider instead of starting out
  switched off, which makes a bare `<LiquidGlass>` the house material rather than
  a stripped-down variant of it. Naming `glow`, `ripple`, `shimmer` or `sparkle`
  is how an instance departs from that — including `glow={false}` to opt out.
- b798158: Retune the default material
  
  The provider's defaults change, so every surface looks different without any
  code changing: `tint` becomes `#8f8f8f`, `intensity` becomes `1.2`, and
  `wobbliness` becomes `0.1`. The playground writes a snippet for whatever values
  you pick.
  
  `lens` and `webgl` are on by default. Turning `webgl` off creates no presentation
  canvas, and since `glow`, `ripple`, `shimmer` and `sparkle` are drawn by that
  pass, all four are inert while it is off. Turning `lens` off drops the
  displacement at the bezel while the frost, lit rim and springs stay in place.
  
  The React material now arrives lit and refracting without any provider props.
- b798158: Turn the optics up, and let every component take them from the provider
  
  The defaults move to `intensity` `1.2`, with both `lens` and `webgl` on. The
  material arrives lit and refracting rather than waiting to be switched on.
  
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
  by design: they travel in groups, and a presentation canvas each is not a trade
  worth making.
- b798158: Drop `dispersion` and `elasticity`, and make the provider need nothing
  
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
- b798158: Rebuild the lens optics so the rim can no longer fold
  
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

## 0.1.3

### Patch Changes

- 0781867: Broaden the npm keywords so search finds these packages by what they are

## 0.1.2

### Patch Changes

- Republish `@liquefy-ui/core` with the provenance attestation 0.1.1 is missing.

  The other packages picked up their trusted-publisher configuration on the 0.1.1
  release; core did not, so its OIDC exchange failed and the publish fell back to the
  token — which produces an unsigned tarball.

  `icons` and `react` ride along because the three are a linked group and
  `test/metadata.test.mjs` holds them to one version. None of the packaged code
  changed.

## 0.1.1

### Patch Changes

- Publish with npm provenance.

  0.1.0 shipped unsigned. `publishConfig.provenance` is read by npm, but this is a
  pnpm workspace, so `changeset publish` shells out to `pnpm publish` — which has no
  provenance support at all and silently ignored the field.

  The registry now trusts this repository's `release.yml` directly through OIDC, so
  no token is exchanged and npm attaches the attestation itself. Nothing about the
  packaged code changed; this release exists so the published artifact can be traced
  back to the commit that built it.
