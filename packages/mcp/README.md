# @liquefy-ui/mcp

A Model Context Protocol server that answers questions about liquefy-ui from its
real API surface, so a coding agent stops inventing props.

```bash
# Claude Code
claude mcp add liquefy-ui -- npx -y @liquefy-ui/mcp
```

```json
{
  "mcpServers": {
    "liquefy-ui": { "command": "npx", "args": ["-y", "@liquefy-ui/mcp"] }
  }
}
```

| Tool | Answers |
| --- | --- |
| `get_conventions` | The rules that are easy to get wrong: the client boundary, the required provider, which props do not exist |
| `list_components` | Everything in the library, filterable by `ui` / `hook` / `lib` |
| `get_component` | One component's exports and every exported type declaration, verbatim |
| `search_components` | Free text over names, descriptions and type declarations |
| `get_component_source` | The copy-paste source, imports already rewritten to shadcn aliases |
| `get_tokens` | The `--lq-*` tokens and their real values, per theme scope |

Docs: <https://liquefy-ui.com/#/guides/ai-tooling>

The catalog is generated from the library source at build time, so it cannot drift
from what the package ships. The server has no runtime dependencies and never
touches the network.
