import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * Installs the packed tarballs into an empty project with npm and server-renders
 * a component out of them.
 *
 * Everything else in this repository tests the source through a workspace link.
 * This is the only check that exercises what a consumer actually gets: the
 * published file list, the `exports` map, the type of module Node resolves, and
 * the peer dependency graph. It runs on the oldest Node the packages claim to
 * support, so `engines` stops being a guess — pnpm cannot run there, which is
 * why this uses npm.
 *
 * The tarballs must come from `pnpm pack` (which is what `changeset publish` uses).
 * `npm pack` leaves pnpm's `workspace:^` specifier in the manifest, and npm then
 * exits 1 on the unknown protocol with no message whatsoever.
 *
 * Usage: node scripts/consumer-smoke.mjs <directory containing the .tgz files>
 */

const tarballDir = resolve(process.argv[2] ?? '.tarballs')
const tarballs = readdirSync(tarballDir)
  .filter((file) => file.endsWith('.tgz'))
  .map((file) => join(tarballDir, file))

if (tarballs.length === 0) throw new Error(`No tarballs in ${tarballDir}`)

const project = mkdtempSync(join(tmpdir(), 'liquefy-consumer-'))
const run = (command, args) => execFileSync(command, args, { cwd: project, stdio: 'inherit' })

/** The name inside a tarball, so the overrides below can be keyed by it. */
const packageNameOf = (tarball) => {
  const listing = execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' })
  return JSON.parse(listing).name
}

console.log(`Node ${process.version}`)
console.log(`Consumer project: ${project}`)
console.log(`Installing: ${tarballs.map((file) => file.split('/').pop()).join(', ')}`)

// The react tarball depends on `@liquefy-ui/core@^0.1.0`. Installing every tarball
// at the root satisfies that range from the copy under test rather than from the
// registry — otherwise this would smoke-test the last published version instead.
const dependencies = {
  react: '19',
  'react-dom': '19',
  ...Object.fromEntries(tarballs.map((tarball) => [packageNameOf(tarball), `file:${tarball}`])),
}

writeFileSync(join(project, 'package.json'), `${JSON.stringify({
  dependencies,
  name: 'liquefy-consumer-smoke',
  private: true,
  type: 'module',
  version: '0.0.0',
}, null, 2)}\n`)

run('npm', ['install', '--no-audit', '--no-fund'])

// A server render is the strongest thing that can be asserted without a browser:
// it resolves the package, runs the component, and proves the markup and the
// provider's tokens survive the trip through the published bundle.
writeFileSync(join(project, 'smoke.mjs'), `import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import { LiquidButton, LiquefyProvider, useLiquefyConfig } from '@liquefy-ui/react'
import { SparklesIcon } from '@liquefy-ui/icons'
import { SpringValue, defaultTokens } from '@liquefy-ui/core'

const markup = renderToStaticMarkup(
  h(LiquefyProvider, { theme: 'dark', tint: '#8f8f8f' },
    h(LiquidButton, { iconBefore: h(SparklesIcon, { size: 16 }) }, 'Create magic')),
)

const expectations = [
  ['renders the button class', markup.includes('lq-button')],
  ['renders the provider', markup.includes('lq-provider')],
  ['writes the tint token', markup.includes('--lq-accent:#8f8f8f')],
  ['carries the theme attribute', markup.includes('data-liquid-theme="dark"')],
  ['renders the icon', markup.includes('<svg')],
  ['exports the spring engine', typeof SpringValue === 'function'],
  ['exports the tokens', typeof defaultTokens === 'object'],
  ['exports the config hook', typeof useLiquefyConfig === 'function'],
]

for (const [what, ok] of expectations) {
  console.log(\`\${ok ? 'ok  ' : 'FAIL'} \${what}\`)
  if (!ok) process.exitCode = 1
}

if (process.exitCode) {
  console.error('\\n--- markup ---\\n' + markup)
  throw new Error('The published packages did not render as expected.')
}
`)

run('node', ['smoke.mjs'])

// The CJS build is published too, and Node resolves it for a `require`.
writeFileSync(join(project, 'smoke.cjs'), `const liquefy = require('@liquefy-ui/react')
const core = require('@liquefy-ui/core')
const missing = ['LiquidButton', 'LiquefyProvider'].filter((name) => !liquefy[name])
if (missing.length > 0) throw new Error('CJS build is missing: ' + missing.join(', '))
if (typeof core.SpringValue !== 'function') throw new Error('CJS core build is missing SpringValue')
console.log('ok   require() resolves the CJS build')
`)

run('node', ['smoke.cjs'])

console.log('\nConsumer smoke test passed.')
