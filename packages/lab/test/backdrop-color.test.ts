import { describe, expect, it } from 'vitest'
import {
  cssColor,
  deepShade,
  fromOklab,
  fromOklch,
  mixColors,
  parseColor,
  tintPalette,
  toOklab,
  toOklch,
  type BackdropRgb,
} from '../src/backdrop-color'

const close = (actual: readonly number[], expected: readonly number[], digits = 3) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index] ?? Number.NaN, digits))
}

describe('parseColor', () => {
  it('reads every length of hex', () => {
    close(parseColor('#fff') ?? [], [1, 1, 1])
    close(parseColor('#0a84ff') ?? [], [10 / 255, 132 / 255, 1])
    close(parseColor('#0A84FF80') ?? [], [10 / 255, 132 / 255, 1])
    close(parseColor('#f008') ?? [], [1, 0, 0])
  })

  it('reads rgb() with commas, with spaces and a slash, and in percentages', () => {
    close(parseColor('rgb(10, 132, 255)') ?? [], [10 / 255, 132 / 255, 1])
    close(parseColor('rgba(10, 132, 255, 0.5)') ?? [], [10 / 255, 132 / 255, 1])
    close(parseColor('rgb(10 132 255 / 50%)') ?? [], [10 / 255, 132 / 255, 1])
    close(parseColor('rgb(100%, 50%, 0%)') ?? [], [1, 0.5, 0])
  })

  it('leaves anything it cannot read to the browser', () => {
    expect(parseColor('rebeccapurple')).toBeNull()
    expect(parseColor('var(--lq-accent)')).toBeNull()
    expect(parseColor('oklch(0.7 0.1 200)')).toBeNull()
    expect(parseColor('#12')).toBeNull()
    expect(parseColor('rgb(1, 2)')).toBeNull()
  })
})

describe('OKLab', () => {
  it('round-trips sRGB', () => {
    for (const color of [[0, 0, 0], [1, 1, 1], [1, 0, 0], [0.04, 0.52, 1], [0.95, 0.75, 0.3]] as BackdropRgb[]) {
      close(fromOklab(toOklab(color)), color, 4)
    }
  })

  it('puts white at full lightness with no chroma', () => {
    const [lightness, chroma] = toOklch([1, 1, 1])
    expect(lightness).toBeCloseTo(1, 3)
    expect(chroma).toBeCloseTo(0, 3)
  })

  it('keeps a colour outside sRGB on its hue and lightness instead of clipping it', () => {
    const color = fromOklch(0.7, 0.4, 150)
    for (const channel of color) {
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(1)
    }
    const [lightness, , hue] = toOklch(color)
    expect(lightness).toBeCloseTo(0.7, 2)
    expect(hue).toBeCloseTo(150, 0)
  })
})

describe('tintPalette', () => {
  it('spreads a tint into neighbouring hues around it', () => {
    const blue: BackdropRgb = [0.04, 0.52, 1]
    const [, , tintHue] = toOklch(blue)
    const palette = tintPalette(blue, 4)
    expect(palette).toHaveLength(4)
    const hues = palette.map((color) => toOklch(color)[2])
    // From one side of the tint to the other.
    expect(hues[0]).toBeLessThan(tintHue)
    expect(hues[3]).toBeGreaterThan(tintHue)
    for (const hue of hues) expect(Math.abs(hue - tintHue)).toBeLessThanOrEqual(41)
    for (const color of palette) expect(toOklch(color)[1]).toBeGreaterThan(0.05)
  })

  it('gives shades of grey for a grey tint, from dark to light', () => {
    const palette = tintPalette([0.56, 0.56, 0.56], 4)
    for (const [r, g, b] of palette) {
      expect(Math.abs(r - g)).toBeLessThan(0.01)
      expect(Math.abs(g - b)).toBeLessThan(0.01)
    }
    const lightness = palette.map((color) => toOklch(color)[0])
    expect([...lightness].sort((a, b) => a - b)).toEqual(lightness)
  })

  it('asks for at least one colour', () => {
    expect(tintPalette([1, 0, 0], 0)).toHaveLength(1)
  })
})

describe('deepShade', () => {
  it('is nearly black but keeps the hue', () => {
    const shade = deepShade([0.04, 0.52, 1])
    const [lightness] = toOklch(shade)
    expect(lightness).toBeCloseTo(0.17, 2)
    expect(shade[2]).toBeGreaterThan(shade[0])
  })
})

describe('mixColors', () => {
  it('returns each end at 0 and 1', () => {
    close(mixColors([1, 0, 0], [0, 0, 1], 0), [1, 0, 0])
    close(mixColors([1, 0, 0], [0, 0, 1], 1), [0, 0, 1])
  })

  it('stays more vivid through the middle than a mix of the bytes', () => {
    const middle = mixColors([1, 0, 0], [0, 1, 0], 0.5)
    expect(toOklch(middle)[1]).toBeGreaterThan(toOklch([0.5, 0.5, 0])[1])
  })
})

describe('cssColor', () => {
  it('writes bytes', () => {
    expect(cssColor([1, 0.5, 0])).toBe('rgb(255, 128, 0)')
  })
})
