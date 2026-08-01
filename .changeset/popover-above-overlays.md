---
"@liquefy-ui/react": patch
---

Raise the popover layer above the dialog and drawer, so a `LiquidSelect`,
`LiquidMenu` or `LiquidTooltip` opened from inside one is visible. Every overlay
portals into the provider's node as a sibling of the others, so the z-index is
the only thing ordering them — and a select popup at 60 landed under a drawer
panel at 80. The popup was fully rendered and interactive, just painted
underneath, which reads as a pulldown that does nothing when tapped. Popovers now
sit at 85 and tooltips at 88, still below the toast viewport at 90, and the whole
ladder is written down next to the popover base so the next edit keeps it.
