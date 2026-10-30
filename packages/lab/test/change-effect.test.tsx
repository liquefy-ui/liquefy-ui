// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangeEffect, type ChangeEffectHandle } from '../src/change-effect'
import { GLOW_MS, JUMP_MS, SHINE_MS } from '../src/change-effect-motion'
import { fakeCanvas, frames } from './canvas-fakes'

const inProvider = (node: ReactNode, motion = true) => (
  <LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>
)

const mount = (node: ReactNode, motion = true) => render(inProvider(node, motion))

/** Frames at 60 fps that `ms` milliseconds take, and a few more. */
const framesFor = (ms: number) => Math.ceil((ms / 1000) * 60) + 4

const wrapperOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-change-effect]')!
const layerOf = (container: HTMLElement) => wrapperOf(container).querySelector<HTMLElement>(':scope > [aria-hidden="true"]')

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ChangeEffect', () => {
  it('leaves what it wraps as it was, and adds nothing to read', () => {
    const clicked = vi.fn()
    const { container } = mount(
      <ChangeEffect effect="spray" trigger={0}>
        <button onClick={clicked} type="button">Like</button>
      </ChangeEffect>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Like' }))
    expect(clicked).toHaveBeenCalledTimes(1)
    expect(wrapperOf(container).textContent).toBe('Like')
    // Only the empty layer the effect draws in, hidden from assistive technology.
    const hidden = wrapperOf(container).querySelectorAll('[aria-hidden="true"]')
    expect(hidden).toHaveLength(1)
    expect(hidden[0]!.childElementCount).toBe(0)
  })

  it('renders on the server as a plain wrapper around its content', () => {
    const markup = renderToStaticMarkup(inProvider(
      <ChangeEffect effect="jump" trigger={1}><button type="button">Bell</button></ChangeEffect>,
    ))
    expect(markup).toContain('data-change-effect="jump"')
    expect(markup).toContain('<button type="button">Bell</button>')
    expect(markup).toContain('display:inline-flex')
  })

  it('does not play on mount', () => {
    const clock = frames()
    const { container } = mount(<ChangeEffect effect="jump" trigger={3}><button type="button">Bell</button></ChangeEffect>)
    expect(clock.pending).toBe(0)
    expect(wrapperOf(container).style.transform).toBe('')
  })

  it('jumps when the trigger changes, and comes back to rest as it was', () => {
    const clock = frames()
    const element = (trigger: number) => (
      <ChangeEffect effect="jump" style={{ transform: 'rotate(2deg)' }} trigger={trigger}>
        <button type="button">Bell</button>
      </ChangeEffect>
    )
    const { container, rerender } = mount(element(0))
    rerender(inProvider(element(1)))
    expect(clock.pending).toBe(1)
    clock.play(14)
    const wrapper = wrapperOf(container)
    // Its own transform first, then the jump: well off the floor by now.
    expect(wrapper.style.transform).toMatch(/^rotate\(2deg\) translate\(0\.00px, -\d+\.\d+px\)/)
    expect(wrapper.style.transformOrigin).toBe('50% 100%')
    clock.play(framesFor(JUMP_MS))
    expect(wrapper.style.transform).toBe('rotate(2deg)')
    expect(wrapper.style.transformOrigin).toBe('')
    expect(clock.pending).toBe(0)
  })

  it('plays through its handle, for a change that leaves the value as it was', () => {
    const clock = frames()
    const handle = createRef<ChangeEffectHandle>()
    const { container } = mount(<ChangeEffect effect="shake" ref={handle}><input aria-label="Passcode" /></ChangeEffect>)
    handle.current!.play()
    clock.play(2)
    expect(wrapperOf(container).style.transform).toMatch(/^translate\(-\d+\.\d+px, 0\.00px\)/)
  })

  it('plays nothing under a provider with motion off', () => {
    const clock = frames()
    const handle = createRef<ChangeEffectHandle>()
    const element = (trigger: number) => (
      <ChangeEffect effect="jump" ref={handle} trigger={trigger}><button type="button">Bell</button></ChangeEffect>
    )
    const { container, rerender } = mount(element(0), false)
    rerender(inProvider(element(1), false))
    handle.current!.play()
    expect(clock.pending).toBe(0)
    expect(wrapperOf(container).style.transform).toBe('')
  })

  it('stops at once, back at rest, when motion turns off mid-play', () => {
    const clock = frames()
    const element = (trigger: number) => (
      <ChangeEffect effect="jump" trigger={trigger}><button type="button">Bell</button></ChangeEffect>
    )
    const { container, rerender } = mount(element(0))
    rerender(inProvider(element(1)))
    clock.play(12)
    expect(wrapperOf(container).style.transform).not.toBe('')
    rerender(inProvider(element(1), false))
    expect(wrapperOf(container).style.transform).toBe('')
    expect(clock.pending).toBe(0)
  })

  it('runs a band of light across, in the content’s corners, one band a play', () => {
    const clock = frames()
    const element = (trigger: number) => (
      <ChangeEffect effect="shine" trigger={trigger}>
        <button style={{ borderRadius: '14px' }} type="button">Pro</button>
      </ChangeEffect>
    )
    const { container, rerender } = mount(element(0))
    rerender(inProvider(element(1)))
    clock.play(10)
    rerender(inProvider(element(2)))
    clock.play(1)
    const layer = layerOf(container)!
    expect(layer.style.zIndex).toBe('1')
    expect(layer.style.overflow).toBe('hidden')
    expect(layer.style.borderRadius).toBe('14px')
    expect(layer.childElementCount).toBe(2)
    expect((layer.firstElementChild as HTMLElement).style.transform).toMatch(/^translate\(-\d/)
    clock.play(framesFor(SHINE_MS))
    expect(layer.childElementCount).toBe(0)
    expect(clock.pending).toBe(0)
  })

  it('glows from behind, and lets the light fade away', () => {
    const clock = frames()
    const element = (trigger: number) => (
      <ChangeEffect effect="glow" tint="#ff6f8e" trigger={trigger}><button type="button">Sun</button></ChangeEffect>
    )
    const { container, rerender } = mount(element(0))
    rerender(inProvider(element(1)))
    clock.play(12)
    const layer = layerOf(container)!
    expect(layer.style.zIndex).toBe('-1')
    const halo = layer.firstElementChild as HTMLElement
    expect(Number(halo.style.opacity)).toBeGreaterThan(0.9)
    expect(wrapperOf(container).style.getPropertyValue('--lq-particle-tint')).toBe('#ff6f8e')
    clock.play(framesFor(GLOW_MS))
    expect(layer.childElementCount).toBe(0)
    expect(clock.pending).toBe(0)
  })

  it('sprays droplets onto a canvas over it, and takes the canvas away once they have landed', () => {
    const clock = frames()
    const drawn = fakeCanvas()
    const element = (trigger: number) => (
      <ChangeEffect effect="spray" trigger={trigger}><button type="button">Like</button></ChangeEffect>
    )
    const { container, rerender } = mount(element(0))
    rerender(inProvider(element(1)))
    const layer = layerOf(container)!
    const canvas = layer.querySelector('canvas')!
    expect(canvas).not.toBeNull()
    // Larger than the button, mostly above it, where the droplets fly.
    expect(Number.parseFloat(canvas.style.top)).toBeLessThan(-100)
    clock.play(6)
    expect(drawn.drawImage).toBeGreaterThan(10)
    // A second like before they land throws more into the same canvas.
    rerender(inProvider(element(2)))
    expect(layer.querySelectorAll('canvas')).toHaveLength(1)
    clock.play(framesFor(1400))
    expect(layer.querySelector('canvas')).toBeNull()
    expect(clock.pending).toBe(0)
  })

  it('sprays nothing, and leaves nothing behind, without a 2D canvas', () => {
    const clock = frames()
    const element = (trigger: number) => (
      <ChangeEffect effect="spray" trigger={trigger}><button type="button">Like</button></ChangeEffect>
    )
    const { container, rerender } = mount(element(0))
    rerender(inProvider(element(1)))
    clock.play(3)
    expect(layerOf(container)!.childElementCount).toBe(0)
    expect(clock.pending).toBe(0)
  })
})
