---
"@liquefy-ui/lab": minor
---

`MagneticActions`: a row of round glass action buttons that reach for the pointer.
The button nearest a cursor coming close is drawn toward it and its neighbours a
little, buttons drawn close enough melt together through one `GlassMerge` surface,
and when the pointer goes they spring back past their places and settle. A press
squashes a button with the same jelly as `LiquidIconButton`. Behaviour is Base UI's
toolbar — one tab stop, the arrow keys along the row — and focus moves nothing.
`strength`, `reach`, `spacing`, `gap`, `size` and `orientation` tune it. The motion is
exported on its own as `MagneticMotion`, with `magneticPull` and `magneticLayout`.
