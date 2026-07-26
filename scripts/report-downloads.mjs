import { readFile, readdir } from 'node:fs/promises'

/**
 * How often each published package is downloaded, since the day it was first
 * published.
 *
 * The packages are read from the workspace rather than listed here, so a new one
 * appears in this report by being published rather than by being remembered.
 * Neither host needs a key: the registry knows what is published and when it
 * first was, api.npmjs.org counts the downloads.
 *
 * A day is totalled after it has ended in UTC, and the total lands some hours
 * later, so the newest real number is yesterday's and a package published today
 * has none at all. Until then the range endpoint answers 0 for those days, which
 * is indistinguishable from a day nobody downloaded anything — so trailing days
 * that are 0 across every package are dropped and the report says which day it
 * counts through instead of implying it is up to the minute.
 *
 * Usage: pnpm downloads [--json]
 */

const REGISTRY = 'https://registry.npmjs.org'
const COUNTS = 'https://api.npmjs.org/downloads/range'

/** Trailing periods to total, in days. */
const WINDOWS = [1, 7, 30]

// Web Analytics has no public API, so the other half of the question — how many
// people opened the site — is answered in one place only.
const DASHBOARD = 'https://vercel.com/ut0ns-projects/liquefy-ui/analytics'

const day = (date) => date.toISOString().slice(0, 10)
const total = (numbers) => numbers.reduce((carry, number) => carry + number, 0)

const packagesDir = new URL('../packages/', import.meta.url)

const manifests = await Promise.all(
  (await readdir(packagesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map(async (entry) =>
      JSON.parse(await readFile(new URL(`${entry.name}/package.json`, packagesDir), 'utf8'))),
)

const published = manifests
  .filter((manifest) => manifest.private !== true)
  .map((manifest) => manifest.name)
  .sort()

if (published.length === 0) throw new Error('No publishable package under packages/')

const get = async (url) => {
  const response = await fetch(url)
  // For a package nobody has downloaded yet, 404 is the answer to "how many
  // downloads" rather than a failure. Every other status is a failure, and
  // reporting it as a zero would be a lie about the package.
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${url} → ${response.status} ${response.statusText}`)
  return response.json()
}

const packageOf = async (name) => {
  const metadata = await get(`${REGISTRY}/${encodeURIComponent(name)}`)
  if (!metadata) throw new Error(`${name} is not published`)

  const since = day(new Date(metadata.time.created))
  const counts = await get(`${COUNTS}/${since}:${day(new Date())}/${encodeURIComponent(name)}`)

  return {
    /** Downloads per day, oldest first. Empty until the first day is totalled. */
    days: counts?.downloads ?? [],
    name,
    since,
    version: metadata['dist-tags'].latest,
  }
}

const packages = await Promise.all(published.map(packageOf))

const dates = [...new Set(packages.flatMap(({ days }) => days.map((entry) => entry.day)))].sort()
const downloadsOn = (date) =>
  total(packages.map(({ days }) => days.find((entry) => entry.day === date)?.downloads ?? 0))

/** The newest day npm has counted anything on; everything is reported as of it. */
const through = dates.filter(downloadsOn).at(-1)

/** The `window` days ending at `through`, so every package covers one period. */
const windowFrom = (window) => {
  const from = new Date(`${through}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - (window - 1))
  return day(from)
}

const summarise = ({ days, ...rest }) => ({
  ...rest,
  total: total(days.map((entry) => entry.downloads)),
  windows: WINDOWS.map((window) => {
    if (!through) return 0
    const from = windowFrom(window)
    return total(
      days.filter((entry) => entry.day >= from && entry.day <= through).map((entry) => entry.downloads),
    )
  }),
})

const rows = packages.map(summarise)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ packages: rows, through: through ?? null, windows: WINDOWS }, null, 2))
  process.exit(0)
}

const columns = [
  ['package', (row) => row.name],
  ['latest', (row) => row.version],
  ...WINDOWS.map((window, index) => [`${window}d`, (row) => String(row.windows[index])]),
  ['total', (row) => String(row.total)],
  ['since', (row) => row.since],
]

const footer = [
  `all ${rows.length} packages`,
  '',
  ...WINDOWS.map((_, index) => String(total(rows.map((row) => row.windows[index])))),
  String(total(rows.map((row) => row.total))),
  '',
]

const table = [columns.map(([heading]) => heading), ...rows.map((row) => columns.map(([, cell]) => cell(row))), footer]
const widths = columns.map((_, index) => Math.max(...table.map((cells) => cells[index].length)))
// Names read left-aligned; numbers only compare when their digits line up.
const pad = (cell, index) => (index === 0 ? cell.padEnd(widths[index]) : cell.padStart(widths[index]))
const line = (cells) => `  ${cells.map(pad).join('  ')}`.trimEnd()

console.log(
  through
    ? `npm downloads, through ${through} (UTC)`
    : 'npm downloads: nothing counted yet — a day is totalled once it has ended in UTC',
)
console.log('')
for (const cells of table) console.log(line(cells))
console.log('')
console.log(`Visitors and pages, on Vercel: ${DASHBOARD}`)
