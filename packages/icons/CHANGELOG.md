# @liquefy-ui/icons

## 1.2.0

### Minor Changes

- 2f7da29: Add `FlaskIcon` (a conical laboratory flask with a liquid line), for marking experimental or lab features.
- 3ea5805: Add icon effects, SF Symbols' symbol effects for these icons, from a new entry
  point: `import { IconEffect, MagicReplace } from '@liquefy-ui/icons/effects'`.
  
  - **`IconEffect`** plays `bounce` (`up` or `down`), `wiggle` (left, right, up,
    down, clockwise, counterclockwise or any heading, rocking by `angle`), `breathe`,
    `rotate` and `draw` on the icon it wraps. `trigger` plays it once each time it
    changes, and `active` plays it over and over while true — SF Symbols' `value:`
    and `isActive:`. Every effect is a spring sampled into Web Animations keyframes:
    it overshoots and settles, and a loop that is switched off comes to rest rather
    than stopping dead.
  - **Draw On and Draw Off**: `effect="draw"` with `drawn` traces the strokes on in
    the order the icon was written, one after another (or `strokes="together"`), and
    takes them off again in reverse. `drawn={false}` on mount renders the icon
    hidden, on the server too.
  - **`MagicReplace`** changes one icon into another when its child changes, keeping
    the strokes the two share, bending strokes written alike into each other and
    drawing the rest off and on. Icons with nothing in common shrink and grow
    (`fallback="scale"`, the default) or redraw (`fallback="draw"`); `transition`
    forces either.
  - Inside a `LiquefyProvider` the effects follow its `motion`, read from the
    `data-liquid-motion` attribute it renders; `motion={false}` on an effect stills
    it anywhere. `prefers-reduced-motion` is never read.
  
  The icons themselves are unchanged and stay server-safe; only the effects bundle
  carries `'use client'`. The package still depends on nothing but React.
  
  Also adds `LockOpenIcon`, a lock with its shackle lifted, drawn to morph from
  `LockIcon`.

## 1.1.0

### Minor Changes

- f3272e2: Add `FileTextIcon` (a page with a folded corner and two text lines), `GridIcon` (four rounded squares in a 2×2 grid) and `TrendingUpIcon` (a rising line with an arrowhead).

## 1.0.0

### Minor Changes

- bd54ccf: Add ArchiveIcon, BriefcaseIcon, ColumnsIcon, InboxIcon, ListIcon and PinIcon.
  
  These cover task-board vocabulary that had no icon yet: archiving a record,
  a work/personal split, a column layout, an unsorted inbox, a plain list and
  pinning an item. All follow the existing 24×24 / stroke-only shape rules.

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
