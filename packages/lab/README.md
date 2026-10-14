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

A round glass trigger that buds its items off one at a time. Each droplet stretches
along the way it is travelling, swings past its place and jiggles to rest; closing
calls them home in reverse.

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
| `items` | — | `{ icon, label, onSelect?, disabled? }[]`. `label` is the droplet's accessible name, tooltip and typeahead text |
| `icon`, `label` | — | The trigger's icon and accessible name |
| `iconTurn` | `0` | Degrees the trigger's icon turns while open — `45` turns a plus into a close mark |
| `placement` | `'around'` | Where the droplets land: `around`, `top`, `bottom`, `left`, `right`, or a quarter arc such as `top-left` for a trigger in the bottom-right corner |
| `radius` | fitted | Distance from the trigger's centre to each droplet's. Defaults to the closest that keeps neighbours apart |
| `stagger` | `120` | Milliseconds between one droplet leaving and the next |
| `size` | `'lg'` | The trigger's size; droplets are one size down |
| `open`, `defaultOpen`, `onOpenChange` | | Controlled or uncontrolled. A controlled close still plays the return |
| `tint`, `className`, `style`, `styles` | | As on every `@liquefy-ui/react` component |

Behaviour is Base UI's menu: arrow keys move through the droplets in the order they
land (clockwise), typeahead matches labels, Escape closes and focus goes back to
the trigger. A disabled item stays reachable with `aria-disabled`, as the WAI-ARIA
menu pattern asks, and does nothing when chosen. The popup stays mounted until the
last droplet is home, while `aria-expanded` turns false the moment it closes.

With `motion={false}` on the provider, or `prefers-reduced-motion: reduce`, the
droplets appear and disappear in place.

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

With `motion={false}` on the provider, or `prefers-reduced-motion: reduce`, the
level moves straight to its mark with a still surface and no lean. The animation
loop stops once the liquid is still, and while the vessel is scrolled out of view.

### The simulation on its own

`LiquidLevelSimulation` is the liquid with no DOM attached: an underdamped spring
for the level, a spring for the lean, and a one-dimensional heightfield for the
surface — a row of columns pulled toward their neighbours by the wave equation and
slowed by damping, so a kick travels across, reflects off the walls and fades.
Heights are fractions of the vessel's height, which keeps the waves in proportion
at any size. Like `DropletChoreography`, it keeps a clock that only moves when a
frame is stepped, and a long frame counts as a short one.
