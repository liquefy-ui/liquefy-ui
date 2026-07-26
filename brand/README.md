# Brand

Three files, one shape. The mark is the docs header's `.brand-mark` — two glass
capsules, each rotated -29°, lit along a 150° gradient — drawn once here so that
a tab, a README and a social card all show the same thing.

| File | Use it for |
| --- | --- |
| `liquefy-mark.svg` | The mark at display size — generous padding, soft shadow. Square, transparent, 64×64 |
| `liquefy-icon.svg` | The same mark tuned for 16–32px — cropped closer, deeper colour, a contact shadow that survives being shrunk. Favicon, npm avatar, home screen |
| `liquefy-logo.svg` | The full lockup on a light background |
| `liquefy-logo-dark.svg` | The full lockup on a dark background |

The two lockups differ only in the colour of the wordmark. There is no
theme-aware single file on purpose: an SVG loaded through `<img>` cannot read the
page's theme, only the operating system's, which is the wrong answer half the
time. In Markdown, pick per theme:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/liquefy-logo-dark.svg">
  <img alt="liquefy-ui" src="brand/liquefy-logo.svg" width="260">
</picture>
```

## Colour

The glass is a neutral grey ramp — `#f1f2f3` to `#c1c2c5` to `#66676b`, with
`liquefy-icon.svg` a shade deeper so it survives being shrunk. Neutral on
purpose: the header's mark is tinted from `--lq-accent`, whose default here is
Graphite, so a coloured ramp in these files would sit next to a grey mark on the
same page. `test/brand.test.mjs` fails when a stop stops being grey.

## Clear space and size

Every file already carries its own padding — one shadow-width around the art —
so placing them flush against other content is fine. Below 96px wide, drop the
wordmark and use `liquefy-icon.svg`.

All four are transparent. Nothing here paints a background, so the mark sits on
whatever is behind it; the contact shadow under `liquefy-icon.svg` is what keeps
the two capsules apart on a light one.

## The wordmark

Manrope: 800 for `liquefy` at -0.045em, 600 for `ui`, matching `.brand` in
`apps/docs/src/styles.css`. Both are **outlined paths, not text** — the files
render identically without the font installed, which is the whole point of a
logo file. Editing the wording means re-outlining it, not editing a `<text>`
node.

## Changing them

The geometry is shared with the live header. If `.brand-mark` in
`apps/docs/src/styles.css` changes, these change with it, or the site and its own
logo drift apart — `test/brand.test.mjs` fails when they do.

`pnpm generate` copies this directory to `apps/docs/public/brand/`, which is how
the site serves the favicon. Edit the files here; the copies are throwaway.
