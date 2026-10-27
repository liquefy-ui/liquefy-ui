---
"@liquefy-ui/lab": minor
---

`LiquidSwipe`: pages turned the way Cuberto's liquid swipe turns them. The next
page peeks in at the right edge as a bulge with a glass button on it, and the
previous one at the left; pulled sideways, the bulge swells like a wave and follows
the finger's height, and let go past the middle or flicked, the page floods across,
lands with a slosh and the new handles pop in. Each page is cut out with a
`clip-path: path()` redrawn every frame, so glass on a page still bends that page's
own background.

It is a carousel to assistive technology — slides named "2 of 4" in a polite live
region, previous and next buttons, the arrow keys — with `index` controlled or not,
`loop`, and pages out of view `inert` unless they still hold focus. A sideways touch
turns the page and an up-and-down one scrolls. `waveShape`, `wavePath`,
`WaveMotion`, `SwipeDeck` and `chooseSwipe` are the motion with no DOM attached.
