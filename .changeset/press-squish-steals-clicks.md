---
"@liquefy-ui/core": patch
---

Stop a press on a panel from carrying its own contents out from under the pointer

Fixed: holding the close button of a `LiquidDialog` for longer than about
50ms did nothing. The press bubbles, so the dialog's own surface squashed
along with the button — and the squash is a ratio, which is the right unit
for a 36px control and the wrong one for an 800px panel. Nine percent of
that panel is 36px of travel, split between its edges, so the button docked
at its top slid roughly 28px downwards while it was being held. The pointer
was then outside it, `pointerup` landed on the surface, and the browser
dispatched the click there instead. A quick tap beat the spring and worked;
anything slower did not, which is why it read as an unreliable button rather
than a broken one.

Two things change, and neither is visible on a control-sized element:

- A press belongs to the innermost liquid element under the pointer. A panel
  holding a button that was pressed stays still — it no longer squashes, and
  no longer kicks on release.
- The squish is capped in pixels rather than in percent: no edge of a surface
  travels more than 6px, whatever its size. A button is far too small for the
  cap to bind, so it purun-s exactly as before.
