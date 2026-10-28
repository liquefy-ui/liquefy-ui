import { clamp } from './math'
import {
  contourPath,
  gooInflation,
  mergedField,
  prepareShape,
  shapeBounds,
  shapeParts,
  traceContours,
  type PreparedShape,
} from './glass-merge-geometry'
import { createElement, isLensSupported } from './lens-filter'
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
/** `.lq-button`'s cast shadow, `0 8px 20px`: a blur radius of 20px is a σ of 10. */
const SHADOW_BLUR = 10
const SHADOW_DROP = 8
/** `--lq-rim-width`. */
const RIM_WIDTH = 1.6

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

type AddPrimitive = <Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attributes: Record<string, string>,
  parent?: Element,
) => SVGElementTagNameMap[Tag]

const primitives = (filter: SVGFilterElement): AddPrimitive => (tag, attributes, parent = filter) => {
  const child = createElement(tag, attributes)
  parent.appendChild(child)
  return child
}

/**
 * The filters live in a hidden `<svg>` inside the element rather than in one
 * shared at the end of the body, so that their colours can be the theme's
 * custom properties: a filter primitive inherits them like any element does,
 * and follows a theme switch with no script.
 */
const filterHost = (): SVGSVGElement => createElement('svg', {
  'aria-hidden': 'true',
  height: '0',
  style: 'position: absolute; width: 0; height: 0; overflow: hidden',
  width: '0',
})

/**
 * What `.lq-button` dresses its glass in, drawn from the merged outline
 * instead of a rectangle: the cast shadow, the lit ring of `.lq-surface__edge`,
 * and the inset highlight along the top with its shade along the bottom.
 * `mask` names the outline as an alpha mask. Returns the results to merge,
 * the shadow first, so the glass can go between it and the rest.
 */
const addDressing = (
  add: AddPrimitive,
  mask: string,
): { edges: string[], shadow: string, shadowBlur: SVGFEGaussianBlurElement } => {
  // Blurred and dropped, then kept outside the outline, so it falls on the page
  // around the glass and never darkens the glass itself.
  const shadowBlur = add('feGaussianBlur', { in: mask, result: 'lq-shadow-blur', stdDeviation: String(SHADOW_BLUR) })
  add('feOffset', { dy: String(SHADOW_DROP), in: 'lq-shadow-blur', result: 'lq-shadow-drop' })
  add('feFlood', {
    result: 'lq-shadow-color',
    style: 'flood-color: var(--lq-shadow-color, rgba(4, 9, 24, 0.14)); flood-opacity: 0.4',
  })
  add('feComposite', { in: 'lq-shadow-color', in2: 'lq-shadow-drop', operator: 'in', result: 'lq-shadow-cast' })
  add('feComposite', { in: 'lq-shadow-cast', in2: mask, operator: 'out', result: 'lq-shadow' })

  // The ring: the outline less itself eroded by the rim width. One diffuse
  // light from the top left, over a slightly softened copy of the outline,
  // shades it by which way each stretch of edge faces — bright up and to the
  // left, dimmer down and to the right, as the ring's gradient runs on a
  // single surface, but following every droplet and neck.
  add('feMorphology', { in: mask, operator: 'erode', radius: String(RIM_WIDTH), result: 'lq-core' })
  add('feComposite', { in: mask, in2: 'lq-core', operator: 'out', result: 'lq-ring' })
  add('feGaussianBlur', { in: mask, result: 'lq-bevel', stdDeviation: '1.4' })
  const light = add('feDiffuseLighting', {
    diffuseConstant: '1', in: 'lq-bevel', 'lighting-color': '#fff', result: 'lq-lit', surfaceScale: '3',
  })
  add('feDistantLight', { azimuth: '225', elevation: '35' }, light)
  // How lit, as alpha: never fully dark, so the ring still closes on the shaded side.
  add('feColorMatrix', {
    in: 'lq-lit', result: 'lq-facing', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0.25',
  })
  add('feComposite', { in: 'lq-facing', in2: 'lq-ring', operator: 'in', result: 'lq-ring-lit' })
  add('feFlood', { result: 'lq-rim-color', style: 'flood-color: var(--lq-rim-bright, #fff)' })
  add('feComposite', { in: 'lq-rim-color', in2: 'lq-ring-lit', operator: 'in', result: 'lq-rim' })

  // The inset lines: inside the outline but not inside itself moved a pixel
  // down (the highlight along the top) or up (the shade along the bottom).
  const inset = (dy: string, color: string, name: string) => {
    add('feOffset', { dy, in: mask, result: `lq-${name}-shift` })
    add('feComposite', { in: mask, in2: `lq-${name}-shift`, operator: 'out', result: `lq-${name}-band` })
    add('feFlood', { result: `lq-${name}-color`, style: `flood-color: ${color}` })
    add('feComposite', { in: `lq-${name}-color`, in2: `lq-${name}-band`, operator: 'in', result: `lq-${name}` })
  }
  inset('1', 'var(--lq-glass-bright, rgba(255, 255, 255, 0.32))', 'sheen')
  inset('-1', 'var(--lq-glass-shade, rgba(73, 111, 209, 0.07))', 'shade')

  return { edges: ['lq-rim', 'lq-sheen', 'lq-shade'], shadow: 'lq-shadow', shadowBlur }
}

/**
 * The lens built inside the filter. Each shape is an `feImage` sprite, or a
 * big rounded rect two floods and four corner discs (see `shapeParts`); the
 * pieces are merged, blurred and cut at half into one metaball mask; that
 * mask blurred again is a height field whose slope is the displacement map;
 * the backdrop is bent by it and cut to the mask, and the mask's edge gives
 * the shadow, the rim and the inset lines. Script per frame is the pieces'
 * attribute writes. Nothing is drawn on a canvas and nothing is encoded.
 *
 * What a frame costs is mostly the images, not the primitives: Chromium
 * shares no result between the primitives that read it, so the pieces are
 * drawn again down each of the fourteen paths that lead back to them — the
 * four offsets of the height field, the cut, two for the shadow and seven for
 * the rim and the lines. Primitives can be added freely; another reader of
 * the mask, or of anything built from it, costs one more drawing of every
 * image.
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
  const add = primitives(filter)

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

  const dressing = addDressing(add, 'lq-mask')
  const out = add('feMerge', {})
  for (const result of [dressing.shadow, 'lq-glass', ...dressing.edges]) add('feMergeNode', { in: result }, out)

  const host = filterHost()
  host.appendChild(filter)
  element.appendChild(host)

  // The shapes' pieces go in front of the merge, each with its node in it:
  // images in one pool and plain rectangles in another, so a piece only ever
  // changes its attributes, never what it is.
  type Slot = { attributes: Record<string, string>, element: SVGElement, node: SVGFEMergeNodeElement }
  const pools = { image: [] as Slot[], rect: [] as Slot[] }
  const fill = (kind: keyof typeof pools, count: number): Slot[] => {
    const pool = pools[kind]
    while (pool.length < count) {
      const result = `lq-${kind === 'image' ? 'sprite' : 'rect'}-${pool.length}`
      const element = kind === 'image'
        ? createElement('feImage', { preserveAspectRatio: 'none', result })
        : createElement('feFlood', { 'flood-color': '#fff', result })
      filter.insertBefore(element, merge)
      pool.push({ attributes: {}, element, node: add('feMergeNode', { in: result }, merge) })
    }
    while (pool.length > count) {
      const slot = pool.pop()!
      slot.element.remove()
      slot.node.remove()
    }
    return pool
  }
  // Only what changed is written: an unchanged href in particular must not be
  // set again, or the browser may treat it as a new image to load.
  const write = (slot: Slot, name: string, value: string): void => {
    if (slot.attributes[name] === value) return
    slot.attributes[name] = value
    slot.element.setAttribute(name, value)
  }

  // A primitive with no region of its own is cut to the box its inputs cover,
  // which here is the sprites'. The shadow is meant to spill out of that box,
  // so its blur, and everything after it, gets the whole filter.
  dressing.shadowBlur.setAttribute('x', '0')
  dressing.shadowBlur.setAttribute('y', '0')
  const resize = (): void => {
    for (const target of [filter, dressing.shadowBlur]) {
      target.setAttribute('width', String(element.offsetWidth))
      target.setAttribute('height', String(element.offsetHeight))
    }
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
      host.remove()
      restoreStyles()
      delete element.dataset.glassMerge
    },
    mode: 'lens',
    setShapes: (shapes: readonly GlassMergeShape[]) => {
      if (destroyed) return
      const parts = shapes.map(prepareShape).filter(isVisible)
        .flatMap((shape) => shapeParts(shape, gooInflation(shape.radius, sigma)))
      const images = fill('image', parts.filter((part) => part.kind === 'image').length)
      const rects = fill('rect', parts.length - images.length)

      // A flood is cut to its region rounded out to whole device pixels, which
      // would push every flat side out by up to a pixel; rounded to the nearest
      // one instead, the sides sit where the sprite's antialiased edge did.
      const ratio = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1
      const snap = (value: number): number => Math.round(value * ratio) / ratio
      const place = (slot: Slot, x: number, y: number, width: number, height: number): void => {
        write(slot, 'x', x.toFixed(2))
        write(slot, 'y', y.toFixed(2))
        write(slot, 'width', width.toFixed(2))
        write(slot, 'height', height.toFixed(2))
      }
      let image = 0
      let rect = 0
      for (const part of parts) {
        if (part.kind === 'image') {
          const slot = images[image++]!
          write(slot, 'href', part.href)
          place(slot, part.x, part.y, part.width, part.height)
        } else {
          const left = snap(part.x)
          const top = snap(part.y)
          place(rects[rect++]!, left, top, snap(part.x + part.width) - left, snap(part.y + part.height) - top)
        }
      }
    },
  }
}

/** How far the dressing reaches past the outline: the shadow's blur and drop. */
const DRESSING_REACH = SHADOW_BLUR * 3 + SHADOW_DROP + 2

/**
 * The outline for engines without the lens, and for less transparency: a
 * layer clipped every frame to the merged outline, traced by marching squares
 * over the smooth-min field, with the ordinary blurred material (or a solid
 * fill), and the same shadow, ring and inset lines as the lens, made by the
 * same filter from that contour.
 */
const attachOutline = (element: HTMLElement, settings: Settings, opaque: boolean): GlassMergeController => {
  const id = `lq-merge-${(mergeCount += 1)}`
  const { tint } = settings
  const fill = opaque
    ? tint ? `color-mix(in srgb, ${tint} 14%, ${SOLID})` : SOLID
    : tint ? `color-mix(in srgb, ${tint} 14%, transparent)` : 'rgba(255, 255, 255, 0.06)'
  // The layers are laid over the element from its top-left corner.
  const restoreStyles = typeof getComputedStyle === 'function' && getComputedStyle(element).position === 'static'
    ? setStyles(element, { position: 'relative' })
    : () => {}
  element.dataset.glassMerge = 'outline'

  // The glass is a child rather than the element itself, so that its clip-path
  // trims the frost to the outline without trimming the shadow outside it.
  const frost = document.createElement('div')
  frost.setAttribute('aria-hidden', 'true')
  setStyles(frost, {
    '-webkit-backdrop-filter': opaque ? 'none' : FROST,
    'backdrop-filter': opaque ? 'none' : FROST,
    'background-color': fill,
    'clip-path': 'inset(50%)',
    inset: '0',
    'pointer-events': 'none',
    position: 'absolute',
  })
  element.appendChild(frost)

  // Over the glass: the contour, filled, through the lens's own dressing. The
  // shadow lands outside the outline and the ring and lines inside it.
  const dressing = createElement('svg', {
    'aria-hidden': 'true',
    height: '100%',
    style: 'position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none',
    width: '100%',
  })
  const defs = createElement('defs', {})
  dressing.appendChild(defs)
  const outline = createElement('path', { fill: '#fff', 'fill-rule': 'evenodd', id: `${id}-outline` })
  defs.appendChild(outline)
  const filter = createElement('filter', {
    'color-interpolation-filters': 'sRGB',
    filterUnits: 'userSpaceOnUse',
    height: '0',
    id: `${id}-dressing`,
    primitiveUnits: 'userSpaceOnUse',
    width: '0',
    x: '0',
    y: '0',
  })
  defs.appendChild(filter)
  const add = primitives(filter)
  const results = addDressing(add, 'SourceAlpha')
  const out = add('feMerge', {})
  for (const result of [results.shadow, ...results.edges]) add('feMergeNode', { in: result }, out)
  dressing.appendChild(createElement('use', { filter: `url(#${id}-dressing)`, href: `#${id}-outline` }))
  element.appendChild(dressing)

  let destroyed = false
  return {
    destroy: () => {
      if (destroyed) return
      destroyed = true
      frost.remove()
      dressing.remove()
      restoreStyles()
      delete element.dataset.glassMerge
    },
    mode: 'outline',
    setShapes: (shapes: readonly GlassMergeShape[]) => {
      if (destroyed) return
      const visible = shapes.map(prepareShape).filter(isVisible)
      // Traced around the shapes rather than over the element: the element may
      // be resizing in the same frame, and its size is only known after layout.
      const box = shapeBounds(visible, settings.spacing + GRID_STEP)
      const path = box ? contourPath(traceContours(box, GRID_STEP, mergedField(visible, settings.spacing))) : ''
      frost.style.setProperty('clip-path', path ? `path(evenodd, '${path}')` : 'inset(50%)')
      outline.setAttribute('d', path)
      // The filter covers the shapes and the shadow around them, no more: an
      // engine that rasterises the whole region pays for every pixel of it.
      if (box) {
        filter.setAttribute('x', String(box.x - DRESSING_REACH))
        filter.setAttribute('y', String(box.y - DRESSING_REACH))
        filter.setAttribute('width', String(box.width + DRESSING_REACH * 2))
        filter.setAttribute('height', String(box.height + DRESSING_REACH * 2))
      }
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
 * silhouette, refraction, rim and shadow — is built inside one filter.
 * Elsewhere, or when the lens or transparency is turned off, a layer clipped
 * to the merged outline holds a blurred or solid material, with the same rim
 * and shadow over it. `mode` says which. The colours are the theme's: the
 * rim, the inset lines and the shadow read `--lq-rim-bright`,
 * `--lq-glass-bright`, `--lq-glass-shade` and `--lq-shadow-color`.
 *
 * The shadow falls up to 40px below the shapes and 30px to either side. In
 * the lens it is part of the element's backdrop filter, which cannot draw
 * outside the element, so leave the element that much room around them.
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
