// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachLiquidMotion } from '../src/motion'
import { SpringValue } from '../src/spring'

/**
 * The engine's contract with the components is a set of custom properties written
 * on an element every frame. The stylesheet reads exactly those names, so renaming
 * one — or forgetting to detach a listener — breaks the material without breaking
 * a type. These tests hold the names, the gestures and the teardown.
 */

/** The properties `transform` in the stylesheet is composed from. */
const MOTION_PROPERTIES = [
  '--lq-pointer-x',
  '--lq-pointer-y',
  '--lq-rotate-x',
  '--lq-rotate-y',
  '--lq-scale-x',
  '--lq-scale-y',
  '--lq-skew-x',
  '--lq-lift',
  '--lq-magnet-x',
  '--lq-magnet-y',
  '--lq-shine-opacity',
  '--lq-squish',
]

const attached: Array<{ destroy: () => void }> = []
const elements: HTMLElement[] = []

/** jsdom gives every element a zero-sized box, so the engine needs one to map into. */
const mount = () => {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => ({
    bottom: 40, height: 40, left: 0, right: 120, toJSON: () => ({}), top: 0, width: 120, x: 0, y: 0,
  })
  document.body.append(element)
  elements.push(element)
  return element
}

const attach = (element: HTMLElement, options: Parameters<typeof attachLiquidMotion>[2] = {}) => {
  const controller = attachLiquidMotion(element, null, options)
  if (controller) attached.push(controller)
  return controller
}

const pointer = (element: HTMLElement, type: string, init: PointerEventInit = {}) => {
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 60, clientY: 20, ...init }))
}

/** Lets the spring loop run: the controller integrates on animation frames. */
const settle = async (frames = 40) => {
  for (let index = 0; index < frames; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
}

afterEach(() => {
  for (const controller of attached.splice(0)) controller.destroy()
  for (const element of elements.splice(0)) element.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('attachLiquidMotion', () => {
  it('writes every custom property the stylesheet composes a transform from', async () => {
    const element = mount()
    attach(element)
    pointer(element, 'pointerenter')
    pointer(element, 'pointermove')
    await settle(4)

    const missing = MOTION_PROPERTIES.filter((name) => element.style.getPropertyValue(name) === '')
    expect(missing).toEqual([])
  })

  it('squashes on press and rebounds on release', async () => {
    const element = mount()
    attach(element)
    pointer(element, 'pointerenter')
    pointer(element, 'pointerdown')
    await settle(6)

    const pressedX = Number(element.style.getPropertyValue('--lq-scale-x'))
    const pressedY = Number(element.style.getPropertyValue('--lq-scale-y'))
    // Wider than it is tall: that is the squash the docs describe.
    expect(pressedX).toBeGreaterThan(pressedY)

    pointer(element, 'pointerup')
    await settle(30)
    expect(Number(element.style.getPropertyValue('--lq-scale-y')))
      .toBeGreaterThan(pressedY)
  })

  it('returns to rest when the pointer leaves', async () => {
    const element = mount()
    attach(element)
    pointer(element, 'pointerenter')
    pointer(element, 'pointermove')
    await settle(6)
    pointer(element, 'pointerleave')
    await settle(60)

    expect(Number(element.style.getPropertyValue('--lq-shine-opacity'))).toBeCloseTo(0, 1)
    expect(Number(element.style.getPropertyValue('--lq-scale-x'))).toBeCloseTo(1, 1)
    // A length carries its unit, so read the number out of it.
    expect(parseFloat(element.style.getPropertyValue('--lq-lift'))).toBeCloseTo(0, 0)
  })

  it('pulses on demand, which is how inputs react to a keystroke', async () => {
    const element = mount()
    const controller = attach(element)
    await settle(2)
    const before = Number(element.style.getPropertyValue('--lq-scale-x'))

    controller?.pulse(1.2)
    await settle(3)
    expect(Number(element.style.getPropertyValue('--lq-scale-x'))).not.toBe(before)
  })

  it('goes quiet when disabled and wakes up again', async () => {
    const element = mount()
    const controller = attach(element)
    controller?.setDisabled(true)
    pointer(element, 'pointerenter')
    pointer(element, 'pointerdown')
    await settle(6)
    expect(Number(element.style.getPropertyValue('--lq-scale-x') || '1')).toBeCloseTo(1, 2)

    controller?.setDisabled(false)
    pointer(element, 'pointerenter')
    pointer(element, 'pointerdown')
    await settle(6)
    expect(Number(element.style.getPropertyValue('--lq-scale-x'))).toBeGreaterThan(1)
  })

  it('detaches its listeners on destroy', async () => {
    const element = mount()
    const controller = attachLiquidMotion(element, null, {})
    pointer(element, 'pointerenter')
    await settle(4)
    controller?.destroy()

    const frozen = element.style.getPropertyValue('--lq-scale-x')
    pointer(element, 'pointerdown')
    pointer(element, 'pointermove', { clientX: 10, clientY: 35 })
    await settle(6)
    expect(element.style.getPropertyValue('--lq-scale-x')).toBe(frozen)
  })

  // Off by default, because whether to honour the preference is the app's call —
  // which is exactly why the opt-in has to keep working.
  it('honours prefers-reduced-motion only when asked to', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: query.includes('reduced-motion'),
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }))

    const ignoring = mount()
    attach(ignoring)
    pointer(ignoring, 'pointerenter')
    pointer(ignoring, 'pointerdown')
    await settle(6)
    expect(Number(ignoring.style.getPropertyValue('--lq-scale-x'))).toBeGreaterThan(1)

    const respecting = mount()
    attach(respecting, { respectReducedMotion: true })
    pointer(respecting, 'pointerenter')
    pointer(respecting, 'pointerdown')
    await settle(6)
    expect(Number(respecting.style.getPropertyValue('--lq-scale-x') || '1')).toBeCloseTo(1, 2)
  })

  it('clamps wobbliness rather than trusting the caller', async () => {
    const element = mount()
    attach(element, { wobbliness: 99 })
    pointer(element, 'pointerenter')
    pointer(element, 'pointerdown')
    await settle(8)
    // A nonsense value must not turn into a nonsense transform.
    expect(Number(element.style.getPropertyValue('--lq-scale-x'))).toBeLessThan(2)
  })
})

describe('SpringValue', () => {
  it('resolves from where it is when the target moves mid-flight', () => {
    const spring = new SpringValue(0, { damping: 20, stiffness: 200 })
    spring.setTarget(100)
    for (let index = 0; index < 5; index += 1) spring.step(1 / 60)

    const interrupted = spring.current
    expect(interrupted).toBeGreaterThan(0)
    expect(interrupted).toBeLessThan(100)

    spring.setTarget(0)
    spring.step(1 / 60)
    // It continues from the position it had, rather than jumping to a keyframe.
    expect(Math.abs(spring.current - interrupted)).toBeLessThan(20)
  })

  it('comes to rest and stops needing frames', () => {
    const spring = new SpringValue(0, { damping: 30, stiffness: 320 })
    spring.setTarget(1)
    let steps = 0
    while (spring.step(1 / 60) && steps < 600) steps += 1

    expect(spring.current).toBeCloseTo(1, 3)
    expect(steps).toBeLessThan(600)
    // A settled spring reports that it has nothing left to do.
    expect(spring.step(1 / 60)).toBe(false)
  })
})
