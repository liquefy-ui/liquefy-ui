# Contributing

Issues and pull requests are welcome. This page is everything you need to get a
change from a clone to a merged pull request.

## Getting set up

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

`pnpm dev` serves the documentation site and playground, which is where every
component is exercised.

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
| `pnpm smoke` | Pack, install the tarballs into an empty npm project, and render from them |
| `pnpm changeset` | Describe a change for the next release |
| `pnpm prepare` | Point `core.hooksPath` at `.githooks/` — run for you by `pnpm install` |

`pnpm check` is what CI runs: `build`, then `typecheck`, `test` and `verify:rsc`.
The build comes first because `apps/next-example` deliberately typechecks against
the built package rather than the source — it is the canary for the `'use client'`
banner — so on a clean checkout the types do not exist until the build has run.

That app also holds the one version this repository does not keep current:
`typescript` stays on 5.x there while everything else is on 7.x. Next 16.2 cannot
find TypeScript 7 — `next build` reports *"you do not have the required package(s)
installed"* and exits 1 — so the pin is what keeps the canary alive. Raise it when
Next supports 7, not before; a dependency bot will offer to, and CI will refuse it.

Generated files — the MCP catalog, the shadcn registry, the `/llms/` pages — come
out of `pnpm generate`. Edit the generator, never its output.

## Tests

`pnpm test` runs everything: unit tests, DOM tests under jsdom, and a set of
invariant tests that exist because the failures they catch are silent.

| Suite | Holds |
| --- | --- |
| `packages/react/test` | The `styles` engine, the keyboard behaviour of every overlay, the provider's attributes and tokens, the role/name/state contract of every control, and a server render of all of them |
| `packages/core/test` | The spring integrator, and the custom properties the motion engine writes on every frame — the stylesheet reads exactly those names |
| `packages/mcp/test` | The protocol handshake, notification handling, and that every answer comes from the generated catalog |
| `apps/docs/test` | Every demo and doc page renders, every import line names a real export, every component is documented, every `#/` link resolves, and every route is counted as a page of its own |
| `test/` | The published export surface, the token set per theme, the shadcn registry's install graph, the generated `llms` files, the package manifests, the commit-message convention, the page each hash route is reported to analytics as, and that the retired spelling never comes back |

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

## The documentation site

Twelve doc pages live in `apps/docs/src/docs/pages/*.tsx`, registered in
`apps/docs/src/docs/docs-nav.tsx` — one `DocEntry` per page, grouped into sidebar
categories. The 33 component pages come from `apps/docs/src/docs/catalog-*.tsx`,
and the shadcn registry publishes 37 items built from the same source. Old
`#/guides/*` links redirect to their `#/docs/*` equivalents.

The site routes on the hash while the analytics script reads `location.pathname` —
`/` on every page of it — so `apps/docs/src/site/analytics.tsx` reports the page
itself: the `path` a visitor opened, and the `route` pattern it matched. A new
*shape* of page needs a line in the `ROUTES` table there, and
`test/analytics.test.mjs` records what each shape is filed under.

## Branch from `rc`, not `main`

`rc` is the development branch. `main` is the release branch, and a merge into it
publishes to npm — so nothing lands there except a `rc → main` pull request.

```bash
git switch rc && git pull
git switch -c fix/lens-focus-restore
```

Both branches take pull requests only, and both require the CI jobs to pass. If
your change is one a consumer would notice, add a changeset in the same pull
request — `pnpm changeset`. Releases are cut from what those changesets add up to,
so a missing one means your change ships with no version bump and no changelog
line.

## Commit messages

One line. A prefix that says what kind of change it is.

```
type(scope): summary
```

```
feat(react): add a reduced-transparency fallback to LiquidCard
fix(mcp): resolve the catalog path when the CLI runs from a global install
docs: document the four CI jobs
build(deps): move vitest to 4.1.10
```

Why one line: the history is a list of *what changed*, read with
`git log --oneline` and in the GitHub release notes. The reasoning — what you
tried, what you rejected, what the review found — goes in the pull request,
where it stays readable and can be answered.

### The rules

| Rule | Detail |
| --- | --- |
| Type | `feat` `fix` `docs` `refactor` `perf` `test` `build` `ci` `chore` `revert` |
| Scope | Optional, lowercase, in parentheses. In use: `core` `icons` `react` `mcp` `docs` `registry` `deps` `release`. Several: `fix(core,react): …` |
| Breaking | A `!` before the colon: `feat(react)!: rename LiquidGlass to LiquidSurface` |
| Summary | Imperative, no full stop at the end |
| Length | The whole subject line, 72 characters or fewer |
| Body | None. Only trailers may follow a blank line — `Refs: #12`, a human `Co-authored-by:` |

`feat` and `fix` are the two types that change a published package, so they are
the two that need a [changeset](https://github.com/changesets/changesets):

```bash
pnpm changeset
```

### Authorship

A commit names the people accountable for it, so:

- No `Co-authored-by:` for an assistant, and no `Claude-Session:` or
  `Generated with …` lines. The check rejects them.
- Set the identity git will use before your first commit:

  ```bash
  git config user.name  "your-github-handle"
  git config user.email "<id>+<handle>@users.noreply.github.com"
  ```

  The number is the one GitHub shows under Settings → Emails; using that address
  is what links the commit to your account.

### Where the rule is enforced

- **Locally**, by `.githooks/commit-msg`. `pnpm install` points
  `core.hooksPath` at that directory, so it is live after your first install.
- **In CI**, by the `commit-lint` job, over every commit a pull request adds and
  over the pull request title — a squash merge turns that title into the
  subject, so it follows the same rule.
- The logic lives once, in `scripts/check-commit-msg.mjs`, and is tested by
  `test/commit-message.test.mjs`.

To check a message without committing:

```bash
node scripts/check-commit-msg.mjs --text "fix(core): clamp the blur radius"
```

`git commit --no-verify` skips the hook. It does not skip CI.

One exemption, by author: Dependabot writes a body listing every version it moved
and has no setting that turns it off, so CI skips its commits and holds the pull
request title to the rule instead. Squash merges here are configured to take the
pull request title and **discard the body**, which is what makes that safe — on
GitHub's default a squash concatenates every message it replaces, so the bot's
body would land regardless of how well the title reads.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `rc` or
`main`. All five are required before either branch will take a merge:

| Job | What it answers |
| --- | --- |
| Commit messages | Does every new commit — and the pull request title a squash merge would use — follow the convention? |
| Typecheck, test and build | Does `pnpm check` pass? |
| Tests on Node 24 | Does the suite pass on the current release? |
| Consumer install on Node 20.19 | Do the packed tarballs install with npm and render, on the version `engines` claims? |
| Package manifests and types | Do `publint` and `@arethetypeswrong/cli` accept what npm would serve? |

## Before you open a pull request

```bash
pnpm check   # build, typecheck, test, and the 'use client' directive check
```

`pnpm smoke` additionally packs the three consumer-facing packages and installs
them into an empty project with npm, the way a consumer would.
