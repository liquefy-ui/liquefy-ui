import { clamp } from './math'
import type { ElasticOptions, ElasticPull, ElasticSubscriber } from './types'

const atRest: ElasticPull = { offsetX: 0, offsetY: 0, stretchX: 0, stretchY: 0 }

/**
 * How a surface leans toward a pointer that has not reached it yet.
 *
 * The falloff is measured from the element's *edge* rather than its centre, so
 * a wide card starts to lean when the pointer nears its side instead of waiting
 * for it to near the middle — which is what makes a dock of different-sized
 * things respond as one row. Squaring it keeps the pull from switching on at
 * the boundary of the reach.
 *
 * The stretch splits the lean between the two axes by the square of the
 * direction, and takes half of it back on the other axis, so a surface pulled
 * sideways goes wide and slightly flat instead of simply getting bigger.
 */
export const elasticPull = (
  bounds: DOMRect,
  pointerX: number,
  pointerY: number,
  options: ElasticOptions = {},
): ElasticPull => {
  const elasticity = clamp(options.elasticity ?? 0, 0, 1)
  const reach = Math.max(1, options.reach ?? 180)
  if (elasticity === 0 || bounds.width < 1 || bounds.height < 1) return atRest

  const deltaX = pointerX - (bounds.left + bounds.width / 2)
  const deltaY = pointerY - (bounds.top + bounds.height / 2)

  const gapX = Math.max(0, Math.abs(deltaX) - bounds.width / 2)
  const gapY = Math.max(0, Math.abs(deltaY) - bounds.height / 2)
  const gap = Math.hypot(gapX, gapY)
  if (gap >= reach) return atRest

  const falloff = (1 - gap / reach) ** 2
  const distance = Math.hypot(deltaX, deltaY)
  if (distance < 0.001) return atRest

  const directionX = deltaX / distance
  const directionY = deltaY / distance
  const lean = elasticity * falloff
  const travel = Math.min(distance, reach) * lean

  const axisX = directionX * directionX
  const axisY = directionY * directionY
  const stretch = lean * 0.4

  return {
    offsetX: directionX * travel * 0.22,
    offsetY: directionY * travel * 0.22,
    stretchX: stretch * (axisX - axisY * 0.5),
    stretchY: stretch * (axisY - axisX * 0.5),
  }
}

type Registration = {
  element: HTMLElement
  notify: ElasticSubscriber
  rect: DOMRect | null
}

const registrations = new Set<Registration>()
let listening = false
let frame = 0
let pointerX = 0
let pointerY = 0
let pointerSeen = false

const invalidate = (): void => {
  for (const registration of registrations) registration.rect = null
}

const dispatch = (): void => {
  frame = 0
  for (const registration of registrations) {
    if (!registration.element.isConnected) continue
    registration.rect ??= registration.element.getBoundingClientRect()
    registration.notify(registration.rect, pointerX, pointerY)
  }
}

const schedule = (): void => {
  if (frame) return
  frame = requestAnimationFrame(dispatch)
}

const handlePointer = (event: PointerEvent): void => {
  pointerX = event.clientX
  pointerY = event.clientY
  pointerSeen = true
  schedule()
}

const stopListening = (): void => {
  if (!listening) return
  listening = false
  cancelAnimationFrame(frame)
  frame = 0
  window.removeEventListener('pointermove', handlePointer)
  window.removeEventListener('scroll', invalidate, true)
  window.removeEventListener('resize', invalidate)
}

/**
 * Subscribes an element to the pointer, wherever the pointer is on the page.
 *
 * One window listener serves every surface, because the alternative — a
 * listener per component — measures the same pointer dozens of times per move
 * and lays out the whole page doing it. Rects are cached until something that
 * can move them happens, and the fan-out runs on an animation frame, so a fast
 * sweep across the page costs one measurement pass per frame no matter how many
 * surfaces are mounted.
 */
export const observeElasticPointer = (
  element: HTMLElement,
  notify: ElasticSubscriber,
): (() => void) => {
  if (typeof window === 'undefined') return () => {}

  const registration: Registration = { element, notify, rect: null }
  registrations.add(registration)

  if (!listening) {
    listening = true
    window.addEventListener('pointermove', handlePointer, { passive: true })
    window.addEventListener('scroll', invalidate, { capture: true, passive: true })
    window.addEventListener('resize', invalidate, { passive: true })
  }
  if (pointerSeen) schedule()

  return () => {
    registrations.delete(registration)
    if (registrations.size === 0) stopListening()
  }
}
