# Contributing

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

## Before you open a pull request

```bash
pnpm check   # build, typecheck, test, and the 'use client' directive check
```

`pnpm smoke` additionally packs the four packages and installs them into an
empty project with npm, the way a consumer would.
