# @liquefy-ui/lab

## 0.1.0

### Minor Changes

- 7d624fc: `DropletMenu` learns four new moves.
  
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
- bb6091a: `DropletMenu` draws the trigger and its droplets as one body of glass. A droplet
  leaving pulls a neck out of the trigger that thins and lets go before it lands,
  and one coming home melts back in, with the refraction and the lit rim running
  through the join. Underneath it is a `GlassMerge` surface fed from the
  choreography each frame; the trigger and the droplets are clear buttons over it,
  with the same menu behaviour as before.
  
  The droplets are now laid out beside the trigger rather than portalled to the
  provider, so they and their glass are clipped and stacked alike, and the menu
  lifts itself to the menu layer while they are out. Engines without SVG backdrop
  filters, and a provider with `lens` or `transparency` off, get the merged outline
  with a frosted or solid fill.
- 9a25cc0: `GlassMerge`: a surface that draws glass shapes melting into one another, with
  your content laid over it. Pass `shapes` for a layout that holds still, or call
  `setShapes` on its ref from motion code once a frame without re-rendering; the
  ref's `mode` says whether the refracting lens or the clipped outline is drawn.
  The provider's `lens`, `transparency` and `refraction` apply. The surface has no
  fill, border or shadow of its own, and must not sit under anything with
  `opacity`, `filter`, `clip-path`, `mask` or `will-change: opacity`.
- 758a953: Two moving backdrops to lay glass over.
  
  - **`FluidBackdrop`**: water with colour poured in, simulated on the GPU with Jos
    Stam's stable fluids. A pointer anywhere over it stirs it — read from the window, so
    it stirs through the glass and buttons on top without taking their events — and when
    nobody does, it slowly stirs itself. `pressureIterations`, `resolution`,
    `dyeResolution` and `maxPixelRatio` trade detail for cost; `colors`, `tint`,
    `background`, `speed`, `stir`, `vorticity` and `fade` set the look. Without float
    render targets it carries the colour on vortices instead; without WebGL2 it is still
    CSS pools of the same colours.
  - **`MeshGradient`**: a SwiftUI-style mesh gradient — a colour on each point of a grid,
    blended between them, with the points drifting so the colour flows. `columns`, `rows`,
    `colors`, `speed` and `wander`. WebGL2, else a small 2D canvas scaled up, else CSS.
    The drift is exported on its own as `MeshMotion`.
  
  Both stop off screen and in a background tab, run on a clock that moves only by the
  frames shown, and are one still picture with `motion={false}` on the provider.
- ac8a621: `ChangeEffect` and `ParticleField`: Pow's change effects and Vortex's particles.
  
  - **`ChangeEffect`** wraps something and plays an effect on it once each time
    `trigger` changes, never on mount, the same as `IconEffect`: `spray` throws glass
    droplets of every size up out of it, `jump` hops and lands with a squash it wobbles
    out of, `shine` runs a band of light from the top-left corner to the bottom-right,
    `shake` shakes it from side to side, and `glow` lights it from behind. Effects nest,
    plays overlap, and a ref's `play()` plays one without a change of value. What it
    draws is `aria-hidden`; what it wraps behaves as before.
  - **`ParticleField`** draws particles on a 2D canvas, with presets for `rain`, `snow`,
    `confetti`, `fireworks`, `bubbles` and `magic`, or a `config` of your own — rate,
    speed, gravity, spread, colours, size, lifetime and more. Without children it fills
    its positioned parent, so glass laid over it refracts it; with them it draws over or
    behind them, past their edges by `bleed`. A ref's `burst(count)` fires particles at
    once. It stops drawing off screen and in a background tab, and keeps at most
    `MAX_PARTICLES` alive.
  - **`ParticleSystem`** is the particles with no DOM attached, seeded so the same seed
    and the same steps draw the same particles; `PARTICLE_PRESETS`, `PARTICLE_DEFAULTS`,
    `particleConfig` and `createRandom` come with it.
  
  With `motion={false}` on the provider no effect plays and no field draws.
- 7b16cb8: New package: `@liquefy-ui/lab`, for experimental, motion-heavy components built on
  `@liquefy-ui/react`. APIs here may change between minor versions while it is 0.x.
  
  The first is `DropletMenu`: a round glass trigger that buds its items off one at a
  time. Each droplet stretches along its path, swings past its place and jiggles to
  rest, and closing calls them home in reverse. The droplets are the same glass as
  every other surface, so the backdrop refracts through them.
  
  It is Base UI's menu underneath — roving focus, typeahead, Escape, focus returned
  to the trigger — and it keeps the popup mounted until the last droplet is home.
  `placement` lands the droplets around the trigger, on one side, or on a quarter arc
  for a corner button; `radius` defaults to the closest that keeps them apart. The
  provider's `motion` and `wobbliness` are honoured; like `@liquefy-ui/react`, it does
  not read `prefers-reduced-motion` itself.
- 778a3ce: `ElasticSheet`: a sheet pulled up from the bottom, as in a maps app, where the
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
- 3478f9e: `LiquidContextMenu`: a context menu in the manner of iOS, made of liquid glass. A
  long press, a right click or the context-menu key lifts what was pressed off the
  page over a darkening scrim, and the menu buds out from under its edge — pulling a
  neck of glass out of the preview, spreading, dropping into a panel and swinging past
  its shape — with its rows arriving one at a time. The press that opened it can slide
  onto a row and let go to choose it; letting go off the menu closes it, and letting
  go where it opened leaves it open for a tap. Behaviour is Base UI's context menu.
  The motion and the placement are exported on their own as `ContextMenuMotion` and
  `contextMenuLayout`.
- 4f6e70f: `LiquidLevel`: a glass vessel with liquid inside whose level follows a value. The
  level springs past its mark and settles back, the surface sloshes when the value
  jumps and leans toward a pointer over the vessel (`tilt`), and the reading turns
  to the opposite ink where the liquid covers it.
  
  The vessel is a `LiquidSurface` — a `circle`, an upright `capsule` or a `rounded`
  rectangle — so the backdrop still refracts through the glass; the liquid is a
  translucent wash of `tint` (the provider's by default) drawn under the lit rim.
  It mirrors `LiquidGauge`: `value`, `max`, `size`, `tint` and `children`, and it is a
  `meter` with the reading as its value text. With `motion={false}` on the provider,
  the level moves straight to its mark with a still surface.
  The animation stops once the surface is still and while the vessel is off screen.
  
  `LiquidLevelSimulation`, the level spring and surface heightfield behind it, is
  exported with no DOM attached.
- 13ffba5: `LiquidMorph`: a button that grows into what it opens — a search field, a
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
- b356351: `LiquidSwipe`: pages turned the way Cuberto's liquid swipe turns them. The next
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
- 70a705b: `MagneticActions`: a row of round glass action buttons that reach for the pointer.
  The button nearest a cursor coming close is drawn toward it and its neighbours a
  little, buttons drawn close enough melt together through one `GlassMerge` surface,
  and when the pointer goes they spring back past their places and settle. A press
  squashes a button with the same jelly as `LiquidIconButton`. Behaviour is Base UI's
  toolbar — one tab stop, the arrow keys along the row — and focus moves nothing.
  `strength`, `reach`, `spacing`, `gap`, `size` and `orientation` tune it. The motion is
  exported on its own as `MagneticMotion`, with `magneticPull` and `magneticLayout`.

### Patch Changes

- Updated dependencies [7753154]
- Updated dependencies [fff0154]
- Updated dependencies [c9a923f]
  - @liquefy-ui/core@1.2.0
  - @liquefy-ui/react@1.3.0
