import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CONVENTIONAL_SCOPES, MAX_HEADER_LENGTH, TYPES, checkCommitMessage } from '../scripts/check-commit-msg.mjs'

const root = new URL('..', import.meta.url)

describe('accepts', () => {
  it.each([
    'feat: add the reduced-transparency fallback',
    'fix(react): keep the lens visible when the tab regains focus',
    'fix(core,icons): align the token names',
    'feat(react)!: rename LiquidGlass to LiquidSurface',
    'build(deps): move vitest to 4.1.10',
    'docs: document the four CI jobs\n\nRefs: #12',
    'fix(mcp): resolve the catalog path\n\nCo-authored-by: Ada Lovelace <ada@example.com>',
  ])('%s', (message) => {
    expect(checkCommitMessage(message)).toEqual([])
  })

  it('leaves the messages git writes alone', () => {
    for (const message of ['Merge branch main into feature', 'Revert "feat: a thing"\n\nThis reverts commit abc123.', 'fixup! feat: a thing']) {
      expect(checkCommitMessage(message)).toEqual([])
    }
  })

  it('ignores the comments and the diff git appends to the editor buffer', () => {
    const buffer = ['fix(core): clamp the blur radius', '', '# Please enter the commit message.', '# ------------------------ >8 ------------------------', 'diff --git a/x b/x', '+Co-authored-by: Claude <noreply@anthropic.com>'].join('\n')
    expect(checkCommitMessage(buffer)).toEqual([])
  })
})

describe('rejects', () => {
  const rejects = (message, fragment) => {
    const problems = checkCommitMessage(message)
    expect(problems.length, `expected a problem for ${JSON.stringify(message)}`).toBeGreaterThan(0)
    expect(problems.join('\n')).toContain(fragment)
  }

  it('a subject with no type', () => rejects('Bring the README back in line', 'type(scope): summary'))
  it('a type nobody agreed to', () => rejects('improvement: make it nicer', 'unknown type'))
  it('an uppercase type', () => rejects('Fix: the blur radius', 'type(scope): summary'))
  it('a missing space after the colon', () => rejects('fix:the blur radius', 'type(scope): summary'))
  it('an empty summary', () => rejects('fix: ', 'type(scope): summary'))
  it('a full stop at the end', () => rejects('fix(core): clamp the blur radius.', 'full stop'))
  it('an uppercase scope', () => rejects('fix(React): a thing', 'the scope must be lowercase'))
  it('an empty message', () => rejects('   \n  ', 'empty'))

  it(`a subject longer than ${MAX_HEADER_LENGTH}`, () => {
    rejects(`fix(core): ${'x'.repeat(MAX_HEADER_LENGTH)}`, `the limit is ${MAX_HEADER_LENGTH}`)
  })

  it('a body that is not a trailer', () => {
    rejects('fix(core): clamp the blur radius\n\nThe radius could exceed the surface.', 'must be one line')
  })

  it('a body without the blank line', () => {
    rejects('fix(core): clamp the blur radius\nRefs: #12', 'blank line')
  })

  it.each([
    ['Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>', 'not a co-author'],
    ['Co-authored-by: dependabot[bot] <bot@github.com>', 'not a co-author'],
    ['Claude-Session: https://claude.ai/code/session_01', 'session links'],
    ['🤖 Generated with [Claude Code](https://claude.com/claude-code)', 'advertisement'],
  ])('the trailer %s', (trailer, fragment) => {
    rejects(`fix(core): clamp the blur radius\n\n${trailer}`, fragment)
  })
})

describe('the rule is wired up', () => {
  it('runs as a commit-msg hook that pnpm install installs', () => {
    const hook = readFileSync(new URL('.githooks/commit-msg', root), 'utf8')
    expect(hook).toContain('scripts/check-commit-msg.mjs')

    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
    expect(manifest.scripts.prepare).toContain('core.hooksPath .githooks')
  })

  it('runs in CI over the commits and the pull request title', () => {
    const workflow = readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8')
    expect(workflow).toContain('commit-lint')
    expect(workflow).toContain('--range')
    expect(workflow).toContain('--text')
  })

  it('documents every type and scope the checker knows', () => {
    const contributing = readFileSync(new URL('CONTRIBUTING.md', root), 'utf8')
    for (const type of TYPES) expect(contributing, `type ${type}`).toContain(`\`${type}\``)
    for (const scope of CONVENTIONAL_SCOPES) expect(contributing, `scope ${scope}`).toContain(`\`${scope}\``)
  })

  it('exits non-zero on a message it rejects', () => {
    const run = (message) =>
      execFileSync('node', ['scripts/check-commit-msg.mjs', '--text', message], {
        cwd: new URL('.', root),
        encoding: 'utf8',
        stdio: 'pipe',
      })

    expect(() => run('fix(core): clamp the blur radius')).not.toThrow()
    expect(() => run('made it better')).toThrow()
  })
})
