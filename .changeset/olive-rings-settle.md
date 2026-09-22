---
'@liquefy-ui/react': minor
---

Composite the rim as a ring, and retune the default material

Fixed: the rim overlay was filling the whole face instead of the 1.6px band it
is masked to. `-webkit-mask` was declared after `mask-composite: exclude`, and
the shorthand resets the compositing operator — `-webkit-mask-composite: xor`
does not put the standard one back, so the ring composited as source-over. The
gradient it paints is white and blends with `screen`, which made every surface
a bright diagonal wash on a dark page: labels inside segmented controls and
buttons disappeared under it. The light theme never showed it, because `screen`
against white is a no-op. Prefixed declarations now come first and the standard
ones last, the same ordering `backdrop-filter` already needed in this file.

The defaults move to the material the playground has settled on: `dispersion`
and `elasticity` to 0, `frost` to 0, `refraction` to 1, `veil` to 0. Both
remain props; they are simply no longer something the material asks for by
default.

`veil` now reaches the things that were still fixed underneath it — the clear
variant's fill, which was `transparent` and so had nothing for the dial to
scale, and the shader canvas, whose `screen` blend is brightest exactly where
a surface asking to be barely there can least afford it. A theme can set a
floor under the dial with `--lq-veil-floor`, and the dark one does: a hairline
on black is not a panel, so `veil={0}` there still leaves a little material.
Set `--lq-veil-floor: 0` on a subtree to take that away too.
