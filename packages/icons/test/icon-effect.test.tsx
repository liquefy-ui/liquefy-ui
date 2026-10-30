// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IconEffect, type IconEffectProps } from '../src/effects'
import { ADDED } from '../src/effects/dom'
import { ArrowRightIcon, CircleCheckIcon, HeartIcon } from '../src/index'
import { installAnimations } from './fake-animations'

let animations: ReturnType<typeof installAnimations>

beforeEach(() => {
  animations = installAnimations()
})

afterEach(() => {
  cleanup()
  animations.uninstall()
})

const svg = (container: HTMLElement) => container.querySelector('svg')!
const angleOf = (keyframe: Keyframe) => Number(/rotate\((-?[\d.]+)deg\)/.exec(String(keyframe.transform))?.[1])
const scaleOf = (keyframe: Keyframe) => Number(/scale\((-?[\d.]+),/.exec(String(keyframe.transform))?.[1])

/** An effect that can be re-rendered with new props, the way a parent would. */
const mount = (props: Omit<IconEffectProps, 'children'>, icon: ReactElement = <HeartIcon />) => {
  const view = render(<IconEffect {...(props as IconEffectProps)}>{icon}</IconEffect>)
  return {
    ...view,
    update: (next: Omit<IconEffectProps, 'children'>) =>
      view.rerender(<IconEffect {...(next as IconEffectProps)}>{icon}</IconEffect>),
  }
}

describe('a value that changes', () => {
  it('plays nothing on mount', () => {
    mount({ effect: 'bounce', trigger: 0 })
    expect(animations.played).toHaveLength(0)
  })

  it('plays once each time the value changes, and not when it stays the same', () => {
    const { container, update } = mount({ effect: 'bounce', trigger: 0 })
    update({ effect: 'bounce', trigger: 1 })
    expect(animations.played).toHaveLength(1)
    update({ effect: 'bounce', trigger: 1 })
    expect(animations.played).toHaveLength(1)
    update({ effect: 'bounce', trigger: 2 })
    expect(animations.played).toHaveLength(2)

    const [first] = animations.played
    expect(first!.element).toBe(svg(container))
    // Added on top of the icon's own transform, once, for exactly as long as the spring rings.
    expect(first!.options).toMatchObject({ composite: 'add', iterations: 1 })
    expect(first!.keyframes.length).toBeGreaterThan(20)
  })

  it('plays each effect on the icon it wraps', () => {
    for (const effect of ['bounce', 'wiggle', 'breathe', 'rotate'] as const) {
      const { container, unmount, update } = mount({ effect, trigger: 'a' })
      update({ effect, trigger: 'b' })
      const last = animations.played.at(-1)!
      expect(last.element, effect).toBe(svg(container))
      expect(last.keyframes.at(-1)!.transform, effect).toMatch(/^translate/)
      unmount()
    }
  })

  it('wraps the icon without a box of its own', () => {
    const { container } = mount({ effect: 'wiggle' })
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.display).toBe('contents')
    expect(wrapper.firstElementChild).toBe(svg(container))
  })

  it('cancels what is still playing when it unmounts', () => {
    const { unmount, update } = mount({ effect: 'wiggle', trigger: 0 })
    update({ effect: 'wiggle', trigger: 1 })
    unmount()
    expect(animations.played[0]!.cancel).toHaveBeenCalled()
  })
})

describe('a state that lasts', () => {
  it('loops while active', () => {
    mount({ active: true, effect: 'breathe' })
    expect(animations.running()).toHaveLength(1)
    expect(animations.played[0]!.options.iterations).toBe(Number.POSITIVE_INFINITY)
  })

  it('lets a spin finish its turn and swing past upright when it stops', () => {
    const { update } = mount({ active: true, effect: 'rotate' })
    const loop = animations.played[0]!
    loop.currentTime = 750
    update({ active: false, effect: 'rotate' })

    expect(loop.cancel).toHaveBeenCalled()
    const landing = animations.played[1]!
    expect(landing.options.iterations).toBe(1)
    // It picks up three quarters of the way round and ends a whole turn on.
    expect(angleOf(landing.keyframes[0]!)).toBe(270)
    expect(angleOf(landing.keyframes.at(-1)!)).toBeCloseTo(360, 0)
    expect(Math.max(...landing.keyframes.map(angleOf))).toBeGreaterThan(365)
  })

  it('lets a breath sink back rather than snapping', () => {
    const { update } = mount({ active: true, effect: 'breathe' })
    animations.played[0]!.currentTime = 1200
    update({ active: false, effect: 'breathe' })
    const settle = animations.played[1]!
    expect(scaleOf(settle.keyframes[0]!)).toBeCloseTo(1.1, 6)
    expect(scaleOf(settle.keyframes.at(-1)!)).toBeCloseTo(1, 2)
  })

  it('lets a repeating bounce land the hop it is in, and stops a resting one at once', () => {
    const { update } = mount({ active: true, effect: 'bounce' })
    const hopping = animations.played[0]!
    hopping.currentTime = 100
    update({ active: false, effect: 'bounce' })
    expect(hopping.effect.updateTiming).toHaveBeenCalledWith({ iterations: 1 })
    expect(hopping.cancel).not.toHaveBeenCalled()

    update({ active: true, effect: 'bounce' })
    const resting = animations.played.at(-1)!
    resting.currentTime = 1400
    update({ active: false, effect: 'bounce' })
    expect(resting.cancel).toHaveBeenCalled()
  })

  it('picks a spin up where it was coming to rest when it starts again', () => {
    const { update } = mount({ active: true, effect: 'rotate' })
    animations.played[0]!.currentTime = 500
    update({ active: false, effect: 'rotate' })
    const landing = animations.played[1]!
    landing.currentTime = 100
    update({ active: true, effect: 'rotate' })
    expect(landing.cancel).toHaveBeenCalled()
    // 180° plus a tenth of a second at 360° a second.
    expect(animations.played[2]!.currentTime).toBeCloseTo((216 / 360) * 1000, 6)
  })

  it('stops dead when it unmounts', () => {
    const { unmount } = mount({ active: true, effect: 'rotate' })
    unmount()
    expect(animations.played[0]!.cancel).toHaveBeenCalled()
    expect(animations.played).toHaveLength(1)
  })
})

describe('holding still', () => {
  it('plays nothing with motion off', () => {
    const { update } = mount({ active: true, effect: 'rotate', motion: false, trigger: 0 })
    update({ active: true, effect: 'rotate', motion: false, trigger: 1 })
    expect(animations.played).toHaveLength(0)
  })

  it('follows a provider above it that has motion off', () => {
    const { rerender } = render(
      <div data-liquid-motion="off">
        <IconEffect active effect="breathe" trigger={0}><HeartIcon /></IconEffect>
      </div>,
    )
    rerender(
      <div data-liquid-motion="off">
        <IconEffect active effect="breathe" trigger={1}><HeartIcon /></IconEffect>
      </div>,
    )
    expect(animations.played).toHaveLength(0)
  })

  it('lets its own motion prop overrule the provider', () => {
    render(
      <div data-liquid-motion="off">
        <IconEffect active effect="breathe" motion><HeartIcon /></IconEffect>
      </div>,
    )
    expect(animations.running()).toHaveLength(1)
  })

  it('stops a running loop the moment the provider turns motion off, and starts it again after', async () => {
    const { container } = render(
      <div data-liquid-motion="on">
        <IconEffect active effect="rotate"><HeartIcon /></IconEffect>
      </div>,
    )
    const provider = container.firstElementChild!
    expect(animations.running()).toHaveLength(1)

    await act(async () => {
      provider.setAttribute('data-liquid-motion', 'off')
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(animations.running()).toHaveLength(0)

    await act(async () => {
      provider.setAttribute('data-liquid-motion', 'on')
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(animations.running()).toHaveLength(1)
  })

  it('stays still where there is no Web Animations API', () => {
    animations.uninstall()
    const { update } = mount({ active: true, effect: 'rotate', trigger: 0 })
    expect(() => update({ active: true, effect: 'rotate', trigger: 1 })).not.toThrow()
  })
})

describe('draw', () => {
  const wrapper = (container: HTMLElement) => container.firstElementChild as HTMLElement

  it('renders hidden, keeping its space, when not drawn on mount', () => {
    const { container } = mount({ drawn: false, effect: 'draw' }, <CircleCheckIcon />)
    expect(wrapper(container).style.visibility).toBe('hidden')
    expect(animations.played).toHaveLength(0)
  })

  it('draws each stroke on in the order it was written, then gives the icon back as it was', async () => {
    const { container, update } = mount({ drawn: false, effect: 'draw' }, <CircleCheckIcon />)
    update({ drawn: true, effect: 'draw' })
    expect(wrapper(container).style.visibility).toBe('')

    const [circle, tick] = animations.played
    expect(circle!.element.localName).toBe('circle')
    expect(tick!.element.localName).toBe('path')
    expect(Number(tick!.options.delay)).toBeGreaterThan(Number(circle!.options.delay))
    // Hidden before its turn, and held where it ends.
    expect(circle!.options.fill).toBe('both')
    expect(circle!.keyframes[0]).toEqual({ strokeDasharray: '53.407 55.407', strokeDashoffset: '54.407' })
    expect(circle!.keyframes[1]).toMatchObject({ strokeDashoffset: '0' })

    await act(() => animations.finishAll())
    expect(circle!.cancel).toHaveBeenCalled()
    expect(wrapper(container).style.visibility).toBe('')
  })

  it('stands in a copy for each stroke of a path that holds more than one', async () => {
    const { container, update } = mount({ effect: 'draw', trigger: 0 }, <ArrowRightIcon />)
    update({ effect: 'draw', trigger: 1 })

    const original = svg(container).querySelector(`path:not([${ADDED}])`) as SVGPathElement
    const copies = [...svg(container).querySelectorAll(`path[${ADDED}]`)]
    expect(original.style.visibility).toBe('hidden')
    expect(copies.map((copy) => copy.getAttribute('d'))).toEqual(['M5 12L19 12', 'M13.5 6.5L19 12L13.5 17.5'])
    expect(animations.played.map((animation) => animation.element)).toEqual(copies)
    expect(Number(animations.played[1]!.options.delay)).toBeGreaterThan(0)

    await act(() => animations.finishAll())
    expect(svg(container).querySelectorAll(`[${ADDED}]`)).toHaveLength(0)
    expect(original.style.visibility).toBe('')
  })

  it('draws off last stroke first and hides the icon once the strokes are gone', async () => {
    const { container, update } = mount({ effect: 'draw' }, <CircleCheckIcon />)
    update({ drawn: false, effect: 'draw' })
    const [circle, tick] = animations.played
    expect(Number(tick!.options.delay)).toBe(0)
    expect(Number(circle!.options.delay)).toBeGreaterThan(0)
    expect(wrapper(container).style.visibility).toBe('')

    await act(() => animations.finishAll())
    expect(wrapper(container).style.visibility).toBe('hidden')
  })

  it('turns round from where it is when flipped mid-way', () => {
    const { update } = mount({ effect: 'draw' }, <CircleCheckIcon />)
    update({ drawn: false, effect: 'draw' })
    const off = animations.played.slice()
    update({ drawn: true, effect: 'draw' })
    for (const animation of off) expect(animation.cancel).toHaveBeenCalled()
    const back = animations.played.slice(off.length)
    expect(back).toHaveLength(2)
    expect(back.every((animation) => animation.element.isConnected)).toBe(true)
  })

  it('draws on afresh when the trigger changes, but not while hidden', () => {
    const { update } = mount({ drawn: false, effect: 'draw', trigger: 0 }, <CircleCheckIcon />)
    update({ drawn: false, effect: 'draw', trigger: 1 })
    expect(animations.played).toHaveLength(0)
    update({ drawn: true, effect: 'draw', trigger: 1 })
    const first = animations.played.length
    update({ drawn: true, effect: 'draw', trigger: 2 })
    expect(animations.played.length).toBe(first * 2)
    expect(animations.played.at(-1)!.keyframes[0]).toMatchObject({ strokeDashoffset: expect.not.stringMatching(/^0$/) })
  })

  it('draws every stroke at once when together', () => {
    const { update } = mount({ effect: 'draw', strokes: 'together', trigger: 0 }, <CircleCheckIcon />)
    update({ effect: 'draw', strokes: 'together', trigger: 1 })
    expect(animations.played.map((animation) => animation.options.delay)).toEqual([0, 0])
  })

  it('goes straight to where drawn says with motion off', () => {
    const { container, update } = mount({ effect: 'draw', motion: false }, <CircleCheckIcon />)
    update({ drawn: false, effect: 'draw', motion: false })
    expect(wrapper(container).style.visibility).toBe('hidden')
    update({ drawn: true, effect: 'draw', motion: false })
    expect(wrapper(container).style.visibility).toBe('')
    expect(animations.played).toHaveLength(0)
  })

  it('puts the icon back as written when it unmounts mid-drawing', () => {
    const { container, unmount, update } = mount({ effect: 'draw', trigger: 0 }, <ArrowRightIcon />)
    update({ effect: 'draw', trigger: 1 })
    const icon = svg(container)
    unmount()
    expect(icon.querySelectorAll(`[${ADDED}]`)).toHaveLength(0)
    expect((icon.querySelector('path') as SVGPathElement).style.visibility).toBe('')
  })
})
