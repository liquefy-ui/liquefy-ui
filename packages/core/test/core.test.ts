import { describe, expect, it } from 'vitest'
import { clamp, hexToRgb, mapRange, SpringValue } from '../src'

describe('core math', () => {
  it('clamps values', () => {
    expect(clamp(2)).toBe(1)
    expect(clamp(-1)).toBe(0)
  })

  it('maps ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50)
  })

  it('parses short hex colors', () => {
    expect(hexToRgb('#fff')).toEqual([1, 1, 1])
  })
})

describe('SpringValue', () => {
  it('converges on its target', () => {
    const spring = new SpringValue(0)
    spring.setTarget(1)
    for (let index = 0; index < 300; index += 1) spring.step(1 / 60)
    expect(spring.current).toBeCloseTo(1, 3)
  })
})
