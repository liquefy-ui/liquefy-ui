import { clamp } from './math'
import { createLensMap } from './lens'
import { mediaQuery } from './media'
import type { LensFilterController, LensFilterOptions } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'
let filterCount = 0
let defsRoot: SVGSVGElement | null = null
let lensSupport: boolean | undefined

// True refraction of the live backdrop needs an SVG filter inside
// backdrop-filter, which only Chromium renders. WebKit and Gecko parse the
// syntax but silently drop the displacement, so they get the CSS material.
export const isLensSupported = (): boolean => {
  if (lensSupport !== undefined) return lensSupport
  if (typeof window === 'undefined' || typeof CSS === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const parses = CSS.supports('backdrop-filter', 'url(#lq-probe)')
    || CSS.supports('-webkit-backdrop-filter', 'url(#lq-probe)')
  const chromium = 'userAgentData' in navigator || 'chrome' in window
  lensSupport = parses && chromium
  return lensSupport
}

const getDefsRoot = (): SVGSVGElement => {
  if (defsRoot?.isConnected) return defsRoot

  defsRoot = document.createElementNS(SVG_NS, 'svg')
  defsRoot.setAttribute('aria-hidden', 'true')
  defsRoot.setAttribute('width', '0')
  defsRoot.setAttribute('height', '0')
  defsRoot.style.position = 'absolute'
  defsRoot.style.overflow = 'hidden'
  document.body.appendChild(defsRoot)
  return defsRoot
}

const createElement = <Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attributes: Record<string, string>,
): SVGElementTagNameMap[Tag] => {
  const element = document.createElementNS(SVG_NS, tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  return element
}

const keepChannelMatrix = (channel: 0 | 1 | 2): string => {
  const passthrough = channel === 0 ? '1 0 0 0 0' : channel === 1 ? '0 1 0 0 0' : '0 0 1 0 0'
  const zero = '0 0 0 0 0'
  return [
    channel === 0 ? passthrough : zero,
    channel === 1 ? passthrough : zero,
    channel === 2 ? passthrough : zero,
    '0 0 0 1 0',
  ].join(' ')
}

export const attachLiquidLens = (
  element: HTMLElement,
  options: LensFilterOptions = {},
): LensFilterController | null => {
  if (!isLensSupported()) return null
  if (
    options.respectReducedTransparency === true
    && mediaQuery('(prefers-reduced-transparency: reduce)').matches
  ) return null

  const dispersion = clamp(options.dispersion ?? 0.6, 0, 1)
  const blur = clamp(options.blur ?? 0.6, 0, 24)
  const saturation = clamp(options.saturation ?? 1.24, 0, 3)
  const strength = clamp(options.strength ?? 1, 0, 2)

  const id = `lq-lens-${(filterCount += 1)}`
  const filter = createElement('filter', {
    'color-interpolation-filters': 'sRGB',
    filterUnits: 'userSpaceOnUse',
    id,
    x: '0',
    y: '0',
  })

  const map = createElement('feImage', {
    preserveAspectRatio: 'none',
    result: 'lq-map',
    x: '0',
    y: '0',
  })
  filter.appendChild(map)

  const displacements: SVGFEDisplacementMapElement[] = []
  if (dispersion > 0) {
    const makeBranch = (channel: 0 | 1 | 2): string => {
      const displacement = createElement('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'lq-map',
        result: `lq-d${channel}`,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      })
      const isolate = createElement('feColorMatrix', {
        in: `lq-d${channel}`,
        result: `lq-c${channel}`,
        type: 'matrix',
        values: keepChannelMatrix(channel),
      })
      filter.appendChild(displacement)
      filter.appendChild(isolate)
      displacements.push(displacement)
      return `lq-c${channel}`
    }
    const red = makeBranch(0)
    const green = makeBranch(1)
    const blue = makeBranch(2)
    filter.appendChild(createElement('feComposite', {
      in: red, in2: green, k1: '0', k2: '1', k3: '1', k4: '0', operator: 'arithmetic', result: 'lq-rg',
    }))
    filter.appendChild(createElement('feComposite', {
      in: 'lq-rg', in2: blue, k1: '0', k2: '1', k3: '1', k4: '0', operator: 'arithmetic', result: 'lq-rgb',
    }))
  } else {
    const displacement = createElement('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'lq-map',
      result: 'lq-rgb',
      xChannelSelector: 'R',
      yChannelSelector: 'G',
    })
    filter.appendChild(displacement)
    displacements.push(displacement)
  }

  filter.appendChild(createElement('feGaussianBlur', {
    in: 'lq-rgb',
    result: 'lq-soft',
    stdDeviation: String(blur),
  }))
  filter.appendChild(createElement('feColorMatrix', {
    in: 'lq-soft',
    type: 'saturate',
    values: String(saturation),
  }))

  getDefsRoot().appendChild(filter)

  let destroyed = false
  let refreshFrame = 0

  const refresh = (): void => {
    if (destroyed || !element.isConnected) return

    const width = element.offsetWidth
    const height = element.offsetHeight
    if (width < 8 || height < 8) return

    const computed = getComputedStyle(element)
    const parsedRadius = Number.parseFloat(computed.borderTopLeftRadius)
    const radius = options.radius ?? (Number.isFinite(parsedRadius) ? parsedRadius : 16)

    const lensMap = createLensMap({ height, radius, strength, width })
    if (!lensMap) return

    filter.setAttribute('width', String(width))
    filter.setAttribute('height', String(height))
    map.setAttribute('width', String(width))
    map.setAttribute('height', String(height))
    map.setAttribute('href', lensMap.url)

    const spread = dispersion * 0.08
    displacements.forEach((displacement, index) => {
      const factor = displacements.length === 3 ? 1 + spread * (1 - index) : 1
      displacement.setAttribute('scale', String(lensMap.scale * factor))
    })

    element.style.setProperty('backdrop-filter', `url(#${id})`)
    element.style.setProperty('-webkit-backdrop-filter', `url(#${id})`)
    element.dataset.liquidLens = 'true'
  }

  const scheduleRefresh = (): void => {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(refresh)
  }

  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(scheduleRefresh)
  resizeObserver?.observe(element)
  scheduleRefresh()

  return {
    destroy: () => {
      destroyed = true
      cancelAnimationFrame(refreshFrame)
      resizeObserver?.disconnect()
      filter.remove()
      element.style.removeProperty('backdrop-filter')
      element.style.removeProperty('-webkit-backdrop-filter')
      delete element.dataset.liquidLens
    },
    refresh: scheduleRefresh,
  }
}
