// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GlassMergeController } from '../src/types'

/**
 * jsdom renders nothing, so these hold the contract the browser is handed:
 * which renderer is picked, what the filter is made of, what is written on a
 * frame, and that destroy leaves the element as it found it.
 */

const lens = vi.hoisted(() => ({ supported: false }))
vi.mock('../src/lens-filter', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lens-filter')>(),
  isLensSupported: () => lens.supported,
}))

const { attachGlassMerge } = await import('../src/glass-merge')

const attached: GlassMergeController[] = []

const mount = (options: Parameters<typeof attachGlassMerge>[1] = {}) => {
  const element = document.createElement('div')
  Object.defineProperty(element, 'offsetWidth', { value: 400 })
  Object.defineProperty(element, 'offsetHeight', { value: 300 })
  document.body.append(element)
  const controller = attachGlassMerge(element, options)
  attached.push(controller)
  return { controller, element }
}

const circle = (x: number, y: number, radius: number) => ({ height: radius * 2, radius, width: radius * 2, x, y })

const filterOf = (element: HTMLElement) => {
  const id = /url\(#(.+)\)/.exec(element.style.getPropertyValue('--lq-lens'))?.[1]
  return id ? document.getElementById(id) : null
}

afterEach(() => {
  attached.splice(0).forEach((controller) => controller.destroy())
  document.body.innerHTML = ''
  lens.supported = false
  vi.unstubAllGlobals()
})

describe('attachGlassMerge, lens', () => {
  it('builds the lens inside one filter and makes it the whole backdrop filter', () => {
    lens.supported = true
    const { controller, element } = mount()
    expect(controller.mode).toBe('lens')
    expect(element.dataset.glassMerge).toBe('lens')
    expect(element.style.getPropertyValue('backdrop-filter')).toBe('var(--lq-lens)')
    const filter = filterOf(element)!
    expect(filter.getAttribute('width')).toBe('400')
    expect(filter.getAttribute('height')).toBe('300')
    expect(filter.querySelectorAll('feDisplacementMap')).toHaveLength(1)
    expect(filter.querySelectorAll('feSpecularLighting')).toHaveLength(2)
    expect(filter.querySelectorAll('feImage')).toHaveLength(0)
  })

  it('gives each visible shape one sprite, in front of the merge, and none to a shape with no size', () => {
    lens.supported = true
    const { controller, element } = mount()
    controller.setShapes([circle(100, 100, 28), circle(160, 100, 23), { ...circle(130, 100, 0), height: 0, width: 0 }])
    const filter = filterOf(element)!
    const images = [...filter.querySelectorAll('feImage')]
    expect(images).toHaveLength(2)
    const merge = filter.querySelector('feMerge')!
    expect([...merge.children].map((node) => node.getAttribute('in'))).toEqual(images.map((image) => image.getAttribute('result')))
    expect(images.every((image) => image.compareDocumentPosition(merge) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    // Two circles share one sprite, centred on each.
    expect(images[0]!.getAttribute('href')).toBe(images[1]!.getAttribute('href'))
    const centre = (image: Element) => Number(image.getAttribute('x')) + Number(image.getAttribute('width')) / 2
    expect(centre(images[0]!)).toBeCloseTo(100, 1)
    expect(centre(images[1]!)).toBeCloseTo(160, 1)

    controller.setShapes([circle(100, 100, 28)])
    expect(filter.querySelectorAll('feImage')).toHaveLength(1)
    expect(merge.children).toHaveLength(1)
  })

  it('only writes what moved', () => {
    lens.supported = true
    const { controller, element } = mount()
    controller.setShapes([circle(100, 100, 28)])
    const image = filterOf(element)!.querySelector('feImage')!
    const writes = vi.spyOn(image, 'setAttribute')
    controller.setShapes([circle(120, 100, 28)])
    expect(writes.mock.calls.map(([name]) => name)).toEqual(['x'])
  })

  it('removes the filter and the properties it set', () => {
    lens.supported = true
    const { controller, element } = mount()
    const filter = filterOf(element)!
    controller.destroy()
    expect(filter.isConnected).toBe(false)
    expect(element.getAttribute('style')).toBeFalsy()
    expect(element.dataset.glassMerge).toBeUndefined()
    controller.setShapes([circle(100, 100, 28)])
  })
})

describe('attachGlassMerge, outline', () => {
  it('is what an engine without the lens gets', () => {
    const { controller, element } = mount()
    expect(controller.mode).toBe('outline')
    expect(element.dataset.glassMerge).toBe('outline')
    expect(element.querySelector('svg')).not.toBeNull()
  })

  it('is also what lens or transparency turned off get, and reduced transparency when asked to respect it', () => {
    lens.supported = true
    expect(mount({ lens: false }).controller.mode).toBe('outline')
    expect(mount({ transparency: false }).controller.mode).toBe('outline')
    expect(mount({ respectReducedTransparency: true }).controller.mode).toBe('lens')
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(prefers-reduced-transparency: reduce)' }))
    expect(mount().controller.mode).toBe('lens')
    expect(mount({ respectReducedTransparency: true }).controller.mode).toBe('outline')
  })

  it('traces the merged outline into the rim, one loop per separate body', () => {
    const { controller, element } = mount({ spacing: 16 })
    const outline = element.querySelector('path')!
    controller.setShapes([circle(100, 100, 28), circle(200, 100, 28)])
    expect(outline.getAttribute('d')!.match(/M/g)).toHaveLength(2)
    controller.setShapes([circle(100, 100, 28), circle(166, 100, 28)])
    expect(outline.getAttribute('d')!.match(/M/g)).toHaveLength(1)
    controller.setShapes([])
    expect(outline.getAttribute('d')).toBe('')
  })

  it('puts back what it changed and takes the rim away', () => {
    const { controller, element } = mount()
    controller.setShapes([circle(100, 100, 28)])
    controller.destroy()
    expect(element.querySelector('svg')).toBeNull()
    expect(element.getAttribute('style')).toBeFalsy()
    expect(element.dataset.glassMerge).toBeUndefined()
  })
})
