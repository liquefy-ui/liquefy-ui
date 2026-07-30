---
"@liquefy-ui/mcp": patch
---

Carry the `mcpName` the official MCP Registry verifies ownership with, and the
`server.json` that describes the server to it. The registry stores metadata only
and checks it against the published package, so the name has to ship inside
`package.json` before the server can be registered at all — a release is the only
way it gets there.
