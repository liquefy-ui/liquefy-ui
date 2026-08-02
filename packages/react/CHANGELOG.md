# @liquefy-ui/react

## 0.2.0

### Minor Changes

- 20db087: `LiquidDrawer` dismisses itself when the panel is flicked towards the edge it
  slid in from. The gesture stands down for a mouse, for content that can still
  scroll the way the flick would scroll it, and for a popup the panel opened —
  a listbox is portaled out of the drawer but still bubbles its events back
  through it. Set `swipeToClose={false}` to turn it off.
- 4d89e14: `LiquidSelect` takes an `onOpenChange` callback, so whatever holds the select
  can tell when its popup is on screen.

## 0.1.6

### Patch Changes

- e61b652: Accept a node as the `title` of `GlassCard`, `LiquidAlert` and
  `LiquidAccordionItem`, which all three always rendered and the documented props
  tables always promised, but the types never allowed. `HTMLAttributes` declares
  `title` as the tooltip string, and intersecting that with `ReactNode` leaves
  `string` — so `title={<span …>}` failed to typecheck even though it lands in an
  `<h3>`, a `<strong>` or an accordion header. `LiquidDialog` and `LiquidDrawer`
  already omit the attribute for this reason; the other three now do too.
- 21df5ce: Raise the popover layer above the dialog and drawer, so a `LiquidSelect`,
  `LiquidMenu` or `LiquidTooltip` opened from inside one is visible. Every overlay
  portals into the provider's node as a sibling of the others, so the z-index is
  the only thing ordering them — and a select popup at 60 landed under a drawer
  panel at 80. The popup was fully rendered and interactive, just painted
  underneath, which reads as a pulldown that does nothing when tapped. Popovers now
  sit at 85 and tooltips at 88, still below the toast viewport at 90, and the whole
  ladder is written down next to the popover base so the next edit keeps it.
- 7ec315a: Let a `LiquidSelect` trigger shrink below 200px when its container is narrower
  than that. The flat `min-width: 200px` could not be honoured in a narrow column —
  three filter selects side by side on a phone — and the trigger overflowed instead,
  which reads as neighbouring selects overlapping rather than as a width problem.
  Capping the floor with `min(200px, 100%)` leaves every container with a definite
  width of 200px or more measuring exactly as before. A container sized by its own
  content — `width: fit-content`, a table cell — has no width for the percentage to
  resolve against, so a select there now measures its content instead of 200px.
- f1d911a: Render the toast viewport into the provider's portal node instead of the document
  body, so a toast keeps its fill and shadow. The theme tokens are declared on
  `.lq-provider`, and a subtree portaled outside it reads none of them:
  `--lq-solid-fill` resolves to nothing, the `color-mix()` built on it is invalid,
  and the material disappears. Dialog, Drawer, Select and Menu already portal into
  that node for this exact reason. The body stays the fallback for a
  `LiquidToastProvider` mounted without a `LiquefyProvider` above it — which also
  means the fix only reaches a toast provider nested inside one, so that is now what
  the documented usage shows. A toast's `z-index` is scoped to whatever stacking
  context holds the provider, the same as Dialog's and Drawer's already are.

## 0.1.5

### Patch Changes

- 6475e4a: Name the agent-facing tooling in the npm keywords: `mcp`, `ai`, `agents` and
  `llms-txt`, alongside `shadcn-registry` and `tailwindcss`. The package ships an
  MCP server, a shadcn registry and a Tailwind v4 bridge, and npm search could not
  find any of them by name.
- 621f110: Let the light theme's dock honour `--lq-dock-active`. The active and hovered item
  hard-coded the colour instead of reading the token, so overriding it moved the
  dock under `theme="dark"` and `theme="system"` but not under `theme="light"` —
  the one asymmetry between the three themes. The default colour is unchanged.

## 0.1.4

### Patch Changes

- 00c1c93: Scroll a bottom `LiquidDrawer` whose content is taller than the panel. The panel
  is sized by `max-height`, so the surface's `height: 100%` resolved against an
  `auto` parent and grew to its content instead: nothing scrolled, and the end of a
  tall panel — a form's submit button, say — sat past the bottom of the screen with
  no way to reach it.

## 0.1.3

### Patch Changes

- 0781867: Broaden the npm keywords so search finds these packages by what they are
- Updated dependencies [0781867]
  - @liquefy-ui/core@0.1.3

## 0.1.2

### Patch Changes

- Republish `@liquefy-ui/core` with the provenance attestation 0.1.1 is missing.

  The other packages picked up their trusted-publisher configuration on the 0.1.1
  release; core did not, so its OIDC exchange failed and the publish fell back to the
  token — which produces an unsigned tarball.

  `icons` and `react` ride along because the three are a linked group and
  `test/metadata.test.mjs` holds them to one version. None of the packaged code
  changed.

- Updated dependencies
  - @liquefy-ui/core@0.1.2

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

- Updated dependencies
  - @liquefy-ui/core@0.1.1
