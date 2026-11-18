/**
 * Every glass element pays for itself whether or not anyone can see it: a 2D
 * canvas the size of the element (four bytes a pixel, doubled twice on a
 * retina screen), a `mix-blend-mode` layer, and in Chromium an SVG lens filter
 * inside `backdrop-filter`. A list of a few hundred cards spends hundreds of
 * megabytes and most of each scroll frame on cards far off screen, and past the
 * GPU's budget Chromium starts dropping layers, so cards blank out mid-scroll.
 *
 * So glass sleeps while it is out of sight. One IntersectionObserver watches
 * every element; the renderer and the lens release what they hold when theirs
 * leaves the margin below and rebuild it on the way back in. The margin is
 * generous so the rebuild lands before the element is actually on screen.
 */
const MARGIN = '50% 0px'

type Listener = (visible: boolean) => void

let observer: IntersectionObserver | null | undefined
const listeners = new Map<Element, Set<Listener>>()
// The last answer for each element, so a second subscriber to an element that
// is already being watched hears it too — the observer will not repeat it.
const lastSeen = new Map<Element, boolean>()

const getObserver = (): IntersectionObserver | null => {
  if (observer !== undefined) return observer
  if (typeof IntersectionObserver === 'undefined') {
    observer = null
    return observer
  }

  const init: IntersectionObserverInit & { scrollMargin?: string } = {
    rootMargin: MARGIN,
    // rootMargin only grows the viewport. Glass inside its own scroll box is
    // clipped by that box, so without scrollMargin it would wake only once it
    // was already in view. Browsers that do not know the option ignore it.
    scrollMargin: MARGIN,
  }
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      lastSeen.set(entry.target, entry.isIntersecting)
      listeners.get(entry.target)?.forEach((listener) => listener(entry.isIntersecting))
    }
  }, init)
  return observer
}

/**
 * Calls `listener` with `true` when `element` comes within reach of the
 * viewport and `false` when it leaves. The first call arrives asynchronously,
 * once the browser has measured. Without IntersectionObserver (old browsers,
 * jsdom) the element counts as visible at once and forever. Returns the
 * unsubscribe.
 */
export const observeVisibility = (element: Element, listener: Listener): (() => void) => {
  const io = getObserver()
  if (!io) {
    listener(true)
    return () => {}
  }

  let set = listeners.get(element)
  if (!set) {
    set = new Set()
    listeners.set(element, set)
    io.observe(element)
  }
  set.add(listener)
  const known = lastSeen.get(element)
  if (known !== undefined) listener(known)

  return () => {
    const current = listeners.get(element)
    if (!current) return
    current.delete(listener)
    if (current.size > 0) return
    listeners.delete(element)
    lastSeen.delete(element)
    io.unobserve(element)
  }
}
