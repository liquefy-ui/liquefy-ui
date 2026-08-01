---
"@liquefy-ui/react": patch
---

Let a `LiquidSelect` trigger shrink below 200px when its container is narrower
than that. The flat `min-width: 200px` could not be honoured in a narrow column —
three filter selects side by side on a phone — and the trigger overflowed instead,
which reads as neighbouring selects overlapping rather than as a width problem.
Capping the floor with `min(200px, 100%)` leaves every container with a definite
width of 200px or more measuring exactly as before. A container sized by its own
content — `width: fit-content`, a table cell — has no width for the percentage to
resolve against, so a select there now measures its content instead of 200px.
