---
"@liquefy-ui/react": minor
---

`LiquidGauge`: a ring meter with the reading in its middle, for a level that
goes up and down — memory, CPU, a disk filling up.

It is a `meter`, not a `progressbar`: a screen reader hears "Memory, 25%" rather
than a task heading for done. `max` sets what fills the ring and readings past
either end are clamped. The arc starts at twelve o'clock, the reading scales with
`size`, `tint` colors the arc (the number keeps the text color, so a
warning yellow stays readable), and `children` replaces the percentage when the
middle should say something else (`384 GB`). An empty gauge draws no arc, since a
round cap would leave a dot at zero.

Until now this took a determinate `LiquidSpinner` with a number absolutely
positioned over it.
