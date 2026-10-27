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

## ChangeEffect

Plays an effect on what it wraps, once, each time a value changes — Pow's change
effects for the web.

- `spray` throws droplets of glass up out of it, every size, that fall back and shrink
  away. Each droplet is a tiny lens: nearly clear in the middle, tinted toward a lit
  rim, with light gathered at the bottom and a point of light at the top left.
- `jump` crouches, hops, and lands with a squash it wobbles out of.
- `shine` runs a band of light across it, from the top-left corner to the bottom-right,
  inside its rounded corners.
- `shake` shakes it from side to side, quickly and smaller each time.
- `glow` lights it from behind and lets the light fade, so glass over it bends the
  light it gives off.

```tsx
import { HeartIcon } from '@liquefy-ui/icons'
import { ChangeEffect } from '@liquefy-ui/lab'
import { LiquidButton } from '@liquefy-ui/react'

// The spray outside, so its droplets stay where they were thrown while the button jumps
<ChangeEffect effect="spray" trigger={likes}>
  <ChangeEffect effect="jump" trigger={likes}>
    <LiquidButton iconBefore={<HeartIcon />} onClick={like}>{likes}</LiquidButton>
  </ChangeEffect>
</ChangeEffect>
```

| Prop | Default | |
| --- | --- | --- |
| `effect` | — | `'spray'`, `'jump'`, `'shine'`, `'shake'` or `'glow'` |
| `trigger` | — | Plays the effect once each time this changes, compared with `Object.is`, and never on mount — the same as `IconEffect`'s |
| `speed` | `1` | How fast it plays: `2` is twice as fast |
| `tint` | provider's | The colour of a glow's light and of a spray's droplets, any CSS colour |
| `ref` | | A `ChangeEffectHandle` whose `play()` plays it now, for a change that leaves the value as it was — a wrong passcode entered twice |
| `className`, `style` | | Applied to the wrapper |

The wrapper is an `inline-flex` box around `children` with nothing on it that would
stop glass inside from refracting. What an effect draws is `aria-hidden` and clear of
the pointer, and what it wraps behaves exactly as it did: no handlers, no roles, no
focus. Plays overlap rather than restart — a second shine crosses behind the first, a
second spray throws more droplets into the air, and a jump started mid-air leaves from
where it was caught. The motion runs on a clock of its own that only moves when a
frame runs, so a busy main thread slows an effect rather than skipping it. With
`motion={false}` on the provider nothing plays.

## ParticleField

Particles on a canvas: rain, snow, confetti, fireworks, bubbles rising and swaying,
and magic sparkling — Vortex's presets for the web — or a system of your own. Behind
glass, the glass refracts them.

```tsx
import { ParticleField } from '@liquefy-ui/lab'
import { GlassCard, LiquidButton } from '@liquefy-ui/react'

// Behind glass: the field fills the section, and the card after it bends it
<section style={{ position: 'relative' }}>
  <ParticleField preset="snow" />
  <GlassCard title="Snow">…</GlassCard>
</section>

// Around something, spilling past its edges
<ParticleField bleed={28} preset="magic">
  <LiquidButton>Upgrade</LiquidButton>
</ParticleField>

// Settings of your own over a preset's
<ParticleField config={{ rate: 300, speed: 1200 }} preset="rain" />
```

| Prop | Default | |
| --- | --- | --- |
| `preset` | — | `'rain'`, `'snow'`, `'confetti'`, `'fireworks'`, `'bubbles'` or `'magic'` |
| `config` | | `Partial<ParticleConfig>` over the preset's, or over `PARTICLE_DEFAULTS` without one. Compared by value, so it can be written inline |
| `children` | | Without them, the field fills its nearest positioned ancestor and paints where it falls among its siblings — first, under the glass that follows it. With them, it wraps them in an `inline-flex` box |
| `layer` | `'over'` | With children, whether the particles are drawn over them or behind them |
| `bleed` | `0` | Pixels the particles are drawn past the field's edges, on every side |
| `paused` | `false` | Stops new particles being born; the ones in the air see out their lives |
| `seed` | random | Seeds the random numbers, so the field draws the same particles each time it mounts |
| `tint` | provider's | What `var(--lq-particle-tint)` in a colour list stands for |
| `ref` | | A `ParticleFieldHandle` whose `burst(count)` bears that many particles at once — a confetti cannon with `rate: 0` |
| `className`, `style` | | On the field, or on the wrapper when there are children |

A `ParticleConfig` is what Vortex's `VortexSystem` is: how many are born a second
(`rate`), how fast and which way they set off (`speed`, `angle`, `spread`), what pulls
them (`gravity`, `drag`), how long they live (`lifetime`), how big they are and become
(`size`, `sizeAtDeath`), their `colors`, their `shape`, and where they are born
(`emitter`: `'top'`, `'bottom'`, `'center'`, `'area'` or a box in shares of the field).
Each number that varies has a `…Variation`. `depth` makes some particles look further
away — smaller, slower, fainter — `sway` drifts them side to side, `twinkle` flickers
them, and `explode` bursts one into a new set when its life runs out, which is how a
firework's rocket becomes sparks. `prewarm` runs the field on before its first frame so
it opens full. A config can change while the field runs: particles already alive keep
the config they were born with, so one preset gives way to the next. Every field keeps
at most its config's `limit` alive, and never more than `MAX_PARTICLES` (1500).

The shapes are `bead` and `bubble`, drawn as small glass with a lit rim and a point of
light; `flake`, `spark` and `sparkle`, which glow; `streak`, a line along the way it
moves; `confetti`, a strip that tumbles; and a plain `circle`.

It is drawn with a 2D canvas rather than WebGL: a few hundred particles a frame are a
few hundred stamps of sprites painted once per colour, which a 2D canvas does without
trouble, while every WebGL context counts against the browser's limit of about sixteen
a page that liquefy-ui's own glass shaders already draw on. The glass in front does the
refracting. The field is `aria-hidden` and clear of the pointer, stops drawing while it
is off screen or its tab is in the background, and runs on a clock of its own that only
moves when a frame is drawn. With `motion={false}` on the provider there are no
particles at all.

### The particles on their own

`ParticleSystem` is the field with no DOM attached: `resize` it to the field, `step`
it every frame, and `each` hands back every particle as it should be drawn. `burst`,
`warm`, `setConfig` and `emitting` are what the component uses. Its random numbers come
from one source, which a `seed` (or `createRandom(seed)`) makes repeatable, so the same
seed and the same steps draw the same particles. `PARTICLE_PRESETS` and
`particleConfig(preset, overrides)` give the presets as plain data.

## FluidBackdrop

Moving water with colour poured in, to lay glass over. Move a pointer over it and the
colour swirls after it; leave it and it keeps turning, stirred slowly by itself. The
glass on top bends and frosts whatever moves underneath, which is what it is for.

```tsx
import { FluidBackdrop } from '@liquefy-ui/lab'
import { LiquidSurface } from '@liquefy-ui/react'

<FluidBackdrop colors={['#0fb5ae', '#1f6fe0', '#7fe3c4', '#f2c14e']} style={{ height: 420 }}>
  <LiquidSurface radius={28}>…</LiquidSurface>
</FluidBackdrop>
```

| Prop | Default | |
| --- | --- | --- |
| `colors` | the tint, spread | The colours poured in, any CSS colours — `var(--lq-accent)` and `oklch()` included |
| `tint` | provider `tint` | Spread into four neighbouring hues when there are no `colors`. A grey tint gives shades of grey |
| `background` | a deep shade of the first colour | What the colour floats on |
| `speed` | `1` | How fast time runs. `0` holds the water still |
| `stir` | `0.5` | 0 to 1: how hard the water stirs itself when nobody is touching it |
| `interactive` | `true` | Whether a pointer over it stirs it |
| `pressureIterations` | `20` | Jacobi iterations of the pressure solve per frame, 1 to 80 |
| `vorticity` | `12` | How strongly small eddies are kept spinning, 0 to 80 |
| `fade` | `0.4` | How fast the colour fades, per second |
| `resolution` | `128` | Cells across the short side of the velocity grid, 16 to 512 |
| `dyeResolution` | `512` | Cells across the short side of the colour, 32 to 2048 — never more than the canvas has pixels |
| `maxPixelRatio` | `1` | Most device pixels per CSS pixel the canvas is drawn at |
| `children`, `className`, `style`, `styles` | | Laid over the water. It is `position: relative` with `isolation: isolate`; make it `position: fixed; inset: 0` for a page background |

The water is Jos Stam's stable fluids ("Stable Fluids", SIGGRAPH 1999) run as
fragment-shader passes, the way Pavel Dobryakov's
[WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) runs it
in a browser; the code here is written from the algorithm, not taken from that project.
Each frame the stirrers and the pointer push the water and drop colour, the curl is fed
back as vorticity confinement, a pressure field is relaxed by Jacobi iteration and its
gradient taken off the velocity so the water does not compress, and the velocity, then
the colour, are carried along by it. The pointer is read from `window`, so it stirs
through whatever is laid over the backdrop — glass, buttons, text — which still get every
event; nothing is captured or prevented, and a page that scrolls on touch still scrolls.

**What it costs.** Every frame is `10 + pressureIterations` full passes over the velocity
grid (about 29 000 cells at the default 128 on a 16:9 canvas), two over the colour
(about 470 000) and one over the canvas. On the software renderer this was built against
(SwiftShader, two CPU cores, no GPU), a 728×420 backdrop took about 80 ms a frame — real
GPUs have not been measured. Turn `pressureIterations`, `resolution` and `dyeResolution`
down for weak hardware; the colour only looks softer. Each backdrop owns a WebGL context,
and browsers keep about sixteen, so keep one or two on a page.

**When it stops.** No frames are asked for while the backdrop is off screen or the tab
is in the background, and its clock moves only by the frames it is shown, so it carries
on from where it was rather than jumping. With `motion={false}` on the provider it is
one still picture — the water run on a second and a half and held — and the pointer does
nothing. Like the rest of liquefy-ui it does not read `prefers-reduced-motion`; map that
to `motion` if the app wants to.

**Where it cannot run.** Without floating-point render targets the colour is kept in
8-bit textures and carried by a flow written in closed form — the stirrers and the
pointer's strokes as vortices — with no simulation behind it: softer, still moving. A
lost context shows the stand-in below until the browser gives it back, then pours again.
Without WebGL2, on the server, and before the first frame, it is still pools of the same
colours in CSS. The root carries `data-fluid-tier` (`solver`, `vortices` or `fallback`)
to say which.

## MeshGradient

A gradient in the manner of SwiftUI's `MeshGradient`: a colour on every point of a
grid, blended smoothly between them, and the points drifting slowly round their places so
the colour flows. Corner points stay put and edge points slide along their edge, so the
colour always reaches every side. Far lighter than `FluidBackdrop` — nothing is
simulated.

```tsx
import { MeshGradient } from '@liquefy-ui/lab'

<MeshGradient
  colors={['#f4683c', '#f9b16e', '#d63d6b', '#4a5fd8', '#f08aa6', '#e9822b']}
  columns={3}
  rows={3}
  style={{ height: 400 }}
>
  …
</MeshGradient>
```

| Prop | Default | |
| --- | --- | --- |
| `colors` | the tint, spread | One CSS colour per point, row by row. A shorter list is repeated with each row starting further along, so neighbours differ |
| `tint` | provider `tint` | Spread into neighbouring hues when there are no `colors` |
| `columns`, `rows` | `3`, `3` | Points across and down, 2 to 8 each |
| `speed` | `1` | How fast the points drift; a point swings round every eight to sixteen seconds. `0` holds them still |
| `wander` | `0.3` | How far a point strays from its place, in cells, 0 to 0.45. Below half a cell neighbours never cross |
| `maxPixelRatio` | `1` | Most device pixels per CSS pixel the canvas is drawn at |
| `children`, `className`, `style`, `styles` | | As on `FluidBackdrop` |

The surface through the points is a Catmull–Rom patch each way, so it passes through
every point with no crease at the seams, and colours are blended in OKLab, so the way
between two vivid colours stays vivid. It is cut into about 2 500 vertices whatever the
grid and drawn as one indexed WebGL2 call a frame; the points are moved on the CPU,
which is a few thousand multiply-adds. On SwiftShader it took about 5 ms a frame (real
GPUs not measured). Without WebGL2 it is drawn on a 2D canvas 160 pixels across, by a
small rasterizer in script, and scaled up by the browser — a gradient has nothing sharp
to lose. On the server and before its first frame it is a CSS stand-in in the same
colours; `data-mesh-mode` says `webgl`, `canvas` or `fallback`. It stops off screen and in
a background tab, and `motion={false}` holds the points still, as `FluidBackdrop` does.

### The motion on its own

`MeshMotion` is the drift with no DOM attached: `new MeshMotion(columns, rows, wander)`,
and `points(time)` gives every point's position, row by row, as fractions of the
gradient. `MESH_DEFAULTS` and `FLUID_DEFAULTS` hold the defaults above.
