---
"@liquefy-ui/lab": minor
---

Two moving backdrops to lay glass over.

- **`FluidBackdrop`**: water with colour poured in, simulated on the GPU with Jos
  Stam's stable fluids. A pointer anywhere over it stirs it — read from the window, so
  it stirs through the glass and buttons on top without taking their events — and when
  nobody does, it slowly stirs itself. `pressureIterations`, `resolution`,
  `dyeResolution` and `maxPixelRatio` trade detail for cost; `colors`, `tint`,
  `background`, `speed`, `stir`, `vorticity` and `fade` set the look. Without float
  render targets it carries the colour on vortices instead; without WebGL2 it is still
  CSS pools of the same colours.
- **`MeshGradient`**: a SwiftUI-style mesh gradient — a colour on each point of a grid,
  blended between them, with the points drifting so the colour flows. `columns`, `rows`,
  `colors`, `speed` and `wander`. WebGL2, else a small 2D canvas scaled up, else CSS.
  The drift is exported on its own as `MeshMotion`.

Both stop off screen and in a background tab, run on a clock that moves only by the
frames shown, and are one still picture with `motion={false}` on the provider.
