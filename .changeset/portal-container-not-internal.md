---
"@liquefy-ui/mcp": patch
---

`get_conventions` no longer lists `useLiquefyPortalContainer` among the names
that are not exported from `@liquefy-ui/react`. `@liquefy-ui/react` exports it
now, and `get_component` already said so; the conventions contradicted it.
