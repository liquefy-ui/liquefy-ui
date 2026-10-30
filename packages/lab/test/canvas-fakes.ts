import { act } from '@testing-library/react'
import { vi } from 'vitest'

/** A requestAnimationFrame that only runs when told to, on a clock of the test's own. */
export const frames = () => {
  let now = 0
  let id = 0
  const queue = new Map<number, FrameRequestCallback>()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    id += 1
    queue.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle))
  return {
    get pending() {
      return queue.size
    },
    play(count: number) {
      act(() => {
        for (let frame = 0; frame < count; frame += 1) {
          now += 1000 / 60
          const callbacks = [...queue.values()]
          queue.clear()
          callbacks.forEach((callback) => callback(now))
        }
      })
    },
  }
}

/**
 * A 2D context that draws nothing and counts what it was asked to draw. jsdom
 * has no canvas, so without this the particles have nowhere to go.
 */
export const fakeCanvas = () => {
  const calls = { drawImage: 0, fillRect: 0, stroke: 0 }
  const gradient = { addColorStop: () => undefined }
  const state: Record<PropertyKey, unknown> = {}
  const context = new Proxy(state, {
    get: (target, key) => {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient
      if (key === 'getImageData') return () => ({ data: [210, 220, 230, 255] })
      if (typeof key === 'string' && key in calls) return () => { calls[key as keyof typeof calls] += 1 }
      if (key in target) return target[key]
      return () => undefined
    },
    set: (target, key, value) => {
      target[key] = value
      return true
    },
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as never)
  return calls
}
