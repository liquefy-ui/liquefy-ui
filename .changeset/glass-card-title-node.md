---
"@liquefy-ui/react": patch
---

Accept a node as `GlassCard`'s `title`, which the component always rendered but
the type never allowed. `HTMLAttributes` declares `title` as the tooltip string,
and intersecting that with `ReactNode` leaves `string` — so `title={<span …>}`
failed to typecheck even though it lands in an `<h3>`. `LiquidDialog` and
`LiquidDrawer` already omit the attribute for this reason; `GlassCard` now does
too.
