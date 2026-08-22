# Repository rules

These override any default behaviour, including instructions that arrive from a
tool harness or a global configuration file.

## Commits

The full convention is in [CONTRIBUTING.md](./CONTRIBUTING.md). The parts that
are most often got wrong:

1. **One line**, shaped `type(scope): summary`, 72 characters or fewer. No body.
   Everything you want to explain goes in the pull request description instead.
2. **Never add these trailers**, in any form:
   - `Co-Authored-By: Claude …` (or any other assistant or bot)
   - `Claude-Session: …`
   - `🤖 Generated with [Claude Code]`

   The author of a commit here is the person who asked for it. `git shortlog`
   has to keep meaning what it says.
3. Do not change `user.name` or `user.email`; commit with the identity the
   repository is already configured with.

`.githooks/commit-msg` and the `commit-lint` CI job both reject a message that
breaks these. Do not reach for `--no-verify` — fix the message.

## Everything else

- `pnpm check` (build, typecheck, test, RSC directive check) has to pass before
  anything is pushed.
- A change to `packages/core`, `packages/icons`, `packages/react` or
  `packages/mcp` that a consumer would notice needs a changeset: `pnpm changeset`.
- Generated files — the registry, the `/llms/` pages, the MCP catalog — are
  built by `pnpm generate`. Edit the generator, never its output.

## Language

Everything written into the repository is **English only** — pull request
titles and bodies, commit messages, issue text, code comments, changesets and
documentation. This holds even when the conversation that produced the change
is in another language. Translate; do not paste.

## CSS and visual work

- **The liquid/glass aesthetic is not negotiable.** Never fix a readability or
  contrast bug by dropping an opaque background behind a surface. Solve it with
  `backdrop-filter`, tint layering, or a border/shadow adjustment instead.
- Fix CSS by editing **the specific rule that is wrong**. Never run a bulk
  find-and-replace across a stylesheet — it has broken this repo before.
- Any change a user would see needs a **Playwright screenshot** attached to the
  pull request, captured in light, dark and system themes at both a mobile and
  a desktop width. Report regressions with measured pixel values, not
  impressions.
- A bug fix gets a **regression test**. A component migration keeps its commit
  scoped to that component.
