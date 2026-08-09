---
'@liquefy-ui/react': minor
---

`LiquidDrawer` and `LiquidDialog` are thick glass rather than clear. A panel
that covers the page is read through, and on a phone a drawer is most of the
screen with only a sliver of dimmed backdrop beside it — the page underneath
used to show through the text. Both panels now soften what they refract, by
20px, and carry a fill a little over half way to solid: enough that the words
sit on something, little enough that the page still moves and colours behind
them. `transparency={false}` on the provider still takes the glass off entirely.

The softening reaches the lens too. `LiquidSurface` takes a `lensBlur`, which
sets the blur inside the refraction the lens performs — until now that blur was
fixed at a token 0.6px, so a lensed surface could refract the page behind it in
perfect focus however frosted the stylesheet asked it to be.
