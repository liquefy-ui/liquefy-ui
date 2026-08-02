---
'@liquefy-ui/react': minor
---

`LiquidDrawer` dismisses itself when the panel is flicked towards the edge it
slid in from. The gesture stands down for a mouse, for content that can still
scroll the way the flick would scroll it, and for a popup the panel opened —
a listbox is portaled out of the drawer but still bubbles its events back
through it. Set `swipeToClose={false}` to turn it off.
