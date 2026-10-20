---
"@liquefy-ui/lab": minor
---

`DropletMenu` learns four new moves.

- **`layout="line"`** stacks the droplets in a straight line out of the side
  `placement` names: a column for `top` or `bottom`, a row for `left` or
  `right`. A line reads top to bottom, then left to right, and is walked with
  the arrow keys the same way. Its droplets queue out like beads, far end first,
  each one pushing the others along so none flies through another.
- **A magnet.** The droplet nearest a pointer that comes near leans toward it,
  glass and button together, and springs back past its place when it goes. The
  droplet with focus swells a little.
- **A bounce on choosing.** The chosen droplet bounces to about a third bigger
  before its `onSelect` runs and the menu closes; a second press, a second choice
  or Escape waits for it.
- **Press and slide.** Hold the trigger, slide onto a droplet and let go to
  choose it, with a mouse, a pen or a finger. Letting go anywhere else after
  sliding closes the menu without choosing; a tap still just opens it. Touch now
  opens on the press, and the trigger has `touch-action: none`.

`dropletOffsets` and `dropletRadius` take an optional `layout`, and
`DropletChoreography` gains `attract`, `highlight`, `choose`, `takeChoice` and
`dropletAt`. With `motion={false}` nothing leans or bounces and a choice acts at
once.
