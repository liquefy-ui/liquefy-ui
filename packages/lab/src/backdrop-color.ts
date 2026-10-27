import { clamp } from '@liquefy-ui/core'

/** A colour as red, green and blue from 0 to 1, in sRGB. */
export type BackdropRgb = readonly [number, number, number]

/** A colour in OKLab: lightness from 0 to 1, and two opponent axes. */
type Lab = readonly [number, number, number]

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB_FUNCTION = /^rgba?\(\s*([^)]*)\)$/i

/**
 * Reads a colour written as hex or `rgb()`, the two forms a browser hands
 * back from `getComputedStyle`. Anything else — a name, `oklch()`, a custom
 * property — is `null`, and has to go through `readColors` instead.
 */
export const parseColor = (value: string): BackdropRgb | null => {
  const text = value.trim()
  const hex = HEX.exec(text)?.[1]
  if (hex) {
    const digits = hex.length <= 4 ? [...hex].map((digit) => digit + digit) : hex.match(/../g) ?? []
    const [r = 0, g = 0, b = 0] = digits.slice(0, 3).map((pair) => Number.parseInt(pair, 16) / 255)
    return [r, g, b]
  }

  const body = RGB_FUNCTION.exec(text)?.[1]
  if (!body) return null
  // Both `rgb(10, 132, 255)` and `rgb(10 132 255 / 50%)`; the alpha is dropped.
  const channels = body.split('/')[0]?.split(/[\s,]+/).filter(Boolean) ?? []
  if (channels.length < 3) return null
  const rgb = channels.slice(0, 3).map((channel) => {
    const number = Number.parseFloat(channel)
    return channel.endsWith('%') ? number / 100 : number / 255
  })
  if (rgb.some((channel) => !Number.isFinite(channel))) return null
  const [r = 0, g = 0, b = 0] = rgb.map((channel) => clamp(channel))
  return [r, g, b]
}

let probe: CanvasRenderingContext2D | null = null

/**
 * Resolves CSS colours of any form — a hex, a name, `oklch()`,
 * `var(--lq-accent)` — to sRGB, as the browser sees them from `element`.
 * Each is set on the element's `color`, read back computed, and painted onto
 * one pixel to turn whatever syntax the browser returned into bytes. Without
 * a 2D canvas (on the server, in jsdom) only hex and `rgb()` are understood,
 * and anything else is left out.
 */
export const readColors = (element: HTMLElement, colors: readonly string[]): BackdropRgb[] => {
  if (!probe) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    probe = canvas.getContext('2d', { willReadFrequently: true })
  }
  const saved = element.style.color
  const resolved: BackdropRgb[] = []
  for (const color of colors) {
    element.style.color = ''
    element.style.color = color
    // An invalid colour leaves the property empty rather than throwing.
    if (!element.style.color) {
      const parsed = parseColor(color)
      if (parsed) resolved.push(parsed)
      continue
    }
    const computed = getComputedStyle(element).color
    if (probe) {
      probe.clearRect(0, 0, 1, 1)
      probe.fillStyle = computed
      probe.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data
      resolved.push([r / 255, g / 255, b / 255])
      continue
    }
    const parsed = parseColor(computed) ?? parseColor(color)
    if (parsed) resolved.push(parsed)
  }
  element.style.color = saved
  return resolved
}

const toLinear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const toGamma = (channel: number): number =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

/** sRGB to OKLab (Björn Ottosson, 2020). */
export const toOklab = ([red, green, blue]: BackdropRgb): Lab => {
  const r = toLinear(red)
  const g = toLinear(green)
  const b = toLinear(blue)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** OKLab to sRGB, unclamped: a channel outside 0 to 1 means the colour is out of gamut. */
const fromOklabRaw = ([lightness, a, b]: Lab): BackdropRgb => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** OKLab to sRGB, clamped into the displayable range. */
export const fromOklab = (lab: Lab): BackdropRgb => {
  const [r, g, b] = fromOklabRaw(lab)
  return [clamp(Number.isNaN(r) ? 0 : r), clamp(Number.isNaN(g) ? 0 : g), clamp(Number.isNaN(b) ? 0 : b)]
}

const inGamut = (rgb: BackdropRgb): boolean => rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4)

/**
 * A colour from OKLCH, with its chroma pulled in until it fits sRGB — so a
 * hue keeps its hue and lightness instead of clipping into a different one.
 */
export const fromOklch = (lightness: number, chroma: number, hue: number): BackdropRgb => {
  const angle = (hue * Math.PI) / 180
  const at = (c: number): BackdropRgb => fromOklabRaw([lightness, c * Math.cos(angle), c * Math.sin(angle)])
  if (inGamut(at(chroma))) return fromOklab([lightness, chroma * Math.cos(angle), chroma * Math.sin(angle)])
  let low = 0
  let high = chroma
  for (let index = 0; index < 18; index += 1) {
    const middle = (low + high) / 2
    if (inGamut(at(middle))) low = middle
    else high = middle
  }
  return fromOklab([lightness, low * Math.cos(angle), low * Math.sin(angle)])
}

/** Lightness, chroma and hue in degrees. */
export const toOklch = (rgb: BackdropRgb): readonly [number, number, number] => {
  const [lightness, a, b] = toOklab(rgb)
  const hue = (Math.atan2(b, a) * 180) / Math.PI
  return [lightness, Math.hypot(a, b), hue < 0 ? hue + 360 : hue]
}

/** Below this chroma a tint reads as grey, and has no hue to spread. */
const GREY = 0.03

/**
 * A palette of `count` colours spread from one tint: its neighbours round the
 * hue wheel either side, at a spread of lightness, so a single brand colour
 * gives a backdrop that still reads as that colour. A grey tint — the
 * provider's default — has no hue to spread and gives shades of grey.
 */
export const tintPalette = (tint: BackdropRgb, count = 4): BackdropRgb[] => {
  const [lightness, chroma, hue] = toOklch(tint)
  const size = Math.max(1, Math.round(count))
  return Array.from({ length: size }, (_, index) => {
    // From one side of the tint to the other, with the tint itself in the middle.
    const spread = size === 1 ? 0 : index / (size - 1) - 0.5
    const level = clamp(lightness + (index % 2 === 0 ? -0.08 : 0.1) - spread * 0.06, 0.32, 0.86)
    if (chroma < GREY) return fromOklch(clamp(0.3 + 0.5 * (size === 1 ? 0.5 : index / (size - 1))), chroma, hue)
    return fromOklch(level, Math.max(chroma, 0.11), hue + spread * 80)
  })
}

/**
 * The deep, quiet shade of a colour that a backdrop sits on: nearly black,
 * with only enough of the colour's hue left to keep it from reading as a
 * hole in the page.
 */
export const deepShade = (color: BackdropRgb): BackdropRgb => {
  const [, chroma, hue] = toOklch(color)
  return fromOklch(0.17, Math.min(chroma * 0.4, 0.035), hue)
}

/** Mixes two colours in OKLab, so the middle of two saturated colours stays saturated. */
export const mixColors = (from: BackdropRgb, to: BackdropRgb, amount: number): BackdropRgb => {
  const a = toOklab(from)
  const b = toOklab(to)
  const t = clamp(amount)
  return fromOklab([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
}

/** A colour as `rgb()` for CSS. */
export const cssColor = ([r, g, b]: BackdropRgb): string =>
  `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
