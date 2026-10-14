import { clamp } from './math'
import {
  contourPath,
  gooInflation,
  mergedField,
  prepareShape,
  shapeBounds,
  spriteFor,
  traceContours,
  type PreparedShape,
} from './glass-merge-geometry'
import { createElement, getDefsRoot, isLensSupported } from './lens-filter'
import { mediaQuery } from './media'
import type { GlassMergeController, GlassMergeOptions, GlassMergeShape } from './types'

let mergeCount = 0

/** Two straight edges blurred by σ and cut at half stop bridging at a gap of about 1.35σ. */
const SIGMA_PER_SPACING = 1 / 1.35
/** How far the displacement map is allowed to swing off neutral at its steepest. */
const MAP_PEAK = 0.46
/** The threshold that turns the blurred sprites into a crisp mask, centred on half. */
const SHARPNESS = 24
/** Marching-squares step for the outline, in pixels. */
const GRID_STEP = 4
const FROST = 'blur(1.5px) saturate(1.4) brightness(1.05)'
const SOLID = 'var(--lq-solid-fill, rgb(239, 244, 255))'

type Settings = {
  bezel: number
  spacing: number
  strength: number
  tint: string | undefined
}

/** A zero-sized shape still has a sprite the size of the blur, which would bulge its neighbours. */
const isVisible = (shape: PreparedShape): boolean => shape.halfWidth >= 0.25 && shape.halfHeight >= 0.25

/** Sets inline properties and hands back a function that puts the previous values back. */
const setStyles = (element: HTMLElement, styles: Record<string, string>): () => void => {
  const previous = Object.keys(styles).map((name) => [
    name,
    element.style.getPropertyValue(name),
    element.style.getPropertyPriority(name),
  ] as const)
  for (const [name, value] of Object.entries(styles)) element.style.setProperty(name, value)
  return () => {
    for (const [name, value, priority] of previous) {
      if (value) element.style.setProperty(name, value, priority)
      else element.style.removeProperty(name)
    }
  }
}

const observeSize = (element: HTMLElement, onResize: () => void): ResizeObserver | null => {
  if (typeof ResizeObserver === 'undefined') return null
  const observer = new ResizeObserver(onResize)
  observer.observe(element)
  return observer
}

/**
 * The lens built inside the filter. Each shape is an `feImage` sprite; the
 * sprites are merged, blurred and cut at half into one metaball mask; that
 * mask blurred again is a height field whose slope is the displacement map;
 * the backdrop is bent by it and cut to the mask, and two lighting passes
 * over the mask's edge give the rim. Script per frame is the sprites'
 * attribute writes. Nothing is drawn on a canvas and nothing is encoded.
 */
const attachLens = (element: HTMLElement, settings: Settings): GlassMergeController => {
  const id = `lq-merge-${(mergeCount += 1)}`
  const sigma = settings.spacing * SIGMA_PER_SPACING
  const heightBlur = settings.bezel / 2
  // The same ceiling as lens.ts: the rim may squeeze the backdrop by at most
  // 0.88 of what would fold it, over a power-2 cross-section.
  const maximumDisplacement = (settings.bezel * 0.88 * settings.strength) / 2

  const filter = createElement('filter', {
    'color-interpolation-filters': 'sRGB',
    filterUnits: 'userSpaceOnUse',
    height: '0',
    id,
    primitiveUnits: 'userSpaceOnUse',
    width: '0',
    x: '0',
    y: '0',
  })
  const add = <Tag extends keyof SVGElementTagNameMap>(
    tag: Tag,
    attributes: Record<string, string>,
    parent: Element = filter,
  ): SVGElementTagNameMap[Tag] => {
    const child = createElement(tag, attributes)
    parent.appendChild(child)
    return child
  }

  // The sprites' feImages go in front of this, one per shape.
  const merge = add('feMerge', { result: 'lq-shapes' })
  add('feGaussianBlur', { in: 'lq-shapes', result: 'lq-potential', stdDeviation: sigma.toFixed(3) })
  add('feColorMatrix', {
    in: 'lq-potential',
    result: 'lq-mask',
    type: 'matrix',
    values: `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${SHARPNESS} ${0.5 - SHARPNESS / 2}`,
  })
  add('feGaussianBlur', { in: 'lq-mask', result: 'lq-height', stdDeviation: heightBlur.toFixed(3) })

  // Central differences two `step`s apart. They are taken on alpha, because an
  // arithmetic composite clamps premultiplied colour to alpha and a signed value
  // offset by 0.5 would lose its top half in the colour channels. The gain puts
  // the steepest slope of a blurred edge at MAP_PEAK off neutral; two colour
  // matrices then move the results into R and G for feDisplacementMap.
  const step = 2
  const steepest = 1 / (heightBlur * Math.sqrt(2 * Math.PI))
  const gain = (MAP_PEAK / (2 * step * steepest)).toFixed(4)
  const negativeGain = `-${gain}`
  add('feOffset', { dx: String(step), in: 'lq-height', result: 'lq-left' })
  add('feOffset', { dx: String(-step), in: 'lq-height', result: 'lq-right' })
  add('feOffset', { dy: String(step), in: 'lq-height', result: 'lq-up' })
  add('feOffset', { dy: String(-step), in: 'lq-height', result: 'lq-down' })
  const arithmetic = (input: string, input2: string, k2: string, k3: string, k4: string, result: string) => add('feComposite', {
    in: input, in2: input2, k1: '0', k2, k3, k4, operator: 'arithmetic', result,
  })
  arithmetic('lq-right', 'lq-left', gain, negativeGain, '0.5', 'lq-slope-x')
  arithmetic('lq-down', 'lq-up', gain, negativeGain, '0.5', 'lq-slope-y')
  add('feColorMatrix', {
    in: 'lq-slope-x', result: 'lq-red', type: 'matrix', values: '0 0 0 1 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1',
  })
  add('feColorMatrix', {
    in: 'lq-slope-y', result: 'lq-green', type: 'matrix', values: '0 0 0 0 0  0 0 0 1 0  0 0 0 0 0.5  0 0 0 0 1',
  })
  arithmetic('lq-red', 'lq-green', '1', '1', '0', 'lq-map')

  add('feDisplacementMap', {
    in: 'SourceGraphic',
    in2: 'lq-map',
    result: 'lq-bent',
    scale: (maximumDisplacement / MAP_PEAK).toFixed(3),
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  })
  // feDisplacementMap samples nearest-neighbour; the same softening and
  // saturation as attachLiquidLens hide the steps it leaves.
  add('feGaussianBlur', { in: 'lq-bent', result: 'lq-soft', stdDeviation: '0.6' })
  add('feColorMatrix', { in: 'lq-soft', result: 'lq-lens', type: 'saturate', values: '1.24' })
  add('feFlood', {
    'flood-color': settings.tint ?? '#fff',
    'flood-opacity': settings.tint ? '0.14' : '0.06',
    result: 'lq-veil',
  })
  add('feComposite', { in: 'lq-veil', in2: 'lq-lens', operator: 'over', result: 'lq-lit' })
  add('feComposite', { in: 'lq-lit', in2: 'lq-mask', operator: 'in', result: 'lq-glass' })

  // The rim: a thin bevel lit from above for the bright lip and from below,
  // weaker, for the shade line — .lq-surface's two inset lines, following the
  // merged outline instead of a rectangle.
  add('feGaussianBlur', { in: 'lq-mask', result: 'lq-bevel', stdDeviation: '1.4' })
  const lip = add('feSpecularLighting', {
    in: 'lq-bevel', 'lighting-color': '#fff', result: 'lq-lip', specularConstant: '1.15', specularExponent: '42', surfaceScale: '3',
  })
  add('feDistantLight', { azimuth: '268', elevation: '22' }, lip)
  const shade = add('feSpecularLighting', {
    in: 'lq-bevel', 'lighting-color': '#fff', result: 'lq-shade', specularConstant: '0.4', specularExponent: '42', surfaceScale: '3',
  })
  add('feDistantLight', { azimuth: '90', elevation: '22' }, shade)
  arithmetic('lq-lip', 'lq-shade', '1', '1', '0', 'lq-specular')
  add('feComposite', { in: 'lq-specular', in2: 'lq-mask', operator: 'in', result: 'lq-rim' })
  const out = add('feMerge', {})
  add('feMergeNode', { in: 'lq-glass' }, out)
  add('feMergeNode', { in: 'lq-rim' }, out)

  getDefsRoot().appendChild(filter)

  type Slot = { attributes: Record<string, string>, image: SVGFEImageElement, node: SVGFEMergeNodeElement }
  const slots: Slot[] = []
  // Only what changed is written: an unchanged href in particular must not be
  // set again, or the browser may treat it as a new image to load.
  const write = (slot: Slot, name: string, value: string): void => {
    if (slot.attributes[name] === value) return
    slot.attributes[name] = value
    slot.image.setAttribute(name, value)
  }

  const resize = (): void => {
    filter.setAttribute('width', String(element.offsetWidth))
    filter.setAttribute('height', String(element.offsetHeight))
  }
  const resizeObserver = observeSize(element, resize)
  resize()

  // The stylesheet's materials end with `var(--lq-lens, )`; here the lens is
  // the whole material, so the element's backdrop filter is nothing else. A
  // blur or a fill on this element would frost the entire rectangle.
  const restoreStyles = setStyles(element, {
    '--lq-lens': `url(#${id})`,
    '-webkit-backdrop-filter': 'var(--lq-lens)',
    'backdrop-filter': 'var(--lq-lens)',
  })
  element.dataset.glassMerge = 'lens'

  let destroyed = false
  return {
    destroy: () => {
      if (destroyed) return
      destroyed = true
      resizeObserver?.disconnect()
      filter.remove()
      restoreStyles()
      delete element.dataset.glassMerge
    },
    mode: 'lens',
    setShapes: (shapes: readonly GlassMergeShape[]) => {
      if (destroyed) return
      const visible = shapes.map(prepareShape).filter(isVisible)

      while (slots.length < visible.length) {
        const result = `lq-sprite-${slots.length}`
        const image = createElement('feImage', { preserveAspectRatio: 'none', result })
        filter.insertBefore(image, merge)
        slots.push({ attributes: {}, image, node: add('feMergeNode', { in: result }, merge) })
      }
      while (slots.length > visible.length) {
        const slot = slots.pop()!
        slot.image.remove()
        slot.node.remove()
      }

      visible.forEach((shape, index) => {
        const slot = slots[index]!
        const sprite = spriteFor(shape, gooInflation(shape.radius, sigma))
        const halfWidth = sprite.halfWidth * sprite.scale
        const halfHeight = sprite.halfHeight * sprite.scale
        write(slot, 'href', sprite.href)
        write(slot, 'x', (shape.x - halfWidth).toFixed(2))
        write(slot, 'y', (shape.y - halfHeight).toFixed(2))
        write(slot, 'width', (halfWidth * 2).toFixed(2))
        write(slot, 'height', (halfHeight * 2).toFixed(2))
      })
    },
  }
}

/**
 * The outline for engines without the lens, and for less transparency: the
 * element clipped every frame to the merged outline, traced by marching
 * squares over the smooth-min field, with the ordinary blurred material (or a
 * solid fill) and the rim drawn as SVG from the same contour.
 */
const attachOutline = (element: HTMLElement, settings: Settings, opaque: boolean): GlassMergeController => {
  const id = `lq-merge-${(mergeCount += 1)}`
  const { tint } = settings
  const fill = opaque
    ? tint ? `color-mix(in srgb, ${tint} 14%, ${SOLID})` : SOLID
    : tint ? `color-mix(in srgb, ${tint} 14%, transparent)` : 'rgba(255, 255, 255, 0.06)'
  const styles: Record<string, string> = {
    '-webkit-backdrop-filter': opaque ? 'none' : FROST,
    'backdrop-filter': opaque ? 'none' : FROST,
    'background-color': fill,
    'clip-path': 'inset(50%)',
  }
  // The rim is laid over the element from its top-left corner.
  if (typeof getComputedStyle === 'function' && getComputedStyle(element).position === 'static') {
    styles.position = 'relative'
  }
  const restoreStyles = setStyles(element, styles)
  element.dataset.glassMerge = 'outline'

  // Inside the element, so its clip-path trims the rim to the glass: a 2px
  // stroke shows its inner pixel, and the lip and the shade line are the area
  // inside the outline but not inside itself moved a pixel down or up.
  const rim = createElement('svg', {
    'aria-hidden': 'true',
    height: '100%',
    style: 'position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none',
    width: '100%',
  })
  const defs = createElement('defs', {})
  rim.appendChild(defs)
  const outline = createElement('path', { 'fill-rule': 'evenodd', id: `${id}-outline` })
  defs.appendChild(outline)
  const offsetMask = (name: string, dy: string) => {
    const mask = createElement('mask', {
      height: '100%', id: `${id}-${name}`, maskUnits: 'userSpaceOnUse', width: '100%', x: '0', y: '0',
    })
    mask.appendChild(createElement('rect', { fill: '#fff', height: '100%', width: '100%' }))
    mask.appendChild(createElement('use', { fill: '#000', href: `#${id}-outline`, transform: `translate(0 ${dy})` }))
    defs.appendChild(mask)
  }
  offsetMask('lip', '1')
  offsetMask('shade', '-1.25')
  rim.appendChild(createElement('rect', {
    height: '100%', mask: `url(#${id}-lip)`, style: 'fill: var(--lq-glass-bright, rgba(255, 255, 255, 0.5))', width: '100%',
  }))
  rim.appendChild(createElement('rect', {
    height: '100%', mask: `url(#${id}-shade)`, style: 'fill: var(--lq-glass-shade, rgba(0, 0, 0, 0.12))', width: '100%',
  }))
  rim.appendChild(createElement('use', {
    fill: 'none', href: `#${id}-outline`, 'stroke-width': '2', style: 'stroke: var(--lq-clear-line, rgba(255, 255, 255, 0.3))',
  }))
  element.appendChild(rim)

  let width = 0
  let height = 0
  const resize = (): void => {
    width = element.offsetWidth
    height = element.offsetHeight
  }
  const resizeObserver = observeSize(element, resize)
  resize()

  let destroyed = false
  return {
    destroy: () => {
      if (destroyed) return
      destroyed = true
      resizeObserver?.disconnect()
      rim.remove()
      restoreStyles()
      delete element.dataset.glassMerge
    },
    mode: 'outline',
    setShapes: (shapes: readonly GlassMergeShape[]) => {
      if (destroyed) return
      const visible = shapes.map(prepareShape).filter(isVisible)
      let box = shapeBounds(visible, settings.spacing + GRID_STEP)
      // Nothing outside the element can show, so a laid-out element bounds the trace.
      if (box && width > 0 && height > 0) {
        const left = Math.max(0, box.x)
        const top = Math.max(0, box.y)
        const right = Math.min(width, box.x + box.width)
        const bottom = Math.min(height, box.y + box.height)
        box = right > left && bottom > top ? { height: bottom - top, width: right - left, x: left, y: top } : null
      }
      const path = box ? contourPath(traceContours(box, GRID_STEP, mergedField(visible, settings.spacing))) : ''
      element.style.setProperty('clip-path', path ? `path(evenodd, '${path}')` : 'inset(50%)')
      outline.setAttribute('d', path)
    },
  }
}

/**
 * Draws several glass shapes on one element so that they melt into each other
 * when they come within `spacing` of one another, like SwiftUI's
 * `GlassEffectContainer`. Shapes are given in the element's own pixels and can
 * be replaced on every animation frame.
 *
 * Where SVG filters run inside `backdrop-filter` (Chromium) the whole lens —
 * silhouette, refraction and rim — is built inside one filter. Elsewhere, or
 * when the lens or transparency is turned off, the element is clipped to the
 * merged outline over a blurred or solid material. `mode` says which.
 *
 * The element draws nothing else: give it no background, border or shadow,
 * and keep it out from under anything with `opacity`, `filter`, `clip-path`,
 * `mask` or `will-change: opacity`, which would leave the glass nothing
 * behind it to bend.
 */
export const attachGlassMerge = (
  element: HTMLElement,
  options: GlassMergeOptions = {},
): GlassMergeController => {
  const settings: Settings = {
    bezel: clamp(options.bezel ?? 14, 2, 64),
    spacing: clamp(options.spacing ?? 16, 0, 128),
    strength: clamp(options.strength ?? 1, 0, 1),
    tint: options.tint,
  }
  const reducedTransparency = options.respectReducedTransparency === true
    && mediaQuery('(prefers-reduced-transparency: reduce)').matches
  const opaque = options.transparency === false || reducedTransparency
  return options.lens !== false && !opaque && isLensSupported()
    ? attachLens(element, settings)
    : attachOutline(element, settings, opaque)
}
