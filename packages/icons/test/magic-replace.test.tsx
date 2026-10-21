// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MagicReplace, type MagicReplaceProps } from '../src/effects'
import { ADDED } from '../src/effects/dom'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  LockIcon,
  LockOpenIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
} from '../src/index'
import { installAnimations } from './fake-animations'

let animations: ReturnType<typeof installAnimations>

beforeEach(() => {
  animations = installAnimations()
})

afterEach(() => {
  cleanup()
  animations.uninstall()
  vi.unstubAllGlobals()
})

/** Whether `d` morphs, as it does in Chromium and Firefox; jsdom has no `CSS` at all. */
const morphing = (supported: boolean) => vi.stubGlobal('CSS', { supports: (property: string) => supported && property === 'd' })

const mount = (icon: ReactElement, props: Omit<MagicReplaceProps, 'children'> = {}) => {
  const view = render(<MagicReplace {...props}>{icon}</MagicReplace>)
  return {
    ...view,
    icon: () => view.container.querySelector('svg')!,
    layer: () => view.container.querySelector(`g[${ADDED}="previous"]`),
    swap: (next: ReactElement, nextProps = props) => view.rerender(<MagicReplace {...nextProps}>{next}</MagicReplace>),
  }
}

describe('Magic Replace', () => {
  it('does nothing until the icon changes', () => {
    const { swap } = mount(<LockIcon />)
    swap(<LockIcon size={24} />)
    expect(animations.played).toHaveLength(0)
  })

  it('plays the change inside the incoming icon, then leaves it as written', async () => {
    morphing(true)
    const { container, icon, layer, swap } = mount(<LockIcon />)
    swap(<LockOpenIcon />)

    // The outgoing drawing is copied into the new <svg>, so nothing needs a box of its own.
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(layer()?.parentElement).toBe(icon())
    expect(animations.played.length).toBeGreaterThan(0)

    await act(() => animations.finishAll())
    expect(layer()).toBeNull()
    expect(icon().querySelectorAll(`[${ADDED}]`)).toHaveLength(0)
    expect([...icon().querySelectorAll('rect, path')].every((element) => (element as SVGElement).style.visibility === '')).toBe(true)
  })

  it('keeps the lock’s body where it is and bends the shackle up on a spring', () => {
    morphing(true)
    const { icon, swap } = mount(<LockIcon />)
    swap(<LockOpenIcon />)

    const body = icon().querySelector(':scope > g > rect') as SVGRectElement
    expect(body.style.visibility).toBe('')
    expect(animations.played.some((animation) => animation.element === body)).toBe(false)

    const morph = animations.played.find((animation) => 'd' in animation.keyframes[0]!)!
    expect(morph.keyframes[0]!.d).toBe('path("M8.2 10.5L8.2 8A3.8 3.8 0 0 1 15.8 8L15.8 10.5")')
    expect(morph.keyframes.at(-1)!.d).toBe('path("M8.2 10.5L8.2 6.5A3.8 3.8 0 0 1 15.8 6.5L15.8 7.5")')
    // On the way it lifts past where it ends up.
    const tops = morph.keyframes.map((keyframe) => Number(/L8\.2 (-?[\d.]+)A/.exec(String(keyframe.d))?.[1]))
    expect(Math.min(...tops)).toBeLessThan(6.5)
  })

  it('draws the shackle off and on where `d` cannot be animated', () => {
    morphing(false)
    const { swap } = mount(<LockIcon />)
    swap(<LockOpenIcon />)
    expect(animations.played.some((animation) => 'd' in animation.keyframes[0]!)).toBe(false)
    const dashes = animations.played.filter((animation) => 'strokeDashoffset' in animation.keyframes[0]!)
    expect(dashes).toHaveLength(2)
    const [off, on] = dashes
    // The old one goes first; the new one starts once it is under way.
    expect(Number(on!.options.delay)).toBeGreaterThan(Number(off!.options.delay))
  })

  it('draws off only what goes, and draws on only what comes', () => {
    const { icon, swap } = mount(<PlusIcon />)
    swap(<MinusIcon />)
    const dashes = animations.played.filter((animation) => 'strokeDashoffset' in animation.keyframes[0]!)
    expect(dashes).toHaveLength(1)
    expect(dashes[0]!.element.getAttribute('d')).toBe('M12 5.5L12 18.5')
    expect(dashes[0]!.element.closest(`[${ADDED}="previous"]`)).not.toBeNull()
    expect(dashes[0]!.keyframes[1]).toMatchObject({ strokeDashoffset: '14' })
    // The bar both share is the minus's own path, untouched.
    expect((icon().querySelector(`path:not([${ADDED}])`) as SVGPathElement).style.visibility).toBe('')
  })

  it('keeps the circle and redraws the mark inside it', () => {
    const { swap } = mount(<CircleCheckIcon />)
    swap(<CircleAlertIcon />)
    const dashes = animations.played.filter((animation) => 'strokeDashoffset' in animation.keyframes[0]!)
    expect(dashes.map((animation) => animation.element.getAttribute('d'))).toEqual([
      'M8.5 12.2L11 14.6L15.6 9.6',
      'M12 8L12 12.5',
      'M12 15.8L12 15.9',
    ])
    expect(animations.played.some((animation) => animation.element.localName === 'circle')).toBe(false)
  })

  it('turns a chevron over with nothing left behind', () => {
    morphing(true)
    const { swap } = mount(<ChevronDownIcon />)
    swap(<ChevronUpIcon />)
    expect(animations.played.filter((animation) => 'd' in animation.keyframes[0]!)).toHaveLength(1)
    expect(animations.played.some((animation) => 'strokeDashoffset' in animation.keyframes[0]!)).toBe(false)
  })

  it('shrinks one away and grows the other in when they share nothing', () => {
    const { icon, layer, swap } = mount(<PlayIcon />)
    swap(<PauseIcon />)
    const out = animations.played.find((animation) => animation.element === layer())!
    expect(out.keyframes.at(-1)).toMatchObject({ opacity: 0, transform: 'translate(12px, 12px) scale(0.6) translate(-12px, -12px)' })
    const grow = animations.played.find((animation) => animation.element === icon().querySelector('g') && animation.options.composite === 'add')!
    expect(grow.keyframes.at(-1)!.transform).toBe('translate(12px, 12px) scale(1) translate(-12px, -12px)')
    const scales = grow.keyframes.map((keyframe) => Number(/scale\(([\d.]+)\)/.exec(String(keyframe.transform))?.[1]))
    expect(Math.max(...scales)).toBeGreaterThan(1)
  })

  it('draws them off and on instead when the fallback says so', () => {
    const { swap } = mount(<PlayIcon />, { fallback: 'draw' })
    swap(<PauseIcon />, { fallback: 'draw' })
    const dashes = animations.played.filter((animation) => 'strokeDashoffset' in animation.keyframes[0]!)
    expect(dashes).toHaveLength(3)
  })

  it('uses the transition it is told to even when the icons are related', () => {
    const { layer, swap } = mount(<LockIcon />, { transition: 'scale' })
    swap(<LockOpenIcon />, { transition: 'scale' })
    expect(animations.played.some((animation) => animation.element === layer() && 'opacity' in animation.keyframes[0]!)).toBe(true)
  })

  it('finishes a change still running before it starts the next', () => {
    const { container, layer, swap } = mount(<LockIcon />)
    swap(<LockOpenIcon />)
    const first = animations.played.slice()
    swap(<LockIcon />)
    for (const animation of first) expect(animation.cancel).toHaveBeenCalled()
    expect(container.querySelectorAll(`g[${ADDED}="previous"]`)).toHaveLength(1)
    // The copy of the outgoing icon is of the icon itself, not of the last change's leftovers.
    expect(layer()!.querySelectorAll(`[${ADDED}]`).length).toBe(layer()!.querySelectorAll(`path[${ADDED}], rect[${ADDED}]`).length)
    expect(layer()!.querySelector(`g[${ADDED}]`)).toBeNull()
  })

  it('swaps at once with motion off, or under a provider with motion off', () => {
    const { layer, swap } = mount(<LockIcon />, { motion: false })
    swap(<LockOpenIcon />, { motion: false })
    expect(layer()).toBeNull()
    cleanup()

    const { rerender } = render(<div data-liquid-motion="off"><MagicReplace><LockIcon /></MagicReplace></div>)
    rerender(<div data-liquid-motion="off"><MagicReplace><LockOpenIcon /></MagicReplace></div>)
    expect(animations.played).toHaveLength(0)
  })

  it('takes the change down when it unmounts', () => {
    const { icon, swap, unmount } = mount(<LockIcon />)
    swap(<LockOpenIcon />)
    const svg = icon()
    unmount()
    expect(svg.querySelectorAll(`[${ADDED}]`)).toHaveLength(0)
    for (const animation of animations.played) expect(animation.cancel).toHaveBeenCalled()
  })

  it('starts a change for a new key on the same icon', () => {
    const { swap } = mount(<LockIcon key="a" />)
    swap(<LockIcon key="b" />)
    // The same drawing twice: everything is shared and only the give plays.
    expect(animations.played).toHaveLength(1)
    expect(animations.played[0]!.options.composite).toBe('add')
  })
})
