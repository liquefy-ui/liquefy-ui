/**
 * Colours for drawing *with* the accent — text, icons, rings, indicators —
 * that stay readable whatever tint the provider is given.
 *
 * The stylesheet draws those parts with the tint, often lifted toward white.
 * That reads well on a dark page and vanishes on a light one when the tint
 * is white or pale. So the provider works out, per theme, whether the tint
 * clears the contrast a part needs against that theme's page fill, and only
 * when it does not, the nearest colour that does: the tint pushed toward the
 * theme's text colour, just far enough. A tint that already clears it gets
 * nothing, and every part keeps drawing exactly as it did.
 *
 * - `ink` is for text: 4.5:1.
 * - `line` is for everything else — rings, indicators, icons: 3:1, checked
 *   with the tint already lifted 18% toward white, the most any of those
 *   parts lifts it.
 */

type Rgb = readonly [number, number, number]

export type AccentInkTheme = 'dark' | 'light'

/** What the provider writes: a colour, or `initial` where the tint is fine as it is. */
export type AccentInk = Record<
  | '--lq-accent-ink-dark'
  | '--lq-accent-ink-light'
  | '--lq-accent-line-dark'
  | '--lq-accent-line-light',
  string
>

/** The page each theme's default tokens describe, and its text colour. */
const THEMES: Record<AccentInkTheme, { page: Rgb; text: Rgb }> = {
  dark: { page: [30, 38, 60], text: [248, 250, 255] },
  light: { page: [233, 235, 240], text: [29, 29, 31] },
}

export const ACCENT_INK_CONTRAST = 4.5
export const ACCENT_LINE_CONTRAST = 3
/** The largest lift toward white any accent-drawn part applies (gauge and spinner arcs). */
const LINE_LIFT = 0.18

const WHITE: Rgb = [255, 255, 255]

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

/** `#rgb`, `#rrggbb` (alpha ignored) or `rgb()`/`rgba()`; `null` for anything else. */
export const parseTint = (tint: string): Rgb | null => {
  const value = tint.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value)?.[1]
  if (hex) {
    const full = hex.length <= 4 ? [...hex.slice(0, 3)].map((digit) => digit + digit).join('') : hex.slice(0, 6)
    return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16)) as unknown as Rgb
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value)?.[1]
  if (!rgb) return null
  const parts = rgb.split(/[\s,/]+/).filter(Boolean).slice(0, 3)
  if (parts.length < 3) return null
  const channels = parts.map((part) =>
    part.endsWith('%') ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part))
  return channels.every((channel) => Number.isFinite(channel))
    ? (channels.map((channel) => clamp(channel, 0, 255)) as unknown as Rgb)
    : null
}

const linear = (channel: number) => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const gamma = (value: number) =>
  255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055)

const luminance = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

/** The WCAG 2 contrast ratio of two opaque colours. */
export const contrast = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

const toOklab = ([r, g, b]: Rgb): Rgb => {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363015887 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const fromOklab = ([L, a, b]: Rgb): Rgb => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => clamp(gamma(clamp(channel)), 0, 255)) as unknown as Rgb
}

/** `from` moved `amount` of the way to `to`, in OKLab so the hue holds on the way. */
const mixOklab = (from: Rgb, to: Rgb, amount: number): Rgb => {
  const a = toOklab(from)
  const b = toOklab(to)
  return fromOklab(a.map((channel, index) => channel + (b[index]! - channel) * amount) as unknown as Rgb)
}

/** Plain sRGB mixing, which is what the stylesheet's `color-mix(in srgb, …)` does. */
const mixSrgb = (from: Rgb, to: Rgb, amount: number): Rgb =>
  from.map((channel, index) => channel + (to[index]! - channel) * amount) as unknown as Rgb

const hex = (color: Rgb) =>
  `#${color.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`

/**
 * The tint, or the least move toward `text` that makes `passes` true. Null
 * when the tint passes as it is.
 */
const nearestPassing = (tint: Rgb, text: Rgb, test: (color: Rgb) => boolean): Rgb | null => {
  // Judged as written out — whole channels — so the hex the stylesheet gets is the colour that passed.
  const passes = (color: Rgb) => test(color.map(Math.round) as unknown as Rgb)
  if (passes(tint)) return null
  let low = 0
  let high = 1
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2
    if (passes(mixOklab(tint, text, middle))) high = middle
    else low = middle
  }
  return mixOklab(tint, text, high)
}

/** The colours one theme needs for this tint, or null where the tint already works. */
export const accentInkFor = (tint: string, theme: AccentInkTheme): { ink: string | null; line: string | null } => {
  const color = parseTint(tint)
  if (!color) return { ink: null, line: null }
  const { page, text } = THEMES[theme]
  const ink = nearestPassing(color, text, (candidate) => contrast(candidate, page) >= ACCENT_INK_CONTRAST)
  const line = nearestPassing(color, text, (candidate) =>
    contrast(candidate, page) >= ACCENT_LINE_CONTRAST
    && contrast(mixSrgb(candidate, WHITE, LINE_LIFT), page) >= ACCENT_LINE_CONTRAST)
  return { ink: ink && hex(ink), line: line && hex(line) }
}

/**
 * The four custom properties the provider writes. `initial` leaves a theme's
 * `--lq-accent-ink` / `--lq-accent-line` unset, so the stylesheet falls back
 * to drawing with the tint as it always has — and a nested provider does not
 * inherit an outer one's correction for a different tint.
 */
export const accentInkProperties = (tint: string): AccentInk => {
  const light = accentInkFor(tint, 'light')
  const dark = accentInkFor(tint, 'dark')
  return {
    '--lq-accent-ink-dark': dark.ink ?? 'initial',
    '--lq-accent-ink-light': light.ink ?? 'initial',
    '--lq-accent-line-dark': dark.line ?? 'initial',
    '--lq-accent-line-light': light.line ?? 'initial',
  }
}
