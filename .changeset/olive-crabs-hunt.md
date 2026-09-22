---
'@liquefy-ui/react': minor
---

Add `frost`, and stop the slider thumb hanging out of its own control

`frost` is a provider prop: backdrop blur in pixels, added to whatever each
surface already asks for. A dialog stays thicker than a card however far the
dial is turned, and the default of `0` leaves every surface exactly where it
was. `LiquidGlass` takes `frost` too, set outright rather than added, because a
component naming its own frost is saying what it wants to be rather than how
much more than everything else.

That rename frees `frost` from the meaning it briefly had on `LiquidGlass` —
the blur applied to the refracted image, which is now `softness`. Frosted glass
is a backdrop blur; it was the wrong word for the other thing.

Fixed: `LiquidSlider` centres its thumb on the value, so at either end half the
handle hung outside the track. Anywhere the slider sat in a container that
clips, the handle was sliced down the middle at exactly the value where someone
is most likely to be looking at it. The control is now inset by half a thumb,
so the handle's outer edge lands on the control's own.
