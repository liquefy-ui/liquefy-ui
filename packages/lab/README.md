# @liquefy-ui/lab

Experimental, motion-heavy components built on `@liquefy-ui/react`. The glass is
the same material; what lab adds is choreography and physics — surfaces that split
off, travel and settle, and liquid that sloshes inside them, rather than only
wobbling in place.

Anything here can change shape between minor versions while it is 0.x. When a
component's API stops moving, it graduates into `@liquefy-ui/react`.

```bash
pnpm add @liquefy-ui/lab @liquefy-ui/react @liquefy-ui/core
```

`@liquefy-ui/react` is a peer dependency, so lab's components share your
`LiquefyProvider` — its theme, tint, `motion` and `wobbliness` — instead of
bringing a copy of their own.

## DropletMenu

A round glass trigger that buds its items off one at a time, onto an arc or in a
line. Each droplet stretches along the way it is travelling, swings past its place
and jiggles to rest; closing calls them home in reverse.

The trigger and the droplets are one body of glass, drawn by a single
[`GlassMerge`](#glassmerge) surface: a droplet leaving pulls a neck of glass out of
the trigger that thins and lets go before it lands, and one coming home melts back
in. The buttons over it are clear.

```tsx
import { CalendarIcon, FileTextIcon, ImageIcon, PlusIcon } from '@liquefy-ui/icons'
import { DropletMenu } from '@liquefy-ui/lab'
import { LiquefyProvider } from '@liquefy-ui/react'
import '@liquefy-ui/react/styles.css'

<LiquefyProvider>
  <DropletMenu
    icon={<PlusIcon size={24} />}
    iconTurn={45}
    items={[
      { icon: <ImageIcon size={20} />, label: 'Photo', onSelect: addPhoto },
      { icon: <FileTextIcon size={20} />, label: 'Note', onSelect: addNote },
      { icon: <CalendarIcon size={20} />, label: 'Event', onSelect: addEvent },
    ]}
    label="Create"
    placement="top-left"
  />
</LiquefyProvider>
```

| Prop | Default | |
| --- | --- | --- |
| `items` | — | `{ icon, label, onSelect?, disabled? }[]`. `label` is the droplet's accessible name, tooltip and typeahead text; `onSelect` runs once the chosen droplet has bounced, just before the menu closes |
| `icon`, `label` | — | The trigger's icon and accessible name |
| `iconTurn` | `0` | Degrees the trigger's icon turns while open — `45` turns a plus into a close mark |
| `placement` | `'around'` | Which side the droplets land on: `around`, `top`, `bottom`, `left`, `right`, or a corner such as `top-left` for a trigger in the bottom-right corner |
| `layout` | `'arc'` | `arc` spreads the droplets over their side; `line` stacks them out of it — a column for `top` or `bottom`, a row for `left` or `right`, a diagonal from a corner (`around` counts as `top`) |
| `radius` | fitted | Distance from the trigger's centre to each droplet's — on a line, to the nearest one and between neighbours. Defaults to the closest that keeps neighbours apart |
| `stagger` | `120` | Milliseconds between one droplet leaving and the next |
| `size` | `'lg'` | The trigger's size; droplets are one size down |
| `open`, `defaultOpen`, `onOpenChange` | | Controlled or uncontrolled. A controlled close still plays the return |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component |

A line reads like any list, top to bottom and then left to right, so `items[0]` is
the top of a column above the trigger and the left end of a row to its left. Its
droplets queue out like beads: the far end leaves first and each one after pushes
the others along, so none flies through another, and coming home the nearest goes
in first and the rest close up behind it.

Out, the droplet nearest a pointer that comes near leans toward it — `elasticPull`,
the same lean every liquefy-ui surface has, drawn from where the droplet rests —
and springs back past its place when the pointer goes. Only the nearest leans, so
two neighbours never reach for the pointer at once and melt together. The droplet with focus (from the arrow
keys or the cursor) swells a little. A chosen droplet bounces to about a third
bigger first; only then does its `onSelect` run and the menu close. Until then a
second press, a second choice or Escape waits.

A press on the trigger can slide: hold, move onto a droplet (it swells under the
pointer), and let go to choose it, with a mouse, a pen or a finger. Letting go
anywhere else after sliding closes the menu without choosing, as dragging off a
native pull-down menu does; letting go without having moved more than a few pixels
was a tap and leaves the menu open, as a click does. Touch opens on the press
rather than on the tap, and the trigger has `touch-action: none`, so a slide that
starts on it never scrolls the page.

Behaviour is Base UI's menu: on an arc the arrow keys move through the droplets in
the order they land (clockwise); a line is walked the way it reads, with up and down
for a column and left and right for a row. Typeahead matches labels, Escape closes
and focus goes back to the trigger. A disabled item stays reachable with
`aria-disabled`, as the WAI-ARIA menu pattern asks, and does nothing when chosen or
let go on. The popup stays mounted until the last droplet is home, while
`aria-expanded` turns false the moment it closes.

With `motion={false}` on the provider the droplets appear and disappear in place,
nothing leans or bounces, and a choice acts at once.
Like every `@liquefy-ui/react` component, lab does not read `prefers-reduced-motion`
itself; map it to `motion` if your app wants to (see Motion on the docs site).

The droplets are laid out beside the trigger, not portalled out to the provider,
so that a droplet and its glass are always clipped and stacked alike: an ancestor
with `overflow: hidden` clips both. While droplets are out the menu lifts itself to
the menu layer (`z-index: 85`). Nothing above it may have `opacity`, `filter`,
`clip-path`, `mask` or `will-change: opacity`, or the glass has nothing behind it to
bend — see [GlassMerge](#glassmerge). A disabled droplet fades its icon; its glass is
part of the one body and stays as it is.

## GlassMerge

Glass shapes that melt into one another when they come within `spacing` of each
other — SwiftUI's `GlassEffectContainer`. It is one surface the size of the
element, drawing the shapes it is given in its own pixels from its top-left, and
nothing else. Buttons and labels go in as children, over the glass.

```tsx
import { GlassMerge, type GlassMergeHandle } from '@liquefy-ui/lab'

const circle = (x: number, y: number, r: number) => ({ x, y, width: r * 2, height: r * 2, radius: r })

<GlassMerge shapes={[circle(60, 60, 28), circle(116, 60, 23)]} spacing={16} style={{ width: 200, height: 120 }}>
  <button className="over-the-first-shape">…</button>
</GlassMerge>
```

Anything that moves drives it through the ref instead, so a frame costs no render:

```tsx
const glass = useRef<GlassMergeHandle>(null)
// once a frame:
glass.current?.setShapes([trigger, ...droplets])
```

A shape is `{ x, y, width, height, radius }` with `x` and `y` its centre, plus an
optional `stretch` along an `angle` in degrees — the squash and stretch of a
droplet in flight.

| Prop | Default | |
| --- | --- | --- |
| `shapes` | — | Shapes for a layout that holds still |
| `spacing` | `16` | Largest gap, in pixels, that two shapes still bridge |
| `bezel` | `14` | Width of the refracting band at the rim, in pixels |
| `tint` | — | A colour mixed into the glass |
| `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component. Size the element to cover everywhere the shapes go |

The glass wears what `LiquidIconButton` does, following the merged outline instead
of a rectangle: the lit ring of the rim, brighter where an edge faces up and to the
left, the inset highlight along the top and the shade along the bottom, and the cast
shadow, which falls on the page around the glass but never on it. Their colours are
the theme's (`--lq-rim-bright`, `--lq-glass-bright`, `--lq-glass-shade`,
`--lq-shadow-color`), in light and dark alike.

In Chromium the refraction, the merged outline, the rim and the shadow are all built
inside one SVG backdrop filter (`mode: 'lens'`). Safari and Firefox, and a provider
with `lens` or `transparency` off, get a layer clipped to the merged outline over the
usual frost or a solid fill, with the same rim and shadow (`mode: 'outline'`).

The shadow falls up to 40px below the shapes and 30px to either side. A backdrop
filter cannot draw outside its element, so size the element to leave that much room
around the shapes, or the shadow is cut off at its edge.

Nothing above the surface may have `opacity`, `filter`, `clip-path`, `mask` or
`will-change: opacity`: each of those makes the glass see only what is inside it,
which is nothing. Fade or clip the content, never a wrapper around the glass.

### The timeline on its own

`DropletChoreography` is the motion model with no DOM attached — springs for each
droplet's position and size, the trigger's squash, and a stagger clock that only
advances when a frame is stepped, so a main-thread stall slows the sequence down
rather than releasing every droplet at once. `dropletOffsets` and `dropletRadius`
are the layout. They are exported for building other droplet-shaped components.

## LiquidLevel

A glass vessel with liquid inside whose level follows a value. When the value
changes the level swings past its mark and drops back, the surface sloshes from
wall to wall and dies away, and with a pointer over the vessel the liquid leans
toward it. The reading is drawn twice, once each side of the surface, so it turns
to the opposite ink where the liquid covers it.

```tsx
import { LiquidLevel } from '@liquefy-ui/lab'

<LiquidLevel label="Water tank" value={62} />
<LiquidLevel label="Battery" shape="capsule" tint="#34c759" value={35} />
<LiquidLevel label="Storage" max={512} shape="rounded" tint="#0a84ff" value={410}>
  410 GB
</LiquidLevel>
```

| Prop | Default | |
| --- | --- | --- |
| `label` | — | What is being measured; the meter's accessible name |
| `value`, `max` | —, `100` | The reading, from 0 to `max`. Out-of-range values are clamped |
| `shape` | `'circle'` | `circle`, an upright `capsule` (half as wide as it is tall) or a `rounded` rectangle |
| `size` | `120` | The vessel's height in pixels; a circle's diameter |
| `tint` | provider's | The liquid's colour, laid on as a translucent wash so the backdrop shows through |
| `tilt` | `true` | Whether the liquid leans toward a pointer over the vessel |
| `children` | percentage | Replaces the reading in the middle — a volume, a temperature, an icon. Rendered twice, so keep it to something stateless |
| `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component, applied to the vessel |

The vessel is a `LiquidSurface`, so the glass keeps its refraction and lit rim; the
liquid is a canvas inside it, under the rim and the shader's glints. Like
`LiquidGauge` it is a `meter`, not a `progressbar`: `aria-valuenow`,
`aria-valuemax` and the percentage as `aria-valuetext`, with both copies of the
visible reading hidden from assistive technology. On the server, and anywhere
without a 2D canvas, a flat band of the tint stands in for the liquid.

With `motion={false}` on the provider the level moves straight to its mark with a
still surface and no lean. The animation
loop stops once the liquid is still, and while the vessel is scrolled out of view.

### The simulation on its own

`LiquidLevelSimulation` is the liquid with no DOM attached: an underdamped spring
for the level, a spring for the lean, and a one-dimensional heightfield for the
surface — a row of columns pulled toward their neighbours by the wave equation and
slowed by damping, so a kick travels across, reflects off the walls and fades.
Heights are fractions of the vessel's height, which keeps the waves in proportion
at any size. Like `DropletChoreography`, it keeps a clock that only moves when a
frame is stepped, and a long frame counts as a short one.

## LiquidMorph

A button that grows into what it opens, instead of opening something beside it. A
search button spreads into a field and drops into a panel of results; a play button
spreads into a player; an avatar into a profile card. The glass leads — sideways
first, then down — swings past its new shape and settles, rounding off into a blob
while it moves and thickening into a dialog's frosted glass as the content arrives.
Closing pulls the panel back into the button, which lands with a small pop.

```tsx
import { SearchIcon } from '@liquefy-ui/icons'
import { LiquidMorph } from '@liquefy-ui/lab'

const [stage, setStage] = useState('closed')

<LiquidMorph
  label="Search"
  stage={stage}
  onStageChange={setStage}
  stages={{
    field: { width: 320, height: 52 },
    results: { width: 320 }, // the height follows the list
  }}
  trigger={<SearchIcon size={20} />}
>
  {({ stage, setStage, close }) => (
    <SearchPanel
      onQuery={(query) => setStage(query ? 'results' : 'field')}
      onClose={close}
      showResults={stage === 'results'}
    />
  )}
</LiquidMorph>
```

A morph is `'closed'` — only its trigger — or in one of its `stages`. Moving between
open stages is the caller's: the content is handed `setStage`. Stages without
content of their own show `children`, which stay mounted from stage to stage, so a
field keeps its focus and its text while the glass grows around it. A stage that
brings its own `content` crosses over to it instead, and focus follows into it.

| Prop | Default | |
| --- | --- | --- |
| `trigger`, `label` | — | What the closed glass shows (an icon, an avatar, a thumbnail) and the trigger's accessible name |
| `stages` | — | `{ [name]: { width?, height?, radius?, content?, label? } }`. A side left out is measured from the content, and followed as the content changes size |
| `children` | | What the stages show unless they bring their own. A function is handed `{ stage, setStage, close }` |
| `stage`, `defaultStage`, `onStageChange` | `'closed'` | Controlled or uncontrolled. A controlled close still plays the return |
| `openTo` | first stage | The stage the trigger opens to |
| `origin` | `'top-left'` | The point of the trigger that stays put: a corner, the middle of an edge, or `center` |
| `size` | `'md'` | A round icon trigger at the library's sizes, or `{ width, height, radius }` for an avatar or a thumbnail |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component |

Behaviour is Base UI's popover: the trigger carries `aria-expanded`, focus moves to
the first thing in the panel that takes it, and Escape or a press outside closes it
and hands focus back to the trigger. The panel stays mounted until the glass is back
in the trigger. With `motion={false}` on the provider every change of stage lands at
once.

## LiquidIsland

A glass capsule in the manner of the Dynamic Island. At rest it is a small round
bubble; given a view it stretches into it — a track and a play button, a progress
bar, a message — and between views the glass is what moves: it gathers in before it
spreads out, overshoots and settles, and a view that asks to `bounce` lands with a
pop, like a finished download shrinking into a tick. With a `panel`, pressing it
opens it into that, in place.

```tsx
import { CheckIcon } from '@liquefy-ui/icons'
import { LiquidIsland } from '@liquefy-ui/lab'
import { LiquidProgress } from '@liquefy-ui/react'

<LiquidIsland
  label="Now playing"
  size={44}
  view={done ? 'done' : 'download'}
  views={{
    music: { content: <Track /> },
    download: {
      announce: 'Downloading Fjord route.pdf',
      content: <LiquidProgress aria-label="Fjord route.pdf" value={progress} />,
    },
    done: { announce: 'Download complete', bounce: true, content: <CheckIcon size={18} />, width: 44, height: 44 },
  }}
  panel={{ content: <Player />, label: 'Player', width: 300 }}
/>
```

| Prop | Default | |
| --- | --- | --- |
| `view`, `views` | — | Which view is showing, and each view's `content`, size (a side left out is measured), `announce` and `bounce`. A key with no view is the resting bubble |
| `label` | — | The island's accessible name, which its button carries when there is a panel |
| `panel` | | `{ content, width?, height?, radius?, label? }`: what the island opens into when pressed. A function is handed `{ close }`. Without one the island is not a button |
| `open`, `defaultOpen`, `onOpenChange` | | Controlled or uncontrolled panel |
| `size` | `36` | The resting bubble's diameter, which is also the room the island takes in the layout. Views larger than it float over what is around it |
| `origin` | `'top'` | The point that stays put while the island changes shape |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component |

Each view's `announce` is read out through a polite live region as the view arrives,
rather than its content, which may tick over every second. Anything in a view that
can be pressed stays pressable; the rest of the island is one button that opens the
panel, which behaves as Base UI's popover does in `LiquidMorph`. A view replaced
while focus is inside it hands focus to the new view, or to the island's button.

### The morph on its own

Both are drawn by one `GlassMerge` surface following `GlassMorph`, the motion with
no DOM attached: springs for width, height and corner radius, one axis a lag behind
the other (growing, width first; shrinking in height, height first), a jelly wobble
and a pop for landing, and the timing of the content fading out and in. Like
`DropletChoreography`, it keeps a clock that only moves when a frame is stepped, so a
main-thread stall slows a morph down rather than collapsing its two halves into one.
The content sits on a frosted layer under the glass — clear for a closed trigger,
the thick glass of `LiquidDialog` for anything holding text — and is clipped to the
glass's shape every frame. Nothing above it may have `opacity`, `filter`,
`clip-path`, `mask` or `will-change: opacity`; see [GlassMerge](#glassmerge).

## ElasticSheet

A sheet pulled up from the bottom, as in a maps app, where the drag is the point.
It follows the finger, stretches against a rubber band past its tallest and lowest
heights, and when let go coasts to the snap point the flick carries it to, swinging
past and settling with a quiver. A slow release settles on the nearest height, a hard
flick up runs to the top, and a hard flick down puts it away.

Short, it floats in from the sides and the bottom with all four corners round;
reaching its tallest height it anchors to them. Pulled past the top its sides draw
in and a tongue of glass reaches up toward the finger, and its sides quiver as it
settles. It is drawn by one [`GlassMerge`](#glassmerge) surface that follows it
frame by frame, over a layer of thick frost that keeps the content legible.

```tsx
import { SearchIcon } from '@liquefy-ui/icons'
import { ElasticSheet } from '@liquefy-ui/lab'
import { LiquidButton } from '@liquefy-ui/react'

<ElasticSheet
  defaultOpen
  modal={false}
  snapPoints={['25%', '50%', '100%']}
  title="Explore"
  trigger={<LiquidButton iconBefore={<SearchIcon size={16} />}>Explore</LiquidButton>}
>
  <Places />
</ElasticSheet>
```

| Prop | Default | |
| --- | --- | --- |
| `snapPoints` | `['50%', '100%']` | The heights it rests at. `'50%'` or `0.5` is half the room; `'320px'` or `320` is exact. The room is the container's height less `topInset` |
| `snap`, `defaultSnap`, `onSnapChange` | first point | The snap point it rests at. A drag lands wherever the flick carries it and reports it; a controlled `snap` moves it whenever it changes |
| `open`, `defaultOpen`, `onOpenChange` | | Controlled or uncontrolled. A controlled close still slides it away |
| `modal` | `true` | Dims what is behind, keeps focus inside and locks the page's scroll. `false` leaves the page live around it, as under a map's sheet |
| `dismissible` | `true` | Whether a flick down, Escape, the close button and a press outside a modal sheet put it away. `false` holds the lowest height against a rubber band; only `open` closes it |
| `container` | viewport | An element (or a ref to one) to move in instead of the viewport. Give it a position and clip its overflow |
| `trigger` | — | An element that opens it, rendered in place. Focus goes back to it on close |
| `title`, `label` | — | The heading, which names the dialog; `label` names it when there is no title |
| `topInset` | `48` | Space kept clear above it at its tallest — room for the stretch and the tongue to show |
| `maxWidth` | `640` | The widest it gets; it is centred in anything wider |
| `grabberLabel`, `closeLabel` | `'Sheet height'`, `'Close'` | Accessible names |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component, applied to the sheet |

Behaviour is Base UI's dialog: focus moves in and is given back, Escape closes it,
and a modal sheet adds the backdrop, the focus trap and the scroll lock. A non-modal
sheet moves focus in only when someone opens it from its trigger, so one that is
simply there from the start does not grab focus or scroll the page to itself. The
grabber is a vertical slider: the arrow keys step between snap points, Home and End
go to the ends, and a press steps up through them and round again.

The sheet and its content share one gesture. A touch anywhere on it drags it; pulled
up, a sheet below its tallest height grows before its content scrolls, and pulled
down, content scrolled down goes back to its top before the sheet moves. A sideways
move is left to whatever scrolls sideways. A mouse drags it by the grabber and the
header, since dragging across content selects text, and a press that starts in a
field never drags. The content stays laid out at the sheet's tallest height and is
clipped as the sheet moves, so nothing reflows while it quivers.

With `motion={false}` on the provider the sheet still follows the finger and still
gives against the bands — that is the hand moving it — but lands, opens and closes
in place, with no quiver and no tongue. The sheet stays mounted until it is out of
view. Nothing above it may have `opacity`, `filter`, `clip-path`, `mask` or
`will-change: opacity` — see [GlassMerge](#glassmerge).

### The motion on its own

`SheetMotion` is the sheet with no DOM attached: a spring for the top edge that a
finger can hold and let go of with its speed, rubber bands past the ends, and the
jelly and tongue springs. `chooseStop` picks where a release comes to rest from the
distance a flick would coast (UIKit's normal deceleration), `rubberBand` is the curve
an edge gives along, `VelocityTracker` reads a finger's speed as it lifts, and
`sheetStops` turns snap points into heights.

## LiquidContextMenu

A context menu in the manner of iOS, made of liquid glass. A long press — or a right
click, or the context-menu key — lifts what was pressed off the page over a darkening
scrim, and the menu buds out from under its edge: a drop of glass that pulls a neck
out of the preview, spreads along the edge, drops into a panel and swings past its
shape before it settles, its rows arriving one at a time. While the finger is held
the preview sinks a little, so the lift reads as the press letting go.

```tsx
import { CopyIcon, HeartIcon, ShareIcon, TrashIcon } from '@liquefy-ui/icons'
import { LiquidContextMenu } from '@liquefy-ui/lab'

<LiquidContextMenu
  label="Photo"
  items={[
    { icon: <ShareIcon size={18} />, label: 'Share', onSelect: share },
    { icon: <CopyIcon size={18} />, label: 'Copy', onSelect: copy },
    { icon: <HeartIcon size={18} />, label: 'Favourite', onSelect: favourite },
    { icon: <TrashIcon size={18} />, label: 'Delete', onSelect: remove, danger: true },
  ]}
>
  <img alt="The coast at dusk" src="/coast.jpg" draggable={false} />
</LiquidContextMenu>
```

The press that opened it can keep going. Sliding over the rows highlights them — the
highlight slides after the finger, stretching as it goes and leaning toward it — and
letting go on a row chooses it, which pops before its `onSelect` runs. Let go off the
menu and it closes. Let go without moving and it stays open for a tap, as it does on
iOS: the press only asked to see what is there.

| Prop | Default | |
| --- | --- | --- |
| `children` | — | What is pressed. It lifts off the page while the menu is open |
| `items` | — | `{ label, icon?, onSelect?, danger?, disabled? }[]`. The label is the row's accessible name and what typeahead matches |
| `label` | | The menu's accessible name |
| `delay` | `450` | Milliseconds a finger or pen rests on it before the menu opens. A mouse opens it with a right click |
| `side` | `'auto'` | Where the menu comes out: below, else above, else beside — whichever fits without moving the preview, or the one that moves it least. Or `'top'`, `'bottom'`, `'left'`, `'right'` |
| `width` | `240` | The menu's width. Rows are 44px tall |
| `preview` | a copy of `children` | What lifts off the page while the menu is open |
| `radius` | `18` | Corner radius of the lifted preview, which is cut to it |
| `stagger` | `45` | Milliseconds between one row arriving and the next |
| `onOpenChange`, `disabled` | | |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component, applied to the element that wraps `children` |

Behaviour is Base UI's context menu: roving focus with the arrow keys, typeahead,
Escape, focus handed back. The wrapper takes focus, and Shift+F10 or the context-menu
key opens the menu from it with the first row focused. What lifts is a copy laid over
the scrim, since the original has to stay where it is in the page; the original is
hidden until the copy is set back down on it. Give it `preview` when a second copy of
`children` would not do — one with state of its own, say. With `motion={false}` on
the provider it opens and closes at once, and a held press does not sink.

### The motion on its own

`ContextMenuMotion` is the menu with no DOM attached: the press, the lift, the scrim,
the menu's `GlassMorph` and the piece of glass under the preview's edge it pulls its
neck from, the rows' arrival and the highlight. `contextMenuLayout` works out where
the lifted preview and the menu go in a viewport.

## MagneticActions

A row of round glass action buttons that reach for the pointer. Bring a cursor up
to the row and the button nearest it is drawn toward it, its neighbours a little;
buttons drawn close enough melt together like drops of liquid — a neck of glass
grows between them and lets go as they part. Take the cursor away and they spring
back past their places and settle. A press squashes a button and lets it go with
the same jelly as `LiquidIconButton`.

```tsx
import { DownloadIcon, HeartIcon, ShareIcon } from '@liquefy-ui/icons'
import { MagneticActions } from '@liquefy-ui/lab'

<MagneticActions
  label="Photo"
  actions={[
    { icon: <HeartIcon size={22} />, label: 'Favourite', onClick: favourite },
    { icon: <ShareIcon size={22} />, label: 'Share', onClick: share },
    { icon: <DownloadIcon size={22} />, label: 'Save', onClick: save },
  ]}
/>
```

| Prop | Default | |
| --- | --- | --- |
| `actions` | — | `{ icon, label, onClick?, disabled? }[]`. `label` is the button's accessible name and tooltip |
| `label` | — | The toolbar's accessible name |
| `orientation` | `'horizontal'` | Which way the row runs, and which arrow keys walk it |
| `strength` | `0.6` | 0 to 1: how hard the buttons are drawn toward the pointer. `0` holds them still |
| `reach` | `120` | Pixels beyond a button's edge at which the pointer is first felt |
| `spacing` | `12` | Largest gap, in pixels, that two buttons' glass still bridges. Kept under `gap`, they rest apart and melt only when drawn together |
| `gap` | `14` | Clear space between neighbouring buttons at rest, in pixels |
| `size` | `'md'` | Each button's side: 36, 46 or 56px, as `LiquidIconButton` |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component, applied to the element that wraps the row |

The pull is `elasticPull`, the lean every liquefy-ui surface has toward a nearing
pointer, doubled into a magnet for the nearest button and measured from where each
button rests rather than from where it is drawn. Every other button is drawn toward
the pointer too, by a share that falls off with how much further from it it is than
the nearest: the neighbours close in, the far end barely stirs, and a pointer between
two buttons draws both nearly as hard and pulls them into one. A button travels at
most about a third of its size, and the pull eases into that rather than stopping at
it. It is held in underdamped springs at the provider's `wobbliness`, which is what
makes a button trail a moving cursor a little and swing past its place when let go.

Behaviour is Base UI's toolbar: the row is one stop in the tab order, the arrow keys
move along it (left and right for a row, up and down for a column) and loop at the
ends. Focus moves nothing — only a pointer pulls — so a keyboard user sees a still row
and the focus ring. A disabled action stays reachable with `aria-disabled`, as a
toolbar's items do, and neither acts nor moves. With `motion={false}` on the provider
the buttons stay where they rest, a press does not squash, and the glass keeps them
apart whatever `spacing` says.

All of the glass is one [`GlassMerge`](#glassmerge) surface under clear buttons.
Nothing above it may have `opacity`, `filter`, `clip-path`, `mask` or
`will-change: opacity`, or the glass has nothing behind it to bend.

### The motion on its own

`MagneticMotion` is the row with no DOM attached: `attract` aims each button from a
pointer, `press` and `release` squash one and let it go, `step` runs the springs,
and `frame(i)` and `shape(i)` read back where a button is drawn and the
`GlassMergeShape` that draws it. `magneticPull` is the pull by itself, and
`magneticLayout` the resting places of a row. Buttons are described by their centre
and size, so a row of different-sized things — a dock — can be driven the same way.

## LiquidSwipe

Pages turned the way Cuberto's liquid swipe turns them. The next page peeks in at
the right edge as a small bulge with a glass button on it, and the previous one at
the left. Pull either sideways — from its handle or from anywhere on the page — and
its bulge swells like a wave, taller and wider the further it comes and following
the finger up and down. Let go past the middle, or flick it, and the page floods
across the room, lands with a slosh, and the new neighbours' handles pop in. Let go
short of it, or flick it back, and the wave springs back to a handle.

```tsx
import { LiquidSwipe } from '@liquefy-ui/lab'

<LiquidSwipe label="Getting started" index={index} onIndexChange={setIndex}>
  <section style={{ background: "url('/fjord.jpg') center / cover" }}>…</section>
  <section style={{ background: '#1d5c58' }}>…</section>
  <section style={{ background: '#e6c27a' }}>…</section>
</LiquidSwipe>
```

| Prop | Default | |
| --- | --- | --- |
| `children` | — | The pages, one child each. Give every page its own background: a turn is the next page's colour flooding in over this one |
| `label` | — | The carousel's accessible name |
| `index`, `defaultIndex`, `onIndexChange` | `0` | Controlled or uncontrolled. A controlled change comes in on a wave from the nearer side; a page further than one away comes in on a single wave |
| `loop` | `false` | Whether the last page leads on to the first and the first back to the last |
| `pageLabel` | `` (index, count) => `${index + 1} of ${count}` `` | Each page's accessible name |
| `previousLabel`, `nextLabel` | `'Previous page'`, `'Next page'` | The accessible names and tooltips of the buttons on the two handles |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component; `tint` goes to the handles' glass |

The carousel is as tall as its tallest page unless it is given a height, and every
page fills it. Each page is cut out with `clip-path: path()` — a strip along the edge
it comes in from and a bell of two cubics — redrawn every frame. A clip makes the
page a backdrop root, so glass on a page bends that page's own background rather
than what is under the carousel, which is what an opaque page would show anyway. The
page that covers the room has no clip at all. Nothing above the carousel may have
`opacity`, `filter`, `clip-path`, `mask` or `will-change: opacity` if the handles'
glass is to bend the pages.

To assistive technology it is a carousel: a region named by `label`, slides named
"2 of 4" in a polite live region, so a new page is read out, and the previous and
next buttons, which go dim at the ends of a carousel that does not loop. The left and
right arrow keys turn it from anywhere inside, except a field or a widget that
already uses them. Pages out of view are `inert` — except one that still holds focus,
which keeps it until its successor has come in and then hands it over.

A touch that moves sideways turns the page; one that moves up or down scrolls, since
the carousel claims only horizontal panning (`touch-action: pan-y pinch-zoom`), and
one inside something that scrolls sideways scrolls that first. A mouse swipes the
same way, except from a field, where a drag selects text. With `motion={false}` on
the provider a page still follows the finger while it is held — that is the hand
moving it — but turns or goes back at once, and the handles appear without popping.

### The motion on its own

`waveShape` is a wave's front at a given progress — its straight part, and the
bulge's height and reach — and `wavePath` its outline as a `clip-path` path.
`WaveMotion` is one wave's springs: the progress a finger holds and lets go of with
its speed, the jelly that leads with the tip and sloshes, the bulge's height, and
the handle's pop. `SwipeDeck` is the pages as a whole — which page covers the room,
which page each side brings in, a finger's `grab`, `drag` and `letGo`, and `goTo`.
`chooseSwipe` decides whether a release turns the page: past `SWIPE_THRESHOLD`, or
faster than `FLICK_SPEED` either way.
