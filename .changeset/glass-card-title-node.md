---
"@liquefy-ui/react": patch
---

Accept a node as the `title` of `GlassCard`, `LiquidAlert` and
`LiquidAccordionItem`, which all three always rendered and the documented props
tables always promised, but the types never allowed. `HTMLAttributes` declares
`title` as the tooltip string, and intersecting that with `ReactNode` leaves
`string` — so `title={<span …>}` failed to typecheck even though it lands in an
`<h3>`, a `<strong>` or an accordion header. `LiquidDialog` and `LiquidDrawer`
already omit the attribute for this reason; the other three now do too.
