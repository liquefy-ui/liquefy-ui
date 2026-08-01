---
"@liquefy-ui/mcp": patch
---

Tell agents to copy source with `npx shadcn@latest add @liquefy-ui/<name>` rather
than the item URL. The namespace now sits in shadcn's own registry directory, so
it resolves with nothing added to a project's `components.json`. Each catalog
entry gains `registryItem` alongside the existing `registryUrl`, which stays as
the JSON the namespace resolves to.
