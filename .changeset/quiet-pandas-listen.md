---
"@liquefy-ui/react": patch
---

Scroll a bottom `LiquidDrawer` whose content is taller than the panel. The panel
is sized by `max-height`, so the surface's `height: 100%` resolved against an
`auto` parent and grew to its content instead: nothing scrolled, and the end of a
tall panel — a form's submit button, say — sat past the bottom of the screen with
no way to reach it.
