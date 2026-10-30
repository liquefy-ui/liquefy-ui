---
"@liquefy-ui/lab": minor
---

`ElasticSheet`: a sheet pulled up from the bottom, as in a maps app, where the
drag is the point. It follows the finger, stretches against a rubber band past its
tallest and lowest heights, and when let go coasts to the snap point the flick
carries it to (`snapPoints` as percentages, shares or pixels), swinging past and
settling with a quiver; a hard flick up runs to the top and a hard flick down puts
it away. Short it floats in from the edges, tall it anchors to them, and pulled
past the top its sides draw in while a tongue of glass reaches for the finger —
all one `GlassMerge` surface over thick frost.

Behaviour is Base UI's dialog, modal or not (`modal={false}` leaves the page live,
as under a map's sheet), controlled or uncontrolled for both `open` and `snap`;
`closeButton={false}` leaves the close button out of a sheet put away by a flick. The
grabber is a slider the arrow keys move between snap points, and a touch on the
content grows the sheet before the content scrolls, and scrolls the content back to
its top before the sheet comes down. `SheetMotion`, `chooseStop`, `rubberBand`,
`VelocityTracker` and `sheetStops` are the motion with no DOM attached.
