---
"@liquefy-ui/react": patch
---

Let a `LiquidSelect` trigger shrink below 200px when its container is narrower
than that. The flat `min-width: 200px` could not be honoured in a narrow column —
three filter selects side by side on a phone — and the trigger overflowed instead,
which reads as neighbouring selects overlapping rather than as a width problem.
Capping the floor with `min(200px, 100%)` leaves every container 200px or wider
measuring exactly as before.
