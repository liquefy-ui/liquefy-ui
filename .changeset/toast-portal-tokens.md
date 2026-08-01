---
"@liquefy-ui/react": patch
---

Render the toast viewport into the provider's portal node instead of the document
body, so a toast keeps its fill and shadow. The theme tokens are declared on
`.lq-provider`, and a subtree portaled outside it reads none of them:
`--lq-solid-fill` resolves to nothing, the `color-mix()` built on it is invalid,
and the material disappears. Dialog, Drawer, Select and Menu already portal into
that node for this exact reason. The body stays the fallback for a
`LiquidToastProvider` mounted without a `LiquefyProvider` above it — which also
means the fix only reaches a toast provider nested inside one, so that is now what
the documented usage shows. A toast's `z-index` is scoped to whatever stacking
context holds the provider, the same as Dialog's and Drawer's already are.
