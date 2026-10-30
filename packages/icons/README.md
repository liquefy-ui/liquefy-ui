# @liquefy-ui/icons

React SVG icons with the rounded geometry and consistent strokes used throughout liquefy-ui.

```tsx
import { ArrowRightIcon, SparklesIcon } from '@liquefy-ui/icons'
```

Every icon is tree-shakeable in ESM builds and accepts `size`, `strokeWidth`, and standard SVG props.

## Effects

SF Symbols' symbol effects for these icons — bounce, wiggle, breathe, rotate,
Draw On and Draw Off, and Magic Replace — from a second entry point:

```tsx
import { BellIcon, CircleCheckIcon, LockIcon, LockOpenIcon, SettingsIcon } from '@liquefy-ui/icons'
import { IconEffect, MagicReplace } from '@liquefy-ui/icons/effects'

// Once, each time the value changes (SF Symbols' `value:`)
<IconEffect direction="clockwise" effect="wiggle" trigger={unread}>
  <BellIcon />
</IconEffect>

// Over and over while true, then to rest (SF Symbols' `isActive:`)
<IconEffect active={syncing} effect="rotate">
  <SettingsIcon />
</IconEffect>

// Draw On when `drawn` turns true, Draw Off when it turns false
<IconEffect drawn={saved} effect="draw">
  <CircleCheckIcon />
</IconEffect>

// Keeps what the two icons share and changes the rest
<MagicReplace>{locked ? <LockIcon /> : <LockOpenIcon />}</MagicReplace>
```

The icons stay plain, stateless components: they render on a React server and
cost a bundle only the ones it imports. Everything that moves is in
`@liquefy-ui/icons/effects`, which carries a `'use client'` directive and is only
paid for by an app that imports it. Neither entry depends on anything but React.

Each effect is a spring worked out in closed form and sampled into Web Animations
keyframes, so the browser plays it on its own clock and a busy main thread does not
make it stutter. Springs overshoot and settle, and a loop that is switched off comes
to rest instead of stopping dead: a spin finishes its turn and swings past upright, a
breath sinks back. The wrapper is a `display: contents` span, so wrapping an icon
moves nothing around it, and transforms are added to the icon's own, so effects
nest — an icon can spin and bounce at once.

### `IconEffect`

| Prop | Default | |
| --- | --- | --- |
| `effect` | — | `bounce`, `wiggle`, `breathe`, `rotate` or `draw` |
| `trigger` | — | Plays the effect once each time it changes (compared with `Object.is`), never on mount. For `draw`, draws the icon on afresh |
| `active` | `false` | Plays the effect over and over while true, and brings it to rest when it turns false. Not for `draw` |
| `direction` | per effect | `bounce`: `up` (crouch and hop) or `down` (pressed in, springs back). `wiggle`: `left`, `right`, `up`, `down`, `clockwise`, `counterClockwise`, or a heading in degrees clockwise from right. `rotate`: `clockwise` or `counterClockwise` |
| `angle` | `12` | `wiggle` only: how far a `clockwise` or `counterClockwise` wiggle rocks, in degrees |
| `drawn` | `true` | `draw` only: whether the icon is drawn. False on mount renders it hidden — on the server too — keeping its space |
| `strokes` | `'sequential'` | `draw` only: one stroke after another in the order the icon was written, or `together` |
| `speed` | `1` | How fast it plays: `2` is twice as fast |
| `motion` | provider | `false` holds the icon still, and a drawing goes straight to where `drawn` says |

Draw On traces each stroke in the order it was written, taking time in proportion to
its length; Draw Off takes them away in reverse, last stroke first. Turned round
mid-way, it goes back from where it is. A browser restarts a dash pattern at every
moveto, so while a path with several strokes is being drawn it is stood in for by one
copy per stroke, and given back as written when the drawing ends.

### `MagicReplace`

Change its child — a different icon, or the same one with a new `key` — and it
changes from one to the other.

| Prop | Default | |
| --- | --- | --- |
| `transition` | `'magic'` | `magic` keeps what the two share; `scale` shrinks the old one away as the new one grows in; `draw` draws the old one off, then the new one on |
| `fallback` | `'scale'` | What `magic` does when the two icons share nothing: `scale` or `draw` |
| `speed` | `1` | How fast the change plays |
| `motion` | provider | `false` swaps the icons at once |

`magic` lines the two icons up stroke by stroke. A stroke drawn exactly alike in both
stays where it is; strokes written with the same commands bend into each other on a
spring; the rest draw off and on. The lock opening keeps its body and lifts its
shackle, the status marks keep their circle and redraw what is inside it, and a
chevron turns over. Two icons with no stroke in common get the `fallback` — and so
do the strokes that would bend, in a browser that cannot animate the `d` property
(Safari), where they draw off and on instead.

### Motion

Left out, `motion` follows the nearest `LiquefyProvider`: the provider writes
`data-liquid-motion` on its element, and the effects read it from the page when they
play and watch it while a loop runs, so `<LiquefyProvider motion={false}>` stills
every icon under it without this package depending on `@liquefy-ui/react`. Outside a
provider they move. Like the components, they never read `prefers-reduced-motion`; an
app that wants to honour it passes `motion` from that media query, to the provider
or to an effect.
