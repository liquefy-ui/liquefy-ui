---
'@liquefy-ui/react': patch
---

A `LiquidDrawer` or `LiquidDialog` in the light theme is glass rather than
grey. The scrim behind a panel is a dark dim, and a translucent panel sitting
on top of it takes the dimming on as grey — 40% of near-black under a white
fill landed the panel body at about #ced0d0. Dark mode never showed it, because
there the dim disappears into the page. The light scrim now dims only as far as
it takes to put the page out of reach, the fill gives up a few points so more of
the page comes through, and the inner white glow steps back the way it already
does on every other light surface, where it only ever read as haze.
