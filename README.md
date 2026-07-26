<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/liquefy-logo-dark.svg">
  <img alt="liquefy-ui" src="brand/liquefy-logo.svg" width="264">
</picture>

A TypeScript UI library that delivers highly transparent Liquid Glass through WebGL optics, physical springs, and accessible React primitives.

> This is an independent open-source project and is not affiliated with Apple Inc. It references public design principles while providing an original implementation for the web.

Documentation, live demos and the shadcn registry are at
**[liquefy-ui.com](https://liquefy-ui.com)**.

## Packages

| Package | Purpose |
| --- | --- |
| `@liquefy-ui/react` | React components, themes, and provider |
| `@liquefy-ui/core` | Dependency-free WebGL, springs, and motion |
| `@liquefy-ui/icons` | Tree-shakeable React SVG icons |
| `@liquefy-ui/mcp` | MCP server that answers component questions from the real API |

## Quick start

```bash
pnpm add @liquefy-ui/react @liquefy-ui/core @liquefy-ui/icons
```

```tsx
import { LiquefyProvider, LiquidButton } from '@liquefy-ui/react'
import { SparklesIcon } from '@liquefy-ui/icons'
import '@liquefy-ui/react/styles.css'

export function App() {
  return (
    <LiquefyProvider theme="system" tint="#8f8f8f">
      <LiquidButton iconBefore={<SparklesIcon />}>
        Create magic
      </LiquidButton>
    </LiquefyProvider>
  )
}
```

## Next.js and React Server Components

Every component needs state, refs or the WebGL lens, so the whole package sits on
the client side of an RSC boundary. The published bundles carry a `'use client'`
directive, so importing them straight into a server component works — no wrapper
file needed. Only event handlers have to move: a function cannot cross from a
server component into a client one, so anything with `onClick` or local state
belongs in its own `'use client'` component.

`apps/next-example` is a working Next.js 16 App Router app whose page is a server
component, and its build runs in CI. If the client boundary ever regresses, that
build fails rather than yours.

## Tailwind CSS v4

Import `tailwind.css` instead of `styles.css`, before Tailwind itself:

```css
@import '@liquefy-ui/react/tailwind.css';
@import 'tailwindcss';
```

That declares the cascade layer order — so `className="rounded-full"` on a
`LiquidButton` actually wins — and bridges the `--lq-*` tokens into Tailwind's
theme as `bg-liquid-accent`, `text-liquid-muted`, `rounded-liquid`,
`shadow-liquid`, `ease-liquid` and friends. The bridge uses `@theme inline`, which
is what keeps those utilities resolving per-theme at use time.

## For coding agents

| What | Where |
| --- | --- |
| MCP server | `claude mcp add liquefy-ui -- npx -y @liquefy-ui/mcp` — eight tools answering from the real exports, no network, no dependencies |
| `llms.txt` | [`/llms.txt`](https://liquefy-ui.com/llms.txt) and [`/llms-full.txt`](https://liquefy-ui.com/llms-full.txt), generated from source |
| One page per component | [`/llms/liquid-button.md`](https://liquefy-ui.com/llms/liquid-button.md), plus `icons.md`, `core.md` and `mcp.md` — plain Markdown, because the docs site is a hash-routed SPA that a fetcher without JavaScript cannot read |
| shadcn registry | `npx shadcn@latest add https://liquefy-ui.com/r/liquid-button.json` |

The MCP tools are `get_conventions`, `list_components`, `get_component`,
`search_components`, `get_component_source`, `get_tokens`, `list_icons` and
`get_core_api`. The catalog behind them is generated from source at build time, and
lists only names the package entry point re-exports — so an agent is never told to
import something that does not resolve.

The registry copies real component source into your project rather than a
re-export, with imports rewritten to `@/components/ui`, `@/lib` and `@/hooks`. The
copied tree keeps `@liquefy-ui/core` and `@base-ui/react` from npm but not
`@liquefy-ui/react`, so a copied `LiquefyProvider` never ends up competing with the
packaged one. Every copied file is written with its own `'use client'` directive, so an
RSC app needs no follow-up edit.

## Documentation

Run `pnpm dev`, then:

| Route | Contents |
| --- | --- |
| `#/` | The playground first, then framework and agent-tooling compatibility, then component samples |
| `#/playground` | Every `LiquefyProvider` prop as a live control, applied to the whole site |
| `#/components` | Index of every component, each with live demos and a full prop table |
| `#/docs` | Introduction, installation, provider, theming, the `styles` prop, motion |
| `#/docs/frameworks` · `#/docs/tailwind` · `#/docs/ai-tooling` | Integration |
| `#/docs/accessibility` · `#/docs/performance` · `#/docs/troubleshooting` | Practices |

Twelve doc pages live in `apps/docs/src/docs/pages/*.tsx`, registered in
`apps/docs/src/docs/docs-nav.tsx` — one `DocEntry` per page, grouped into sidebar
categories. The 33 component pages come from `apps/docs/src/docs/catalog-*.tsx`, and
the shadcn registry publishes 37 items built from the same source. Old
`#/guides/*` links redirect to their `#/docs/*` equivalents.

## Style overrides: the `styles` prop

Every component takes a `styles` prop for one-off overrides, so reaching for a
stylesheet is optional. It is a superset of `style`:

```tsx
<LiquidButton
  styles={{
    color: 'accent',            // colour words resolve to var(--lq-accent)
    p: 3,                       // spacing keys count --lq-space units
    w: { base: '100%', md: 240 }, // responsive, per breakpoint
    boxShadow: '$shadow',       // $token → var(--lq-token), anywhere in a string
    _hover: { bg: '$glass-soft' },
    _dark: { opacity: 0.92 },
    '&:has(svg)': { gap: 2 },   // raw selectors start with &, at-rules with @
  }}
>
  Create magic
</LiquidButton>
```

| Feature | Notes |
| --- | --- |
| CSS properties | Every camelCase property, plus `--custom-properties`. Numbers become `px`, matching `style`. |
| Spacing shorthands | `p`, `px`, `py`, `pt`/`pr`/`pb`/`pl`, and the `m` equivalents. Numbers count `--lq-space` units (`4px` by default, set `spacing` on the provider). `gap` and friends use the same scale. |
| Other shorthands | `w`, `h`, `size`, `minW`/`maxW`/`minH`/`maxH`, `bg`, `radius`. `radius` drives `--lq-radius`, so the press-squish keeps animating the corners. |
| Tokens | `$name` anywhere in a string resolves to `var(--lq-name)`. Colour properties also accept the bare words `accent`, `tint`, `foreground`, `muted`, `placeholder`, `text`, `line`. |
| Responsive | `{ base, sm, md, lg, xl }`, ordered ascending no matter how you write it. Override the widths with `breakpoints` on `LiquefyProvider`. |
| States | `_hover`, `_focus`, `_focusVisible`, `_active`, `_disabled`, `_checked`, `_selected`, `_expanded`, `_open`, `_invalid`, `_readOnly`, `_placeholder`, `_first`, `_last`, `_odd`, `_even`, and `_dark` / `_light` (which cover both the explicit theme and `theme="system"`). |

Static values ride the `style` attribute, so the common case adds no stylesheet
and no hydration concerns. As soon as a state or breakpoint appears, the whole
object moves into a generated class instead — otherwise the inline declarations
would outrank the very rules meant to override them. That class is inserted
**unlayered**, and the component stylesheet lives in `@layer liquefy-ui`, so
overrides win on cascade order rather than on `!important` or specificity.

Precedence is `styles` over the component's own custom properties, and `style`
over everything — `style` stays the last-resort escape hatch.

`transform` and `backdrop-filter` are written inline by the jelly springs every
frame and cannot be overridden through `styles`; development builds warn if you
try. Wrap the component and style the wrapper instead.

Building your own component on the same system:

```tsx
import { useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'

export const Panel = ({ className, style, styles, ...props }: LiquidStyleProps & JSX.IntrinsicElements['div']) => {
  const root = useLiquidStyles('my-panel', { className, style, styles })
  return <div className={root.className} style={root.style} {...props} />
}
```

Server rendering: `useInsertionEffect` does not run on the server, so flush the
collected rules into the document head yourself with `getLiquefyStyleSheet()`.
Static-only `styles` need nothing — they are already inline.

`LiquefyProvider` takes `className` and `style` but not `styles` — it owns the
config that `styles` reads. `LiquidToastProvider` takes none of the three: it
renders no root element of its own, only the toast viewport. `slotStyles` is reserved for per-part styling
(`{ header, body, footer }`) and is not implemented yet.

The full version of this — every shorthand, token reference, breakpoint and state
key, plus custom components and server rendering — is at `#/docs/styles-prop`,
with the token system itself at `#/docs/theming`.

## Development

Two different Node floors, and they are not the same number:

- **Consumers** need Node 20.19 or newer, which is what `engines` says. CI proves
  it by installing the packed tarballs with npm on exactly that version and
  server-rendering from them.
- **This repository** needs Node 22.13 or newer, because pnpm 11 does.

```bash
corepack enable
pnpm install
pnpm dev
```

`pnpm check` is what CI runs: `build`, then `typecheck`, `test` and `verify:rsc`.
The build comes first because `apps/next-example` deliberately typechecks against
the built package rather than the source — it is the canary for the `'use client'`
banner — so on a clean checkout the types do not exist until the build has run.

That app also holds the one version this repository does not keep current:
`typescript` stays on 5.x there while everything else is on 7.x. Next 16.2 cannot
find TypeScript 7 — `next build` reports *"you do not have the required package(s)
installed"* and exits 1 — so the pin is what keeps the canary alive. Raise it when
Next supports 7, not before; a dependency bot will offer to, and CI will refuse it.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the documentation and playground |
| `pnpm preview` | Serve the built documentation |
| `pnpm typecheck` | Type-check every package |
| `pnpm test` | Regenerate the generated files, then run the whole suite |
| `pnpm build` | Build npm artifacts and documentation |
| `pnpm check` | Build, type-check, test, and verify the RSC directive — what CI runs |
| `pnpm generate` | Regenerate the MCP catalog, the shadcn registry and the `llms` files from source |
| `pnpm verify:rsc` | Assert the built bundles carry `'use client'` |
| `pnpm pack:packages` | Pack the three consumer-facing packages into `.tarballs/` |
| `pnpm prepare` | Point `core.hooksPath` at `.githooks/` — run for you by `pnpm install` |
| `pnpm smoke` | Pack, install the tarballs into an empty npm project, and render from them |
| `pnpm changeset` | Describe a change for the next release |
| `pnpm version-packages` | Apply the changesets locally |
| `pnpm release` | Build and publish (what the Release workflow runs) |

### Tests

`pnpm test` runs everything: unit tests, DOM tests under jsdom, and a set of
invariant tests that exist because the failures they catch are silent.

| Suite | Holds |
| --- | --- |
| `packages/react/test` | The `styles` engine, the keyboard behaviour of every overlay, the provider's attributes and tokens, the role/name/state contract of every control, and a server render of all of them |
| `packages/core/test` | The spring integrator, and the custom properties the motion engine writes on every frame — the stylesheet reads exactly those names |
| `packages/mcp/test` | The protocol handshake, notification handling, and that every answer comes from the generated catalog |
| `apps/docs/test` | Every demo and doc page renders, every import line names a real export, every component is documented, and every `#/` link resolves |
| `test/` | The published export surface, the token set per theme, the shadcn registry's install graph, the generated `llms` files, the package manifests, the commit-message convention, and that the retired spelling never comes back |

A few of them are worth knowing about before making changes:

- `test/public-api.test.mjs` lists every export by name. Changing that list fails
  the test on purpose: it means writing a changeset, not noticing in a consumer's
  build.
- `test/tokens.test.mjs` asserts light and dark declare the same `--lq-*` set. A
  token added to one theme and not the other breaks only that theme, and nothing
  else fails.
- `test/metadata.test.mjs` fails if the retired spelling of the project name — the
  one with an `i` where this one has an `e` — appears anywhere. The two used to
  coexist, and generated links went to the wrong one more than once.

### Branches

`rc` is where development happens. Branch from it, open a pull request back into
it, and that is the whole loop for a change. `main` is the release branch and
holds nothing that has not already been through `rc`.

```
feature/… ──▶ rc ──▶ main
                     └── publishes to npm
```

Both branches take pull requests only — no direct pushes, no force pushes, no
deletions — and both require the CI jobs below to be green before a merge.

A release is a pull request from `rc` to `main`. What makes that safe to do at any
time is the ordering rule: **versions are decided on `rc`, never on `main`.**

| Where | Workflow | What it does |
| --- | --- | --- |
| push to `rc` | `version.yml` | Opens or updates the **chore: version packages** pull request, which applies the accumulated changesets. It has no npm credentials and no `id-token` permission, so it cannot publish. |
| push to `main` | `release.yml` | Publishes whatever versions `rc` arrived carrying, with provenance. |

So the release sequence is: merge the version pull request into `rc` first, then
merge `rc` into `main`. Get that backwards and `release.yml` stops before
publishing and says which changesets are still pending — the alternative is
republishing the previous release's numbers, which npm accepts as a silent no-op.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `rc` or
`main`. All five are required before either branch will take a merge:

| Job | What it answers |
| --- | --- |
| Commit messages | Does every new commit — and the pull request title a squash merge would use — follow the convention? |
| Typecheck, test and build | Does `pnpm check` pass? |
| Tests on Node 24 | Does the suite pass on the current release? |
| Consumer install on Node 20.19 | Do the packed tarballs install with npm and render, on the version `engines` claims? |
| Package manifests and types | Do `publint` and `@arethetypeswrong/cli` accept what npm would serve? |

### Commits

One line, prefixed with what kind of change it is:

```
fix(react): keep the lens visible when the tab regains focus
```

[CONTRIBUTING.md](./CONTRIBUTING.md) has the types, the scopes and the reasoning.
`pnpm install` installs the hook that checks it, and the `commit-lint` job checks
it again on the way in.

The Vercel deployment builds only `@liquefy-ui/docs` and what it imports —
`apps/next-example` exists as a CI guard for the RSC boundary, not as something to
deploy, and `vercel.json` filters it out so it does not slow every preview.

The project is connected to this repository, so `main` deploys to production and
every other branch gets a preview URL of its own. Nothing needs `vercel deploy`.

`vercel.json` also sends `liquefy-ui.vercel.app` to `liquefy-ui.com` with a 308.
Vercel assigns that hostname to the project and there is no way to give it back, so
the site answered on two origins — which splits search rankings between them and
means a link someone copied out of the address bar keeps working after the project
is renamed or moved. The redirect matches on the host and leaves the path alone, so
deployment-specific preview URLs are unaffected and still open directly.

## Components

33 components and 44 icons, each with live demos and a full prop table on the
components site: run `pnpm dev` and open `#/components`.

| Category | Components |
| --- | --- |
| Inputs | `LiquidButton`, `LiquidIconButton`, `LiquidCheckbox`, `LiquidRadioGroup` / `LiquidRadio`, `LiquidSwitch`, `LiquidSlider`, `LiquidTextField`, `LiquidTextArea`, `LiquidSelect`, `LiquidSegmented`, `LiquidRating` |
| Data display | `LiquidAvatar` / `LiquidAvatarGroup`, `LiquidBadge`, `LiquidChip`, `LiquidTooltip`, `LiquidTable` family, `LiquidList` family, `LiquidDivider` |
| Feedback | `LiquidAlert`, `LiquidProgress`, `LiquidSpinner`, `LiquidSkeleton`, `LiquidToastProvider` / `useLiquidToast`, `LiquidDialog` |
| Surfaces | `LiquidSurface`, `GlassCard`, `LiquidAccordion` / `LiquidAccordionItem` |
| Navigation | `LiquidTabs` family, `LiquidBreadcrumbs`, `LiquidPagination`, `LiquidMenu`, `LiquidDrawer`, `GlassDock` / `DockItem` |
| Foundation | `LiquefyProvider`, `useLiquefyConfig`, `useLiquidGlass`, `useLiquidStyles`, `getLiquefyStyleSheet`, `defaultBreakpoints` |

When WebGL is unavailable, components automatically fall back to the transparent CSS material. Effects default to on everywhere; use the `motion` and `transparency` provider props to tone them down.

Use `theme="dark"`, `theme="light"`, or `theme="system"` on `LiquefyProvider` to control appearance.

## Releasing

Every package publishes publicly from the `@liquefy-ui` scope, with an npm
provenance attestation. There is **no publish token** anywhere: each package names
`liquefy-ui/liquefy-ui` and `release.yml` as its trusted publisher, so the workflow
trades its OIDC identity for a short-lived credential and the registry signs the
result. Consumers can check it with `npm audit signatures`.

Three things keep that working:

1. `release.yml` keeps its name and its `id-token: write` permission. Rename the
   file and every publish fails until the trusted publisher is updated on all four
   packages, at Settings → Trusted Publisher on each one.
2. Settings → Actions → General → Workflow permissions has *Allow GitHub Actions
   to create and approve pull requests* enabled. Changesets opens the version
   pull request, and without this it fails with `GitHub Actions is not permitted
   to create or approve pull requests`.
3. Every package carries a `repository` field, which npm requires before it will
   sign a publish with provenance. `test/metadata.test.mjs` keeps that true.

The loop is: `pnpm changeset` alongside the change, merge into `rc`, merge the
**chore: version packages** pull request that `version.yml` raises, then open
`rc → main`. Merging that publishes.

Packages version independently. There was a `linked` group holding `core`, `icons`
and `react` to one number, on the theory that a copied registry tree and the npm
tree could otherwise disagree — but the registry pins only `core`, and derives that
range from core's own manifest, so nothing was reading the alignment. All it did
was republish two untouched packages every time the third changed.

Publishing only works from CI, which is the point — a laptop has no OIDC identity
the registry will trust. What is worth running locally is the rehearsal:

```bash
pnpm smoke              # pack, install with npm, render — before anything else
pnpm changeset
pnpm version-packages   # review the bump and the changelogs, then push
```

Pack with **pnpm**, never `npm pack`: only pnpm rewrites its own `workspace:^`
specifier into a real range, and npm exits 1 on the unknown protocol without
saying why. `pnpm release` and `pnpm smoke` both do the right thing.

One trap worth knowing, because it cost a version. `changeset publish` shells out
to the workspace's package manager — `pnpm publish` here — and pnpm has no
provenance support at all. `publishConfig.provenance` is an npm-only field, so it
is accepted and ignored, and the release goes out unsigned with no warning. Trusted
publishing is what actually produces the attestation; the field alone does nothing.

## Design notes

- **Real edge refraction**: a WebGL shader bakes a rounded-rect lens displacement map, applied to the live backdrop through an SVG `feDisplacementMap` inside `backdrop-filter` (with per-channel chromatic dispersion). Chromium renders it fully; WebKit and Gecko gracefully fall back to the blurred CSS material.
- **One shared WebGL context**: browsers cap live WebGL contexts (~16 per page), so every component draws through a single hidden GL canvas and blits into its own 2D canvas. Any number of glass components can coexist.
- **Jelly physics**: scale, skew, and tilt run on deliberately underdamped springs. Pointer velocity is injected into the springs, so fast sweeps make surfaces sway, and press/release produces several visible overshoots. The shader receives the same energy as `u_wobble` and wiggles the rim in sync.
- The overlay shader renders SDF-shaped rim light with RGB dispersion, iridescence, pointer glow, press ripples, and a moving sheen — only during interaction and decay, never continuously.
- Glass is intended for interaction and navigation layers rather than primary content.
- **Accessibility comes from Base UI**: Dialog, Drawer, Menu, Select, Tooltip, Tabs and Accordion are built on `@base-ui/react`, which supplies focus trapping and restoration, scroll locking, Escape handling, roving tabindex, typeahead, and collision-aware positioning. liquefy-ui keeps the optics and the springs and stops re-implementing the parts that are easy to get subtly wrong. The keyboard behaviour is asserted in `packages/react/test/keyboard.test.tsx` rather than assumed.
- React and React DOM are peer dependencies, preventing duplicate React bundles.
- Motion and transparency are **always on by default**, independent of OS accessibility settings (macOS "Reduce Motion" / "Reduce Transparency" silently flip both media queries in every desktop browser). Toggle them per subtree with `motion={false}` / `transparency={false}` on `LiquefyProvider`; apps that want to honor the OS can pass e.g. `motion={!matchMedia('(prefers-reduced-motion: reduce)').matches}` or use the core-level `respectReducedMotion` / `respectReducedTransparency` options.

## License

MIT
