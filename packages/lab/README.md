# @liquefy-ui/lab

Experimental, motion-heavy components built on `@liquefy-ui/react`. The glass is
the same material; what lab adds is choreography — surfaces that split off, travel
and settle rather than only wobble in place.

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

In Chromium the refraction, the merged outline and the lit rim are all built inside
one SVG backdrop filter (`mode: 'lens'`). Safari and Firefox, and a provider with
`lens` or `transparency` off, get the element clipped to the merged outline over
the usual frost or a solid fill (`mode: 'outline'`).

Nothing above the surface may have `opacity`, `filter`, `clip-path`, `mask` or
`will-change: opacity`: each of those makes the glass see only what is inside it,
which is nothing. Fade or clip the content, never a wrapper around the glass.

### The timeline on its own

`DropletChoreography` is the motion model with no DOM attached — springs for each
droplet's position and size, the trigger's squash, and a stagger clock that only
advances when a frame is stepped, so a main-thread stall slows the sequence down
rather than releasing every droplet at once. `dropletOffsets` and `dropletRadius`
are the layout. They are exported for building other droplet-shaped components.
