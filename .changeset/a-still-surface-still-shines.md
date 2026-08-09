---
'@liquefy-ui/react': patch
---

A `LiquidSurface` with `interactive={false}` paints its shader again. The prop
means the surface does not answer a pointer, but it also withheld the motion
controller — and the controller is what drives the WebGL sheen — so the surface
mounted a canvas that nothing ever drew into and wore flat glass instead of
liquid. It now holds still and keeps its shine. `LiquidDrawer` is the component
this was visible on; `LiquidAccordion` and `LiquidList` pass `webgl={false}` and
are unchanged.
