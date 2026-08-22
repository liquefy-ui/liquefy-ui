---
'@liquefy-ui/react': patch
---

Let a touchscreen paste into `LiquidTextField` and `LiquidTextarea`. Both wrap
their input in a compositing layer, and WebKit places the text-selection callout
against the wrong coordinate space when an input is nested that way, so a long
press on iOS raised no menu and the field could not be pasted into. Under
`any-pointer: coarse` the field — and a surface holding one — now drop the
transform, which only ever drove pointer-tracked tilt that a touchscreen has no
pointer for. Nothing changes for a mouse.
