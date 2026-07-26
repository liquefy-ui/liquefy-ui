import { describe, expect, it } from 'vitest'
import { catalog } from '../src/catalog.generated'
import { handleMessage, tools } from '../src/server'

// The transport is trivial; what matters is that the protocol answers are shaped
// the way a client expects, and that the answers come from the real API surface
// rather than from prose someone has to remember to update.

type Message = { error?: { code: number; message: string }; id: number | string | null; result?: any }

const send = (method: string, params?: Record<string, unknown>, id: number | null = 1): Message[] => {
  const sent: Message[] = []
  handleMessage(
    { jsonrpc: '2.0', method, ...(id === null ? {} : { id }), ...(params ? { params } : {}) },
    (message) => sent.push(message as Message),
  )
  return sent
}

const call = (name: string, args: Record<string, unknown> = {}) => {
  const [message] = send('tools/call', { arguments: args, name })
  return { isError: message?.result?.isError === true, text: String(message?.result?.content?.[0]?.text ?? '') }
}

describe('mcp server', () => {
  it('completes the initialize handshake and echoes a supported protocol version', () => {
    const [message] = send('initialize', { protocolVersion: '2025-03-26' })
    expect(message?.result?.protocolVersion).toBe('2025-03-26')
    expect(message?.result?.serverInfo?.name).toBe('@liquefy-ui/mcp')
    expect(message?.result?.capabilities?.tools).toBeDefined()
  })

  it('falls back to the current revision when the client asks for an unknown one', () => {
    const [message] = send('initialize', { protocolVersion: '1999-01-01' })
    expect(message?.result?.protocolVersion).toBe('2025-11-25')
  })

  // A notification is a request with no id. Answering one puts a response on the
  // wire that the client never asked for, and `ping` and `tools/list` used to.
  it('never answers a notification, whichever method it names', () => {
    for (const method of ['notifications/initialized', 'ping', 'tools/list', 'initialize', 'nope/nope']) {
      expect(send(method, undefined, null), method).toEqual([])
    }
  })

  it('answers those same methods when they carry an id', () => {
    expect(send('ping')).toHaveLength(1)
    expect(send('tools/list')).toHaveLength(1)
  })

  it('rejects an unknown method as a protocol error', () => {
    const [message] = send('nope/nope')
    expect(message?.error?.code).toBe(-32601)
  })

  it('advertises every tool with a description and a schema', () => {
    const [message] = send('tools/list')
    expect(message?.result?.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'list_components',
      'get_component',
      'search_components',
      'get_component_source',
      'get_tokens',
      'list_icons',
      'get_core_api',
      'get_conventions',
    ])
    for (const tool of tools) {
      expect(tool.description.length, tool.name).toBeGreaterThan(40)
      expect(tool.inputSchema.type, tool.name).toBe('object')
    }
  })

  it('resolves a component by export name and by file slug', () => {
    const byExport = call('get_component', { name: 'LiquidButton' })
    const bySlug = call('get_component', { name: 'liquid-button' })
    expect(byExport.text).toBe(bySlug.text)
    expect(byExport.text).toContain('export type LiquidButtonProps')
    expect(byExport.text).toContain("import { LiquidButton } from '@liquefy-ui/react'")
  })

  it('answers a typo with the nearest names instead of nothing', () => {
    const result = call('get_component', { name: 'Buton' })
    expect(result.isError).toBe(true)
    expect(result.text).toContain('LiquidButton')
  })

  it('reports a bad argument as a tool error, not a protocol error', () => {
    const [message] = send('tools/call', { arguments: {}, name: 'get_component' })
    expect(message?.error).toBeUndefined()
    expect(message?.result?.isError).toBe(true)
  })

  it('searches type declarations, not just names', () => {
    const result = call('search_components', { query: 'onValueChange' })
    expect(result.text).toContain('LiquidSelect')
    expect(result.text).toContain('LiquidTabs')
  })

  it('says so plainly when a search finds nothing', () => {
    expect(call('search_components', { query: 'zzzznope' }).text).toContain('Nothing matches')
  })

  // The catalog used to advertise every `export` in every file, including the
  // ones the package entry point does not re-export.
  it('only advertises names that are importable from the package root', () => {
    const glyphs = call('get_component', { name: 'CheckGlyph' })
    expect(glyphs.isError).toBe(false)
    expect(glyphs.text).toContain('NOT exported')
    expect(glyphs.text).not.toContain("import { CheckGlyph } from '@liquefy-ui/react'")

    for (const component of catalog.components) {
      for (const exported of component.exports) {
        expect(component.importable, `${component.name}:${exported}`).toBe(true)
      }
    }

    const internals = catalog.components.flatMap((component) => component.internalExports)
    expect(internals).toContain('compileLiquidStyles')
    expect(internals).toContain('useLiquefyPortalContainer')
  })

  it('keeps multi-line type declarations whole', () => {
    const result = call('get_component', { name: 'useLiquidStyles' })
    // A union spread over several lines, and a generic — both were dropped by the
    // declaration parser before.
    expect(result.text).toContain('export type LiquidStyleState =')
    expect(result.text).toContain("| '_focusVisible'")
    expect(result.text).toContain('export type LiquidResponsive<T>')
  })

  it('hands back source with the sibling imports already rewritten', () => {
    const result = call('get_component_source', { name: 'LiquidButton' })
    expect(result.text).toContain("from '@/lib/styles-prop'")
    expect(result.text).not.toContain("from './")
    expect(result.text).toContain('use client')
  })

  it('serves the real token values for a named theme', () => {
    const result = call('get_tokens', { theme: 'light' })
    expect(result.text).toContain('--lq-foreground')
    expect(result.text).not.toContain('## dark')
  })

  it('states the conventions that are easy to get wrong', () => {
    const result = call('get_conventions')
    expect(result.text).toContain('use client')
    expect(result.text).toContain('LiquefyProvider')
    // The wrong-prop trap the docs site itself once shipped in its quick start.
    expect(result.text).toContain('no `variant` prop')
  })

  // An agent that cannot ask for the icon names invents them, or imports a second
  // icon library halfway through a file.
  it('answers for the icon set and the engine, which are separate packages', () => {
    const icons = call('list_icons', { query: 'arrow' })
    expect(icons.text).toContain('ArrowRightIcon')
    expect(icons.text).toContain("from '@liquefy-ui/icons'")
    expect(call('list_icons').text).toContain(`of ${catalog.icons.names.length} icons`)
    expect(call('list_icons', { query: 'zzz' }).text).toContain('No icon matches')

    const core = call('get_core_api')
    expect(core.text).toContain('attachLiquidMotion')
    expect(core.text).toContain('SpringValue')
    expect(core.text).toContain("from '@liquefy-ui/core'")
  })

  it('covers every component in the catalog', () => {
    const listed = call('list_components').text
    for (const component of catalog.components) {
      expect(listed, component.name).toContain(component.name)
    }
  })
})
