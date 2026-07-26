#!/usr/bin/env node
import { handleMessage } from './server'

// stdio transport: one JSON-RPC message per line, in and out. Nothing may be
// written to stdout except protocol messages, or the stream is corrupt — which is
// why there is no logging here.
const write = (message: unknown) => {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  let newline = buffer.indexOf('\n')
  while (newline !== -1) {
    const line = buffer.slice(0, newline).trim()
    buffer = buffer.slice(newline + 1)
    if (line !== '') {
      try {
        handleMessage(JSON.parse(line), write)
      } catch {
        write({ error: { code: -32700, message: 'Parse error: expected one JSON-RPC message per line.' }, id: null, jsonrpc: '2.0' })
      }
    }
    newline = buffer.indexOf('\n')
  }
})

process.stdin.on('end', () => process.exit(0))
