// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Glass sleeps while out of sight. jsdom has no IntersectionObserver, so these
 * stand one in and drive it by hand: who gets told what, and when the element
 * stops being watched.
 */

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void

const fakeObserver = () => {
  const state = { callback: null as Callback | null, init: null as IntersectionObserverInit | null, watched: new Set<Element>() }
  class FakeIntersectionObserver {
    public constructor(callback: Callback, init: IntersectionObserverInit) {
      state.callback = callback
      state.init = init
    }

    public observe(element: Element): void { state.watched.add(element) }
    public unobserve(element: Element): void { state.watched.delete(element) }
  }
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  const report = (target: Element, isIntersecting: boolean) => state.callback?.([{ isIntersecting, target }])
  return { report, state }
}

const load = async () => {
  vi.resetModules()
  return import('../src/visibility')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('observeVisibility', () => {
  it('counts everything as visible where IntersectionObserver is missing', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { observeVisibility } = await load()
    const seen: boolean[] = []
    observeVisibility(document.createElement('div'), (visible) => seen.push(visible))
    expect(seen).toEqual([true])
  })

  it('wakes with a margin around the viewport and around scroll boxes', async () => {
    const { state } = fakeObserver()
    const { observeVisibility } = await load()
    observeVisibility(document.createElement('div'), () => {})
    expect(state.init).toMatchObject({ rootMargin: '50% 0px', scrollMargin: '50% 0px' })
  })

  it('passes each change to every listener of that element only', async () => {
    const { report } = fakeObserver()
    const { observeVisibility } = await load()
    const a = document.createElement('div')
    const b = document.createElement('div')
    const seenA: boolean[] = []
    const seenB: boolean[] = []
    observeVisibility(a, (visible) => seenA.push(visible))
    observeVisibility(b, (visible) => seenB.push(visible))

    report(a, true)
    report(a, false)
    expect(seenA).toEqual([true, false])
    expect(seenB).toEqual([])
  })

  it('tells a late subscriber the last answer straight away', async () => {
    const { report } = fakeObserver()
    const { observeVisibility } = await load()
    const element = document.createElement('div')
    observeVisibility(element, () => {})
    report(element, true)

    const seen: boolean[] = []
    observeVisibility(element, (visible) => seen.push(visible))
    expect(seen).toEqual([true])
  })

  it('stops watching once the last listener leaves', async () => {
    const { state } = fakeObserver()
    const { observeVisibility } = await load()
    const element = document.createElement('div')
    const first = observeVisibility(element, () => {})
    const second = observeVisibility(element, () => {})

    first()
    expect(state.watched.has(element)).toBe(true)
    second()
    expect(state.watched.has(element)).toBe(false)
  })
})
