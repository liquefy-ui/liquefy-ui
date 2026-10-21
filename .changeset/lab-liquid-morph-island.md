---
"@liquefy-ui/lab": minor
---

`LiquidMorph`: a button that grows into what it opens — a search field, a
player, a profile card — instead of opening something beside it. The glass
spreads sideways before it drops, swings past its new shape and settles,
rounding off while it moves and frosting as the content arrives, and shrinks
back into the button with a pop. Stages between closed and fully open are the
caller's to move through; behaviour is Base UI's popover.

`LiquidIsland`: a capsule in the manner of the Dynamic Island that stretches
from a resting bubble into whatever view it is given — a track, a download, a
message — announces each one politely, and opens into a panel when pressed. A
view can land with a pop, like a finished download shrinking into a tick.

Both run on `GlassMorph`, the shared motion with no DOM attached, also exported.
