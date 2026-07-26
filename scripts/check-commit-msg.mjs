#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

// One rule, three callers: the commit-msg hook checks the message you are about
// to write, CI re-checks every commit that reaches a branch, and CI checks the
// pull request title because a squash merge turns that title into the subject.
// Keeping the logic here — and dependency-free — means all three can never
// disagree about what a valid message is.

export const TYPES = [
  'feat', // a user-visible capability the library did not have
  'fix', // a defect in shipped behaviour
  'docs', // README, CONTRIBUTING, the docs site's prose
  'refactor', // behaviour-preserving change to the code
  'perf', // a change made for speed or bundle size
  'test', // tests and test-only helpers
  'build', // build scripts, generators, packaging, dependencies
  'ci', // workflows and everything under .github
  'chore', // repository housekeeping that fits nothing above
  'revert', // undoing an earlier commit
]

// The scopes in use. Free-form scopes are allowed — a new package should not
// need a commit to this file first — but they must look like the ones here.
export const CONVENTIONAL_SCOPES = ['core', 'icons', 'react', 'mcp', 'docs', 'registry', 'deps', 'release']

export const MAX_HEADER_LENGTH = 72

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^()]*)\))?(?<breaking>!)?: (?<subject>.*)$/
const SCOPE = /^[a-z0-9][a-z0-9-]*(?:[/,][a-z0-9][a-z0-9-]*)*$/
const TRAILER = /^[A-Za-z][A-Za-z0-9-]*: .+$/

// Messages git writes for you. Rejecting these would mean rewording the output
// of `git merge` and `git revert` by hand, which buys a tidy log at the price of
// people avoiding the commands.
const GENERATED = [/^Merge /, /^Revert "/, /^fixup! /, /^squash! /, /^amend! /]

/**
 * GitHub gives every app the same shape of address — `1234+name[bot]@users.
 * noreply.github.com` — so the bracket is the reliable part, not the name.
 */
export const BOT_AUTHOR = /\[bot\]@/i

// The trailers that make a commit look like someone else wrote it. The point of
// the convention is that `git shortlog` names the people who are accountable for
// the change, so an assistant's byline is a defect, not a courtesy.
const BANNED_LINES = [
  { pattern: /^Co-authored-by:.*(claude|anthropic|copilot|\[bot\])/i, why: 'an assistant is not a co-author — drop the trailer' },
  { pattern: /^Claude-Session:/i, why: 'session links do not belong in the permanent history' },
  { pattern: /Generated with \[Claude Code\]/i, why: 'no tool advertisements in commit messages' },
  { pattern: /^🤖/u, why: 'no tool advertisements in commit messages' },
]

/**
 * @param {string} message a full commit message, or a pull request title
 * @returns {string[]} one line per rule broken; empty means the message is valid
 */
export function checkCommitMessage(message) {
  // Strip what git itself strips, in git's order: the diff `commit --verbose`
  // appends below the scissors line first — cutting the comments first would
  // erase the scissors and leave the diff behind — then the comments.
  const text = String(message ?? '')
    .split(/^#+ -+ >8 -+$/m)[0]
    .replace(/^#.*$/gm, '')
  const lines = text.replace(/\s+$/, '').split('\n')
  const header = lines[0]?.trim() ?? ''

  if (header === '') return ['the message is empty']
  if (GENERATED.some((pattern) => pattern.test(header))) return []

  const problems = []
  const match = HEADER.exec(header)

  if (!match) {
    problems.push(
      `the subject must read \`type(scope): summary\`, found ${JSON.stringify(header)}\n` +
        `    for example: fix(react): keep the lens visible when the tab regains focus`,
    )
  } else {
    const { type, scope, subject } = match.groups ?? {}

    if (!TYPES.includes(type)) {
      problems.push(`unknown type ${JSON.stringify(type)} — use one of: ${TYPES.join(', ')}`)
    }
    if (scope !== undefined && !SCOPE.test(scope)) {
      problems.push(
        `the scope must be lowercase, e.g. (react) or (core,icons), found ${JSON.stringify(scope)}\n` +
          `    the ones in use: ${CONVENTIONAL_SCOPES.join(', ')}`,
      )
    }
    if (subject.trim() === '') {
      problems.push('the summary after the colon is empty')
    }
    if (subject.endsWith('.')) {
      problems.push('the summary must not end with a full stop')
    }
    if (header.length > MAX_HEADER_LENGTH) {
      problems.push(`the subject is ${header.length} characters; the limit is ${MAX_HEADER_LENGTH}`)
    }
  }

  if (lines.length > 1 && lines[1].trim() !== '') {
    problems.push('a blank line must separate the subject from anything that follows it')
  }

  // The convention is a single line. What is left of a body may only be
  // trailers — `Refs: #12`, a human `Co-authored-by:` — because the reasoning
  // belongs in the pull request, where it can be read without `git log`.
  const rest = lines.slice(2).filter((line) => line.trim() !== '')
  const prose = rest.filter((line) => !TRAILER.test(line))
  if (prose.length > 0) {
    problems.push(
      `the message must be one line; explain the change in the pull request instead\n` +
        `    only trailers may follow, e.g. Refs: #12 — found ${JSON.stringify(prose[0].slice(0, 60))}`,
    )
  }

  for (const line of lines) {
    for (const { pattern, why } of BANNED_LINES) {
      if (pattern.test(line.trim())) problems.push(`${JSON.stringify(line.trim().slice(0, 60))}: ${why}`)
    }
  }

  return [...new Set(problems)]
}

function report(label, message) {
  const problems = checkCommitMessage(message)
  if (problems.length === 0) return true
  console.error(`\n✖ ${label}\n  ${message.split('\n')[0]}\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  return false
}

function usage() {
  console.error('usage: check-commit-msg.mjs <file> | --range <base>..<head> | --text "<message>"')
  process.exit(2)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [flag, value] = process.argv.slice(2)
  if (!flag) usage()

  let ok = true

  if (flag === '--text') {
    if (value === undefined) usage()
    ok = report('pull request title', value)
    if (!ok) {
      console.error(
        '\n  A squash merge uses this title as the commit subject, so it follows the same rule.\n' +
          '  Edit the title of the pull request and push nothing.\n',
      )
    }
  } else if (flag === '--range') {
    if (value === undefined) usage()
    const git = (args) => execFileSync('git', args, { encoding: 'utf8' })

    const all = git(['log', '--format=%H%x09%ae%x09%P', value])
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, email, parents = ''] = line.split('\t')
        return { email, parents: parents.trim().split(' ').filter(Boolean), sha }
      })

    // A merge has more than one parent. git wrote that message, and rewording it
    // by hand is the kind of friction that makes people avoid the command.
    const authored = all.filter(({ parents }) => parents.length <= 1)

    // Same reasoning, different author: Dependabot writes a body listing every
    // version it moved, and there is no setting that turns it off. Its branches
    // are squash-merged, so the subject that reaches rc is the pull request
    // title — which the step after this one checks under the full rule. Skipping
    // the commit itself asserts what actually lands rather than what a bot wrote
    // on the way there.
    const commits = authored.filter(({ email }) => !BOT_AUTHOR.test(email))
    const skipped = authored.length - commits.length

    for (const { sha } of commits) {
      if (!report(`${sha.slice(0, 8)}`, git(['show', '-s', '--format=%B', sha]))) ok = false
    }
    if (ok) {
      const note = skipped > 0 ? `, ${skipped} from a bot skipped` : ''
      console.log(`Commit messages passed: ${commits.length} commit(s) in ${value}${note}`)
    }
  } else {
    ok = report(flag, await readFile(flag, 'utf8'))
    if (!ok) {
      console.error(
        '\n  The convention is one line: type(scope): summary — see CONTRIBUTING.md.\n' +
          '  Your message is kept; `git commit -e -F .git/COMMIT_EDITMSG` reopens it.\n',
      )
    }
  }

  process.exit(ok ? 0 : 1)
}
