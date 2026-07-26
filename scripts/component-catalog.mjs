import { readFile, readdir } from 'node:fs/promises'

/**
 * One source of truth for "what does this library contain", shared by the shadcn
 * registry builder and the llms.txt builder. Everything mechanical (exports,
 * imports, dependency edges) is read out of the source; only the prose lives here.
 */

const srcDir = new URL('../packages/react/src/', import.meta.url)
const reactPackageJson = new URL('../packages/react/package.json', import.meta.url)
const iconsEntry = new URL('../packages/icons/src/index.tsx', import.meta.url)
const coreEntry = new URL('../packages/core/src/index.ts', import.meta.url)

/**
 * The deployed docs origin. Every generated URL — registry items, llms.txt links,
 * the MCP catalog — is built from this one constant, because three copies of it is
 * exactly how you end up serving links to a domain that does not resolve.
 */
export const HOMEPAGE = 'https://liquefy-ui.com'

/** Files that are shared plumbing rather than a component. */
const kinds = {
  'internal-glyphs.tsx': 'lib',
  'provider.tsx': 'lib',
  'styles-prop.ts': 'lib',
  'use-liquid-glass.ts': 'hook',
}

/** Where the shadcn CLI puts each kind, and therefore how copied files import each other. */
export const aliasFor = { hook: '@/hooks', lib: '@/lib', ui: '@/components/ui' }

const registryTypeFor = { hook: 'registry:hook', lib: 'registry:lib', ui: 'registry:ui' }

/** Packages a copied file may keep depending on, rather than copying too. */
const runtimePackages = ['@liquefy-ui/core', '@base-ui/react']

/** Provided by the host app, never installed by the registry. */
const hostPackages = ['react', 'react-dom']

const descriptions = {
  'glass-card': 'A content card with eyebrow, title, description, body and footer slots on the liquid surface.',
  'glass-dock': 'A macOS-style dock: a glass rail of icon buttons that magnify under the pointer.',
  'internal-glyphs': 'The small inline SVG glyphs the components draw for chevrons, checks and status icons.',
  'liquid-accordion': 'Stacked disclosure panels with real headings and a height-measured open animation.',
  'liquid-alert': 'An inline status message in four severities, with an optional dismiss button.',
  'liquid-avatar': 'A circular avatar with image, initials and status dot, plus an overlapping group.',
  'liquid-badge': 'A small count or status pill for hanging off icons and labels.',
  'liquid-breadcrumbs': 'A trail of links with glyph separators and a current-page marker.',
  'liquid-button': 'The primary action control: WebGL rim light, jelly press spring and a loading state.',
  'liquid-checkbox': 'A checkbox with a springy tick, indeterminate state and label support.',
  'liquid-chip': 'A compact tag that can be selected, tinted and dismissed.',
  'liquid-dialog': 'A modal on Base UI: trapped focus, inert background and wired-up title and description.',
  'liquid-divider': 'A hairline rule, horizontal or vertical, with optional inline content.',
  'liquid-drawer': 'A side panel that slides from the left, right or bottom edge, on Base UI Dialog.',
  'liquid-icon-button': 'A square icon-only button that takes its accessible name from a label prop.',
  'liquid-list': 'A glass list with items, descriptions, leading icons, trailing slots and subheaders.',
  'liquid-menu': 'A dropdown action menu on Base UI: arrow keys, typeahead and collision-aware placement.',
  'liquid-pagination': 'A page strip with ellipsis truncation and previous/next controls.',
  'liquid-progress': 'A determinate progress bar and an indeterminate spinner sharing one accent.',
  'liquid-radio': 'A radio group with a springy dot and keyboard-driven selection.',
  'liquid-rating': 'A star rating that reads and writes a numeric value.',
  'liquid-segmented': 'A segmented control whose glass indicator slides between options.',
  'liquid-select': 'A listbox dropdown on Base UI: typeahead, focus return and a glass popover.',
  'liquid-skeleton': 'A shimmering placeholder block for content that has not arrived.',
  'liquid-slider': 'A range input with a luminous track and a dimensional thumb.',
  'liquid-surface': 'The base material every glass component is built on: rim light, refraction and springs.',
  'liquid-switch': 'A toggle whose thumb squashes as it travels.',
  'liquid-table': 'A composable data table on a glass container, with row hover and selection.',
  'liquid-tabs': 'Composable tabs on Base UI, with a glowing underline that springs between them.',
  'liquid-text-field': 'A single-line text input with label, hint and invalid state.',
  'liquid-textarea': 'A multi-line text input that keeps the field styling of LiquidTextField.',
  'liquid-toast': 'A toast provider and a useLiquidToast hook for transient messages.',
  'liquid-tooltip': 'A glass bubble on hover and focus, positioned by Base UI so it stays on screen.',
  provider: 'LiquefyProvider and the config hooks every component reads its tokens from.',
  'styles-prop': 'The `styles` prop engine: shorthands, token references, breakpoints and state selectors.',
  'use-liquid-glass': 'The hook that wires an element to the WebGL renderer and the motion springs.',
}

const titleCase = (slug) => slug
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

/** Every `export const Foo` / `export type Foo` name in a source file. */
const readExports = (source) => {
  const names = { types: [], values: [] }
  for (const match of source.matchAll(/^export (const|type|function) ([A-Za-z0-9_]+)/gm)) {
    (match[1] === 'type' ? names.types : names.values).push(match[2])
  }
  // Re-exported types declared inline in an export block, e.g. `export type { X }`.
  return names
}

/**
 * Every exported type declaration, verbatim. Three shapes have to survive:
 * a one-liner, an object literal, and a union spread over several lines — plus
 * generics, whose parameter list sits between the name and the `=`.
 */
const readTypeDeclarations = (source) => {
  const declarations = []
  const lines = source.split('\n')

  for (const [index, line] of lines.entries()) {
    const match = /^export type ([A-Za-z0-9_]+)\s*(<[^=]*>)?\s*=/.exec(line)
    if (!match) continue

    // Keep taking lines while the declaration is unfinished: an unbalanced brace
    // count, a trailing `=`, `|`, `&` or `,`, or a next line that continues it.
    let depth = 0
    let end = index
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const text = lines[cursor]
      depth += (text.match(/[{[(]/g) ?? []).length - (text.match(/[}\])]/g) ?? []).length
      end = cursor
      const next = lines[cursor + 1] ?? ''
      const unfinished = depth > 0
        || /[=|&,]$/.test(text.trimEnd())
        || /^\s*[|&]/.test(next)
      if (!unfinished) break
    }

    declarations.push({ name: match[1], text: lines.slice(index, end + 1).join('\n') })
  }

  return declarations
}

/**
 * What `@liquefy-ui/react` actually exports, read from its entry point. Every
 * source file has exports of its own — `compileLiquidStyles` for the tests,
 * `CheckGlyph` for the components, `useLiquefyPortalContainer` for the portal —
 * and advertising those as importable is how an agent ends up writing an import
 * that does not resolve.
 */
export const readPublicApi = async () => {
  const source = await readFile(new URL('index.ts', srcDir), 'utf8')
  const byFile = new Map()

  for (const match of source.matchAll(/export \{([^}]*)\} from '\.\/([^']+)'/g)) {
    const [, block, file] = match
    const entry = byFile.get(file) ?? { types: [], values: [] }
    for (const raw of block.split(',')) {
      const name = raw.trim()
      if (!name) continue
      if (name.startsWith('type ')) entry.types.push(name.slice(5).trim())
      else entry.values.push(name)
    }
    byFile.set(file, entry)
  }

  return byFile
}

/** Bare module specifiers a file imports, split into local siblings and packages. */
const readImports = (source) => {
  const local = new Set()
  const packages = new Set()
  for (const match of source.matchAll(/from '([^']+)'/g)) {
    const specifier = match[1]
    if (specifier.startsWith('./')) {
      local.add(specifier.slice(2))
      continue
    }
    if (hostPackages.includes(specifier)) continue
    const owner = runtimePackages.find((name) => specifier === name || specifier.startsWith(`${name}/`))
    if (owner) packages.add(owner)
  }
  return { local: [...local].sort(), packages: [...packages].sort() }
}

/** Turns sibling imports into the aliases the files will actually sit behind. */
const rewriteImports = (source, kindOf) => source.replace(
  /from '\.\/([^']+)'/g,
  (whole, name) => {
    const kind = kindOf(name)
    return kind ? `from '${aliasFor[kind]}/${name}'` : whole
  },
)

/**
 * Maps each exported component name to its slug on the docs site, which is short
 * (`dialog`) rather than the file name (`liquid-dialog`), and sometimes splits one
 * file across several pages (LiquidProgress and LiquidSpinner).
 */
export const readDocsSlugs = async () => {
  const docsDir = new URL('../apps/docs/src/docs/', import.meta.url)
  const files = (await readdir(docsDir)).filter((file) => file.startsWith('catalog-'))
  const slugs = new Map()

  for (const file of files) {
    const source = await readFile(new URL(file, docsDir), 'utf8')
    // Each entry declares its import line first and its slug a few keys later.
    for (const match of source.matchAll(
      /importLine: "import \{ ([^}]+) \} from '@liquefy-ui\/react'"[\s\S]*?\n\s*slug: '([^']+)'/g,
    )) {
      const [, names, slug] = match
      for (const name of names.split(',').map((entry) => entry.trim())) {
        if (!slugs.has(name)) slugs.set(name, slug)
      }
    }
  }

  return slugs
}

/**
 * The design tokens, read out of the stylesheet so the docs and the MCP server
 * can never drift from what the CSS actually declares.
 */
export const readTokens = async () => {
  const css = await readFile(new URL('styles.css', srcDir), 'utf8')
  const scopes = [
    { label: 'root', selector: ':root' },
    { label: 'dark', selector: '.lq-provider' },
    { label: 'light', selector: ".lq-provider[data-liquid-theme='light']" },
  ]

  return scopes.map(({ label, selector }) => {
    // First block only: later blocks re-declare the same names for other purposes.
    const start = css.indexOf(`${selector} {`)
    const end = start === -1 ? -1 : css.indexOf('\n  }', start)
    const body = start === -1 || end === -1 ? '' : css.slice(start, end)
    const tokens = [...body.matchAll(/^\s*(--lq-[a-z0-9-]+):\s*([^;]+);/gm)]
      .map(([, name, value]) => ({ name, value: value.trim() }))
    return { label, tokens }
  })
}

/**
 * The icon set, from its entry point. It is a separate package with 40-odd
 * exports, and leaving it out of the generated files means an agent either
 * invents icon names or reaches for a second icon library.
 */
export const readIcons = async () => {
  const source = await readFile(iconsEntry, 'utf8')
  const names = [...source.matchAll(/^export const ([A-Za-z0-9_]+Icon)\b/gm)].map(([, name]) => name)
  const props = readTypeDeclarations(source).find((declaration) => declaration.name === 'IconProps')
  return { names: names.sort(), propsDeclaration: props?.text }
}

/** The public surface of @liquefy-ui/core: the engine behind the components. */
export const readCoreApi = async () => {
  const source = await readFile(coreEntry, 'utf8')
  const values = []
  const types = []

  for (const match of source.matchAll(/export (?:type )?\{([^}]*)\} from/g)) {
    const isTypeBlock = match[0].startsWith('export type')
    for (const raw of match[1].split(',')) {
      const name = raw.trim()
      if (!name) continue
      if (isTypeBlock || name.startsWith('type ')) types.push(name.replace(/^type /, ''))
      else values.push(name)
    }
  }

  return { types: types.sort(), values: values.sort() }
}

export const readCatalog = async () => {
  const { dependencies } = JSON.parse(await readFile(reactPackageJson, 'utf8'))
  const publicApi = await readPublicApi()
  const files = (await readdir(srcDir))
    .filter((file) => (file.endsWith('.ts') || file.endsWith('.tsx')) && file !== 'index.ts')
    .sort()

  const kindOf = (slug) => {
    const file = files.find((candidate) => candidate.replace(/\.tsx?$/, '') === slug)
    return file ? kinds[file] ?? 'ui' : undefined
  }

  const entries = await Promise.all(files.map(async (file) => {
    const source = await readFile(new URL(file, srcDir), 'utf8')
    const slug = file.replace(/\.tsx?$/, '')
    const kind = kinds[file] ?? 'ui'
    const { local, packages } = readImports(source)
    const exports = readExports(source)
    // Only what the entry point re-exports can be imported from the package; the
    // rest is reachable through the registry, as copied source.
    const published = publicApi.get(slug) ?? { types: [], values: [] }
    const publicValues = exports.values.filter((name) => published.values.includes(name))
    const publicTypes = exports.types.filter((name) => published.types.includes(name))

    return {
      /** npm packages the copied file still needs, version-pinned from the workspace. */
      dependencies: packages.map((name) => {
        const range = name === '@liquefy-ui/core' ? '^0.1.0' : dependencies[name]
        return range ? `${name}@${range}` : name
      }),
      description: descriptions[slug] ?? `${titleCase(slug)} for liquefy-ui.`,
      file,
      kind,
      registryType: registryTypeFor[kind],
      /** Sibling modules that have to be installed alongside this one. */
      registryDependencies: local.filter((name) => kindOf(name) !== undefined).sort(),
      slug,
      /** The source, with sibling imports pointed at the shadcn aliases. */
      source: rewriteImports(source, kindOf),
      /** True when at least one name is importable from '@liquefy-ui/react'. */
      isPublic: publicValues.length + publicTypes.length > 0,
      /** Exported by the file but not by the package entry point. */
      internalValues: exports.values.filter((name) => !published.values.includes(name)),
      publicTypes,
      publicValues,
      title: publicValues[0] ?? exports.values[0] ?? titleCase(slug),
      // Advertised type declarations are the published ones; the others exist for
      // the tests and for copied source.
      typeDeclarations: readTypeDeclarations(source)
        .filter((declaration) => published.types.includes(declaration.name)),
      types: exports.types,
      values: exports.values,
    }
  }))

  return { entries, reactDependencies: dependencies }
}
