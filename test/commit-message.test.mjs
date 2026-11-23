import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { BOT_AUTHOR, BOT_LOGIN, CONVENTIONAL_SCOPES, MAX_HEADER_LENGTH, TYPES, checkCommitMessage } from '../scripts/check-commit-msg.mjs'

const root = new URL('..', import.meta.url)

describe('accepts', () => {
  it.each([
    'feat: add the reduced-transparency fallback',
    'fix(react): keep the lens visible when the tab regains focus',
    'fix(core,icons): align the token names',
    'feat(react)!: rename LiquidGlass to LiquidSurface',
    'build(deps): move vitest to 4.1.10',
    // A Dependabot grouped-update title (#147) that the old 72-character limit rejected.
    'chore(dev): bump @testing-library/user-event from 14.6.10 to 14.6.13 in the rest group',
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

  it('does not count the pull request number GitHub adds to a squash commit', () => {
    const prefix = 'fix(core): '
    const atLimit = `${prefix}${'x'.repeat(MAX_HEADER_LENGTH - prefix.length)}`
    expect(checkCommitMessage(`${atLimit} (#86)`)).toEqual([])
    rejects(`${atLimit}x (#86)`, `the limit is ${MAX_HEADER_LENGTH}`)
    rejects(`${atLimit} (#release)`, `the limit is ${MAX_HEADER_LENGTH}`)
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

// Dependabot writes a body listing every version it moved and offers no setting
// to stop, so the range check skips it and the pull request title — which is what
// a squash merge lands — carries the rule instead. The exemption is by author, so
// the thing worth proving is that it does not spill onto anyone else.
describe('the bot exemption', () => {
  it.each([
    '49699333+dependabot[bot]@users.noreply.github.com',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ])('covers %s', (email) => expect(BOT_AUTHOR.test(email)).toBe(true))

  it.each([
    'ada@example.com',
    'yu@users.noreply.github.com',
    'robot@example.com',
  ])('leaves %s alone', (email) => expect(BOT_AUTHOR.test(email)).toBe(false))

  const inRepo = () => {
    const dir = mkdtempSync(join(tmpdir(), 'commit-msg-'))
    const git = (args, env = {}) =>
      execFileSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } })
    git(['init', '-q', '-b', 'main'])
    git(['-c', 'user.name=Base', '-c', 'user.email=base@example.com', 'commit', '-q', '--allow-empty', '-m', 'chore: base'])

    const commit = (email, message) => git([
      '-c', 'user.name=Author', `-c`, `user.email=${email}`,
      'commit', '-q', '--allow-empty', '-m', message,
    ])

    const check = () => {
      try {
        execFileSync('node', [fileURLToPath(new URL('scripts/check-commit-msg.mjs', root)), '--range', 'HEAD~1..HEAD'],
          { cwd: dir, encoding: 'utf8', stdio: 'pipe' })
        return { ok: true }
      } catch (error) {
        return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` }
      }
    }

    return { check, commit, dir }
  }

  const body = 'chore: bump the build group with 2 updates\n\nBumps the build group with 2 updates: tsdown and typescript.'

  it('skips a body a bot wrote', () => {
    const { check, commit, dir } = inRepo()
    try {
      commit('49699333+dependabot[bot]@users.noreply.github.com', body)
      expect(check().ok).toBe(true)
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  })

  it('still rejects the same body from a person', () => {
    const { check, commit, dir } = inRepo()
    try {
      commit('ada@example.com', body)
      const result = check()
      expect(result.ok).toBe(false)
      expect(result.output).toContain('must be one line')
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  })
})

describe('the length exemption for bot pull requests', () => {
  // The title of #147, which a 100-character limit rejected at 105.
  const long = 'chore(dev): bump @testing-library/user-event from 14.6.10 to 14.6.13 in the rest group across 1 directory'

  const run = (...args) => {
    try {
      const stdout = execFileSync('node', ['scripts/check-commit-msg.mjs', '--text', ...args], {
        cwd: new URL('.', root),
        encoding: 'utf8',
        stdio: 'pipe',
      })
      return { ok: true, output: stdout }
    } catch (error) {
      return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` }
    }
  }

  it.each(['dependabot[bot]', 'github-actions[bot]'])('recognises %s', (login) => expect(BOT_LOGIN.test(login)).toBe(true))
  it.each(['dependabot', 'yu5ag', 'bot-fan', '[bot]ish'])('does not recognise %s', (login) => expect(BOT_LOGIN.test(login)).toBe(false))

  it('lets a long title through when Dependabot opened the pull request', () => {
    expect(long.length).toBeGreaterThan(MAX_HEADER_LENGTH)
    expect(checkCommitMessage(long, { checkLength: false })).toEqual([])
    expect(run(long, '--author', 'dependabot[bot]').ok).toBe(true)
  })

  it('still rejects the same title from a person', () => {
    const result = run(long, '--author', 'yu5ag')
    expect(result.ok).toBe(false)
    expect(result.output).toContain(`the limit is ${MAX_HEADER_LENGTH}`)
    expect(run(long).ok).toBe(false)
  })

  it('keeps every other rule for a bot', () => {
    expect(run('Bump @testing-library/user-event from 14.6.10 to 14.6.13', '--author', 'dependabot[bot]').ok).toBe(false)
    expect(run('chore(dev): bump the rest group.', '--author', 'dependabot[bot]').ok).toBe(false)
  })

  it('refuses an argument it does not understand', () => {
    expect(run(long, '--writer', 'dependabot[bot]').ok).toBe(false)
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

  it('tells the title check who opened the pull request', () => {
    const workflow = readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8')
    expect(workflow).toContain('github.event.pull_request.user.login')
    expect(workflow).toMatch(/--text "\$TITLE" --author "\$AUTHOR"/)
  })

  // Checking the title is only useful if a corrected title can be checked again.
  // `edited` is outside the default trigger set and a re-run replays the original
  // payload, so dropping it leaves a rejected title with no way to go green.
  it('runs again when the pull request title is edited', () => {
    const workflow = readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8')
    expect(workflow).toMatch(/pull_request:\s*\n\s*types:\s*\[[^\]]*\bedited\b/)
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
