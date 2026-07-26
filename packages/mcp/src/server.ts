import { catalog } from './catalog.generated'
import type { McpComponent } from './types'

/**
 * A Model Context Protocol server for liquefy-ui, speaking JSON-RPC 2.0 over
 * newline-delimited stdio. No SDK on purpose: the whole payload is a baked-in
 * catalog and a handful of lookups, and @liquefy-ui/core is dependency-free for
 * the same reason.
 *
 * The point of shipping this at all: agents write most of the code that will use
 * this library, and its API is unusual enough (the `styles` prop, LiquefyProvider,
 * no `variant` on Button) that pattern-matching invents props that do not exist.
 * Answering from the real signatures is cheaper than correcting hallucinations.
 */

const SERVER_NAME = '@liquefy-ui/mcp'
const SERVER_VERSION = '0.1.0'
const LATEST_PROTOCOL = '2025-11-25'
// A tools-only server behaves identically across these revisions, so an older
// client keeps working: initialize echoes whichever of them it asked for.
const SUPPORTED_PROTOCOLS = new Set([LATEST_PROTOCOL, '2025-06-18', '2025-03-26', '2024-11-05'])

type JsonRpcId = number | string | null

type JsonRpcRequest = {
  id?: JsonRpcId
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

type ToolDefinition = {
  description: string
  inputSchema: Record<string, unknown>
  name: string
  run: (args: Record<string, unknown>) => string
}

const componentByName = new Map<string, McpComponent>()
for (const component of catalog.components) {
  componentByName.set(component.name.toLowerCase(), component)
  // Agents ask for `LiquidButton` far more often than `liquid-button`. Internal
  // names resolve too, so asking about one gets told that it is internal rather
  // than a bare "no such component".
  for (const exported of [...component.exports, ...component.internalExports]) {
    componentByName.set(exported.toLowerCase(), component)
  }
}

/** Levenshtein distance, single-row so it stays cheap over ~90 export names. */
const editDistance = (a: string, b: string): number => {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i]
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(
        (row[j] ?? 0) + 1,
        (next[j - 1] ?? 0) + 1,
        (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    row = next
  }
  return row[b.length] ?? 0
}

/**
 * A typo should cost one more tool call, not send the model back to guessing.
 * "Buton" has to reach LiquidButton, so candidates are compared both in full and
 * with the Liquid/Glass/use prefix stripped — that prefix is what gets left off.
 */
const suggest = (query: string): string[] => catalog.components
  .flatMap((component) => component.exports)
  .map((exported) => {
    const lower = exported.toLowerCase()
    const bare = lower.replace(/^(liquid|glass|use)/, '')
    if (lower.includes(query) || bare.includes(query)) return { distance: 0, exported }
    return { distance: Math.min(editDistance(lower, query), editDistance(bare, query)), exported }
  })
  .filter((candidate) => candidate.distance <= 2)
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 5)
  .map((candidate) => candidate.exported)

const findComponent = (name: unknown): McpComponent => {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('`name` is required, e.g. "LiquidButton" or "liquid-button".')
  }
  const query = name.trim().toLowerCase()
  const found = componentByName.get(query)
  if (found) return found

  const suggestions = suggest(query)
  throw new Error(
    `No component named "${name}".${suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : ' Call list_components to see them all.'}`,
  )
}

const nameOf = (component: McpComponent) =>
  (component.importable ? component.exports.join(', ') : component.name)

const summarise = (component: McpComponent) => [
  `${nameOf(component)} (${component.name}, ${component.kind}${component.importable ? '' : ', internal'})`,
  `  ${component.description}`,
].join('\n')

const describe = (component: McpComponent) => [
  `# ${nameOf(component)}`,
  '',
  component.description,
  '',
  `Kind: ${component.kind}`,
  ...(component.importable
    ? [`Import: import { ${component.exports.join(', ')} } from '@liquefy-ui/react'`]
    : [
      `Internal: ${component.internalExports.join(', ')} are NOT exported from '@liquefy-ui/react'.`,
      'This module ships inside the components that use it; install it as copied source instead.',
    ]),
  `Docs: ${component.docsUrl}`,
  `Plain text: ${component.textUrl}`,
  `Copy the source: npx shadcn@latest add ${component.registryUrl}`,
  ...(component.dependencies.length > 0 ? [`npm dependencies: ${component.dependencies.join(', ')}`] : []),
  '',
  ...(component.types.length > 0 ? ['## Types', '', '```ts', component.types.join('\n\n'), '```'] : ['No exported types.']),
].join('\n')

export const tools: ToolDefinition[] = [
  {
    description:
      'List every component, hook and internal module in liquefy-ui with a one-line description. '
      + 'Start here when you do not know what the library contains.',
    inputSchema: {
      properties: {
        kind: {
          description: 'Narrow to components ("ui"), hooks, or shared internals ("lib").',
          enum: ['ui', 'hook', 'lib'],
          type: 'string',
        },
      },
      type: 'object',
    },
    name: 'list_components',
    run: (args) => {
      const kind = args.kind
      const matches = catalog.components.filter((component) => !kind || component.kind === kind)
      return [
        `${matches.length} entries${kind ? ` of kind "${String(kind)}"` : ''}:`,
        '',
        ...matches.map(summarise),
      ].join('\n')
    },
  },
  {
    description:
      'Get the real API of one component: its exported names, every exported type declaration verbatim, '
      + 'the import line, and the docs and registry URLs. Use this instead of guessing prop names.',
    inputSchema: {
      properties: {
        name: {
          description: 'An export name like "LiquidButton" or a file slug like "liquid-button".',
          type: 'string',
        },
      },
      required: ['name'],
      type: 'object',
    },
    name: 'get_component',
    run: (args) => describe(findComponent(args.name)),
  },
  {
    description:
      'Free-text search across component names, descriptions and type declarations. '
      + 'Use it to answer "is there a component for X" or "which component has prop Y".',
    inputSchema: {
      properties: {
        query: { description: 'Words to look for, e.g. "toast", "onValueChange", "glass".', type: 'string' },
      },
      required: ['query'],
      type: 'object',
    },
    name: 'search_components',
    run: (args) => {
      const query = String(args.query ?? '').trim().toLowerCase()
      if (query === '') throw new Error('`query` is required.')

      const matches = catalog.components.filter((component) =>
        component.name.includes(query)
        || component.exports.some((exported) => exported.toLowerCase().includes(query))
        || component.description.toLowerCase().includes(query)
        || component.types.some((type) => type.toLowerCase().includes(query)))

      if (matches.length === 0) {
        return `Nothing matches "${query}". Call list_components for the full set.`
      }
      return [`${matches.length} match${matches.length === 1 ? '' : 'es'} for "${query}":`, '', ...matches.map(summarise)].join('\n')
    },
  },
  {
    description:
      'Get the copy-paste source of a component, with imports already rewritten to shadcn aliases '
      + '(@/components/ui, @/lib, @/hooks). Use this when the user wants to own and edit the code.',
    inputSchema: {
      properties: {
        name: { description: 'An export name or file slug.', type: 'string' },
      },
      required: ['name'],
      type: 'object',
    },
    name: 'get_component_source',
    run: (args) => {
      const component = findComponent(args.name)
      return [
        `# ${component.name} source`,
        '',
        `Also install: ${component.registryDependencies.join(', ')}`,
        ...(component.dependencies.length > 0 ? [`npm: ${component.dependencies.join(', ')}`] : []),
        "The registry writes the 'use client' directive into every file it copies, so this source",
        'is ready for an RSC app as it stands.',
        '',
        '```tsx',
        component.source.trimEnd(),
        '```',
      ].join('\n')
    },
  },
  {
    description: 'List the --lq-* design tokens and their real values, per theme scope.',
    inputSchema: {
      properties: {
        theme: {
          description: 'Which scope to read: global defaults, or the dark or light theme block.',
          enum: ['root', 'dark', 'light'],
          type: 'string',
        },
      },
      type: 'object',
    },
    name: 'get_tokens',
    run: (args) => {
      const theme = args.theme
      const scopes = catalog.tokens.filter((scope) => !theme || scope.label === theme)
      if (scopes.length === 0) throw new Error(`Unknown theme "${String(theme)}". Use root, dark or light.`)
      return scopes
        .map((scope) => [`## ${scope.label}`, '', ...scope.tokens.map((token) => `${token.name}: ${token.value};`)].join('\n'))
        .join('\n\n')
    },
  },
  {
    description:
      'List the icons in @liquefy-ui/icons by name, with their props. Use it before reaching for another '
      + 'icon library, and to check a name exists rather than guessing it.',
    inputSchema: {
      properties: {
        query: { description: 'Optional filter, e.g. "arrow" or "check".', type: 'string' },
      },
      type: 'object',
    },
    name: 'list_icons',
    run: (args) => {
      const query = String(args.query ?? '').trim().toLowerCase()
      const names = query
        ? catalog.icons.names.filter((name) => name.toLowerCase().includes(query))
        : catalog.icons.names
      if (names.length === 0) {
        return `No icon matches "${query}". ${catalog.icons.names.length} icons exist; call list_icons with no query to see them.`
      }
      return [
        `${names.length} of ${catalog.icons.names.length} icons${query ? ` matching "${query}"` : ''}:`,
        '',
        names.join(', '),
        '',
        "Import: import { BellIcon, HeartIcon } from '@liquefy-ui/icons'",
        ...(catalog.icons.propsDeclaration ? ['', '```ts', catalog.icons.propsDeclaration, '```'] : []),
        'An icon without an aria-label is marked aria-hidden, which is what you want inside a labelled control.',
      ].join('\n')
    },
  },
  {
    description:
      'The public API of @liquefy-ui/core, the dependency-free engine under the components: the WebGL '
      + 'renderer, the bezel lens, the spring integrator and the tokens. Use it to drive the physics on '
      + 'an element the React components do not cover.',
    inputSchema: { properties: {}, type: 'object' },
    name: 'get_core_api',
    run: () => [
      '# @liquefy-ui/core',
      '',
      "Import: import { attachLiquidMotion, SpringValue } from '@liquefy-ui/core'",
      '',
      `Values: ${catalog.core.values.join(', ')}`,
      '',
      `Types: ${catalog.core.types.join(', ')}`,
      '',
      'attachLiquidMotion(element, canvas, options) returns a controller with pulse(), setDisabled() '
      + 'and destroy(). It has no React dependency.',
    ].join('\n'),
  },
  {
    description:
      'The conventions of this library that are easy to get wrong: the client boundary, the required '
      + 'provider, the styles prop, which props do not exist. Read this before writing liquefy-ui code.',
    inputSchema: { properties: {}, type: 'object' },
    name: 'get_conventions',
    run: () => catalog.conventions.map((rule, index) => `${index + 1}. ${rule}`).join('\n\n'),
  },
]

const toolByName = new Map(tools.map((tool) => [tool.name, tool]))

export const handleMessage = (request: JsonRpcRequest, write: (message: unknown) => void) => {
  const { id, method, params = {} } = request
  // A notification is a request with no id, and MCP forbids a null one — either
  // way there is nobody to answer, so the whole message is dropped rather than
  // each branch remembering not to reply.
  if (id === undefined || id === null) return

  const respond = (result: unknown) => write({ id, jsonrpc: '2.0', result })
  const fail = (code: number, message: string) =>
    write({ error: { code, message }, id, jsonrpc: '2.0' })

  switch (method) {
    case 'initialize': {
      const requested = params.protocolVersion
      const protocolVersion = typeof requested === 'string' && SUPPORTED_PROTOCOLS.has(requested)
        ? requested
        : LATEST_PROTOCOL
      respond({
        capabilities: { tools: {} },
        instructions:
          'liquefy-ui is a Liquid Glass React component library. Call get_conventions before writing code '
          + 'with it, and get_component for real prop signatures rather than guessing.',
        protocolVersion,
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      })
      return
    }
    case 'ping':
      respond({})
      return
    case 'tools/list':
      respond({
        tools: tools.map(({ description, inputSchema, name }) => ({ description, inputSchema, name })),
      })
      return
    case 'tools/call': {
      const name = String(params.name ?? '')
      const tool = toolByName.get(name)
      if (!tool) {
        fail(-32602, `Unknown tool "${name}".`)
        return
      }
      try {
        const args = (params.arguments ?? {}) as Record<string, unknown>
        respond({ content: [{ text: tool.run(args), type: 'text' }] })
      } catch (error) {
        // A bad argument is the model's mistake to correct, so it comes back as a
        // tool result rather than a protocol error.
        respond({
          content: [{ text: error instanceof Error ? error.message : String(error), type: 'text' }],
          isError: true,
        })
      }
      return
    }
    default:
      fail(-32601, `Unknown method "${method}".`)
  }
}
