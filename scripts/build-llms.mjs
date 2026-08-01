import { mkdir, rm, writeFile } from 'node:fs/promises'
import {
  HOMEPAGE,
  addCommand,
  readCatalog,
  readCoreApi,
  readDocsSlugs,
  readIcons,
  readTokens,
} from './component-catalog.mjs'

/**
 * Writes llms.txt, llms-full.txt and one plain-text page per component.
 *
 * The point is not SEO, it is that coding agents write most of the code that will
 * ever use this library, and liquefy-ui's API is unusual enough (the `styles`
 * prop, LiquefyProvider's optics config, `LiquidX` naming) that an agent working
 * from pattern-matching will invent props that do not exist. These files give it
 * the real signatures.
 *
 * Structure follows llmstxt.org: an H1, a blockquote summary, then prose with no
 * headings, and only then H2 sections — each of which is a list of links. The
 * links have to be fetchable without JavaScript, which the docs site's hash
 * routes are not, so every component also gets a static Markdown page here.
 */

const outDir = new URL('../apps/docs/public/', import.meta.url)
const pagesDir = new URL('../apps/docs/public/llms/', import.meta.url)

const { entries } = await readCatalog()
const [docsSlugs, tokens, icons, core] = await Promise.all([
  readDocsSlugs(),
  readTokens(),
  readIcons(),
  readCoreApi(),
])

/** The docs site page for a file — a hash route, so for humans and browsers. */
const docsUrl = (entry) => {
  const slug = entry.publicValues.map((name) => docsSlugs.get(name)).find(Boolean)
  return slug ? `${HOMEPAGE}/#/components/${slug}` : `${HOMEPAGE}/#/components`
}

/** The static page below, which any fetcher can read. */
const textUrl = (entry) => `${HOMEPAGE}/llms/${entry.slug}.md`

const components = entries.filter((entry) => entry.kind === 'ui')
const plumbing = entries.filter((entry) => entry.kind !== 'ui')

/** What an entry is called: its public exports, or the file if none are public. */
const nameOf = (entry) => (entry.isPublic ? entry.publicValues.join(', ') : entry.slug)

const importLine = (entry) => (entry.isPublic
  ? `import { ${entry.publicValues.join(', ')} } from '@liquefy-ui/react'`
  : undefined)

const INSTALL = `\`\`\`bash
pnpm add @liquefy-ui/react @liquefy-ui/core @liquefy-ui/icons
\`\`\`

\`\`\`tsx
import { LiquefyProvider, LiquidButton } from '@liquefy-ui/react'
import '@liquefy-ui/react/styles.css'
// Using Tailwind v4? Import '@liquefy-ui/react/tailwind.css' instead, before
// 'tailwindcss', and the bridged tokens plus the correct layer order come with it.

export function App() {
  return (
    <LiquefyProvider theme="system" tint="#8f8f8f">
      <LiquidButton>Create magic</LiquidButton>
    </LiquefyProvider>
  )
}
\`\`\`

Or copy the source into your own repo with the shadcn CLI. The namespace is
registered in shadcn's registry directory, so it resolves with nothing added to
\`components.json\`:

\`\`\`bash
${addCommand('liquid-button')}
\`\`\`

The \`${HOMEPAGE}/r/<name>.json\` URL that namespace resolves to still works, and
is what a CLI too old to know the directory needs.`

const RULES = `Rules an agent should not have to guess:

- Every component is a client component. The npm bundles carry a \`'use client'\`
  banner and so does every file in the registry, so importing from a Next.js
  server component is fine. Only your own handlers need a directive of their own.
- \`LiquefyProvider\` is required. Components read tint, spacing, motion and WebGL
  settings from it. A nested provider does **not** inherit from the one above it:
  unset props fall back to the library defaults, so name what you want to keep.
- There is no \`variant="primary"\` on \`LiquidButton\`. Buttons vary by \`size\`,
  \`tint\`, \`isLoading\`, \`lens\` and \`webgl\`. \`variant\` exists on \`LiquidSurface\`
  (\`'clear' | 'tinted'\`) and \`LiquidChip\`.
- Every component accepts a \`styles\` prop: CSS properties plus the \`p\`/\`px\`/\`mt\`/
  \`w\`/\`h\`/\`size\`/\`bg\`/\`radius\` shorthands on the \`--lq-space\` scale, \`$token\`
  references, responsive objects like \`{ base: 1, md: 3 }\`, and state keys such as
  \`_hover\`, \`_focusVisible\`, \`_disabled\`, \`_dark\`. There is no \`styled()\` and no
  \`sx\` prop.
- Everything is imported from the package root. There are no deep entry points,
  and names not listed below — \`compileLiquidStyles\`, \`useLiquefyPortalContainer\`,
  the internal glyphs — are not exported from it.
- Overlays (Dialog, Drawer, Menu, Select, Tooltip) are built on Base UI and render
  into a portal inside the provider. Focus handling, Escape and collision-aware
  placement are already done; do not re-implement them.
- Accordion headers are in the normal tab order rather than a roving composite,
  which is what WAI-ARIA specifies. Arrow keys do not move between them.
- The library does not read \`prefers-reduced-motion\` or
  \`prefers-reduced-transparency\` itself. Map them to the \`motion\` and
  \`transparency\` props if the product wants that.`

const componentLine = (entry) => `- [${nameOf(entry)}](${textUrl(entry)}): ${entry.description}`

const short = `# liquefy-ui

> A TypeScript UI library for React that renders highly transparent Liquid Glass
> through WebGL optics, physical springs and Base UI accessibility primitives.
> Independent open-source project, not affiliated with Apple Inc.

${INSTALL}

${RULES}

## Components

${components.map(componentLine).join('\n')}

## Provider and internals

${plumbing.map(componentLine).join('\n')}

## Icons

- [@liquefy-ui/icons](${HOMEPAGE}/llms/icons.md): ${icons.names.length} rounded 24×24 SVG icons, one named export each
- [Icon gallery](${HOMEPAGE}/#/components/icons): every icon, sized and stroked live

## Engine

- [@liquefy-ui/core](${HOMEPAGE}/llms/core.md): the dependency-free renderer, lens filter and spring engine

## Reference

- [llms-full.txt](${HOMEPAGE}/llms-full.txt): every exported type declaration and design token in one file
- [Registry index](${HOMEPAGE}/r/registry.json): shadcn-compatible items for copying source
- [MCP server](${HOMEPAGE}/llms/mcp.md): the same catalog as tool calls, for agents that call tools

## Optional

- [Component docs](${HOMEPAGE}/#/components): live demos and prop tables (JavaScript required)
- [Documentation](${HOMEPAGE}/#/docs): provider, theming, the styles prop, motion, frameworks, Tailwind, AI tooling, accessibility, performance, troubleshooting
- [Playground](${HOMEPAGE}/#/playground): every provider prop as a live control
`

/** One fetchable page per entry, which is what the links above point at. */
const componentPage = (entry) => [
  `# ${nameOf(entry)}`,
  '',
  `> ${entry.description}`,
  '',
  ...(entry.isPublic
    ? [`Import: \`${importLine(entry)}\``]
    : ['Not exported from `@liquefy-ui/react`. It ships inside the components that use it,',
      'and is installable as copied source from the registry item below.']),
  `Kind: ${entry.kind}`,
  `Docs: ${docsUrl(entry)}`,
  `Copy the source: \`${addCommand(entry.slug)}\``,
  ...(entry.dependencies.length > 0 ? [`npm dependencies: ${entry.dependencies.join(', ')}`] : []),
  '',
  ...(entry.typeDeclarations.length > 0
    ? ['## Types', '', 'Verbatim from source.', '', '```ts',
      entry.typeDeclarations.map((declaration) => declaration.text).join('\n\n'), '```', '']
    : ['No exported type declarations.', '']),
  '## Rules',
  '',
  RULES.split('\n').slice(2).join('\n'),
  '',
].join('\n')

const iconsPage = `# @liquefy-ui/icons

> ${icons.names.length} rounded 24×24 stroke icons as individual named exports, so a build
> that imports three icons ships three icons.

Import: \`import { BellIcon, HeartIcon } from '@liquefy-ui/icons'\`
Gallery: ${HOMEPAGE}/#/components/icons

## Props

\`\`\`ts
${icons.propsDeclaration ?? 'export type IconProps = SVGProps<SVGSVGElement>'}
\`\`\`

An icon with no \`aria-label\` is marked \`aria-hidden\`, which is what you want inside
an already-labelled control.

## Every export

${icons.names.map((name) => `- \`${name}\``).join('\n')}
`

const corePage = `# @liquefy-ui/core

> The engine the React components sit on: a WebGL renderer, the SVG bezel lens, a
> spring integrator, pointer tracking and the design tokens. No runtime dependencies.

Import: \`import { attachLiquidMotion, SpringValue } from '@liquefy-ui/core'\`

Use it directly when you want the physics or the optics on an element the React
components do not cover. \`attachLiquidMotion(element, canvas, options)\` returns a
controller with \`pulse()\`, \`setDisabled()\` and \`destroy()\`.

## Values

${core.values.map((name) => `- \`${name}\``).join('\n')}

## Types

${core.types.map((name) => `- \`${name}\``).join('\n')}
`

const mcpPage = `# @liquefy-ui/mcp

> A Model Context Protocol server that answers from this library's real exports.
> The catalog is generated from source at build time, so it cannot drift.

\`\`\`bash
claude mcp add liquefy-ui -- npx -y @liquefy-ui/mcp
\`\`\`

\`\`\`json
{ "mcpServers": { "liquefy-ui": { "command": "npx", "args": ["-y", "@liquefy-ui/mcp"] } } }
\`\`\`

## Tools

- \`get_conventions\`: the rules that are easy to get wrong. Call it first.
- \`list_components\`: everything in the library, filterable by \`ui\`, \`hook\` or \`lib\`.
- \`get_component\`: one component's exported names and every exported type declaration, verbatim.
- \`search_components\`: free text over names, descriptions and type declarations.
- \`get_component_source\`: the copy-paste source, with imports rewritten to shadcn aliases.
- \`get_tokens\`: the \`--lq-*\` tokens and their real values, per theme scope.
- \`list_icons\`: every icon in \`@liquefy-ui/icons\` by name, filterable.
- \`get_core_api\`: the public surface of \`@liquefy-ui/core\`, the engine underneath.
`

const entrySection = (entry) => [
  `### ${nameOf(entry)}`,
  '',
  entry.description,
  '',
  ...(entry.isPublic
    ? [`Import: \`${importLine(entry)}\``]
    : ['Internal: not exported from `@liquefy-ui/react`; available as copied source.']),
  `Page: ${textUrl(entry)}`,
  `Docs: ${docsUrl(entry)}`,
  `Registry: \`${addCommand(entry.slug)}\``,
  '',
  ...(entry.typeDeclarations.length > 0
    ? ['```ts', entry.typeDeclarations.map((declaration) => declaration.text).join('\n\n'), '```', '']
    : []),
].join('\n')

const tokenSection = (scope) => [
  `### ${scope.label === 'root' ? 'Global' : scope.label === 'dark' ? 'Dark theme' : 'Light theme'}`,
  '',
  '```css',
  ...scope.tokens.map((token) => `${token.name}: ${token.value};`),
  '```',
  '',
].join('\n')

const full = `# liquefy-ui — full reference

> Generated from source. Types are the real exported declarations, tokens are the
> real values in the shipped stylesheet, and only names exported from the package
> entry point are listed as importable.

${INSTALL}

${RULES}

## Components

${components.map(entrySection).join('\n')}
## Provider and internals

${plumbing.map(entrySection).join('\n')}
## Icons

${icons.names.map((name) => `\`${name}\``).join(', ')}

\`\`\`ts
${icons.propsDeclaration ?? ''}
\`\`\`

## Engine: @liquefy-ui/core

Values: ${core.values.map((name) => `\`${name}\``).join(', ')}

Types: ${core.types.map((name) => `\`${name}\``).join(', ')}

## Design tokens

${tokens.map(tokenSection).join('\n')}
## MCP server

Point a coding agent at the live API instead of these files:

\`\`\`bash
npx -y @liquefy-ui/mcp
\`\`\`

Tools: \`get_conventions\`, \`list_components\`, \`get_component\`, \`search_components\`,
\`get_component_source\`, \`get_tokens\`, \`list_icons\`, \`get_core_api\`.
`

await mkdir(outDir, { recursive: true })
await rm(pagesDir, { force: true, recursive: true })
await mkdir(pagesDir, { recursive: true })

await Promise.all([
  writeFile(new URL('llms.txt', outDir), short),
  writeFile(new URL('llms-full.txt', outDir), full),
  writeFile(new URL('icons.md', pagesDir), iconsPage),
  writeFile(new URL('core.md', pagesDir), corePage),
  writeFile(new URL('mcp.md', pagesDir), mcpPage),
  ...entries.map((entry) => writeFile(new URL(`${entry.slug}.md`, pagesDir), componentPage(entry))),
])

console.log(
  `llms.txt (${short.length} B), llms-full.txt (${full.length} B) and ${entries.length + 3} pages `
  + 'written → apps/docs/public/',
)
