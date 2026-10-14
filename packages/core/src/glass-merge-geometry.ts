import { clamp } from './math'
import type { GlassMergeShape } from './types'

// The pure half of attachGlassMerge: the merged field the outline is traced
// from, and the sprites the lens is built from. Nothing here touches the DOM.

export type ContourBox = { height: number, width: number, x: number, y: number }

/**
 * A shape ready to be sampled: its half extents, its clamped corner radius,
 * and the inverse of its stretch as a symmetric 2×2 matrix `[a b; b d]`.
 */
export type PreparedShape = {
  a: number
  b: number
  d: number
  /** How far the stretched shape reaches from its centre along x and y. */
  extentX: number
  extentY: number
  halfHeight: number
  halfWidth: number
  /** The stretch shortens distances by up to this much, so the field stays a lower bound. */
  lipschitz: number
  radius: number
  stretch: number
  /** The stretch's direction folded into [0, 180), since a rounded rect turned half a turn is itself. */
  angle: number
  x: number
  y: number
}

const finite = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) ? value : fallback

export const prepareShape = (shape: GlassMergeShape): PreparedShape => {
  const halfWidth = Math.max(0, finite(shape.width, 0) / 2)
  const halfHeight = Math.max(0, finite(shape.height, 0) / 2)
  const radius = clamp(finite(shape.radius, 0), 0, Math.min(halfWidth, halfHeight))
  const stretch = clamp(finite(shape.stretch, 1), 0.2, 5)
  const angle = (((finite(shape.angle, 0) % 180) + 180) % 180)
  const x = finite(shape.x, 0)
  const y = finite(shape.y, 0)

  if (stretch === 1) {
    return {
      a: 1, angle: 0, b: 0, d: 1, extentX: halfWidth, extentY: halfHeight,
      halfHeight, halfWidth, lipschitz: 1, radius, stretch, x, y,
    }
  }

  // The stretch is R(angle) · diag(k, 1/k) · R(-angle), the transform
  // DropletMenu gives a droplet in flight. It is symmetric, and so is its
  // inverse, which is the same thing with k and 1/k swapped.
  const turn = (angle * Math.PI) / 180
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const forwardA = c * c * stretch + (s * s) / stretch
  const forwardB = c * s * (stretch - 1 / stretch)
  const forwardD = s * s * stretch + (c * c) / stretch
  return {
    a: (c * c) / stretch + s * s * stretch,
    angle,
    b: c * s * (1 / stretch - stretch),
    d: (s * s) / stretch + c * c * stretch,
    extentX: Math.abs(forwardA) * halfWidth + Math.abs(forwardB) * halfHeight,
    extentY: Math.abs(forwardB) * halfWidth + Math.abs(forwardD) * halfHeight,
    halfHeight,
    halfWidth,
    lipschitz: Math.min(stretch, 1 / stretch),
    radius,
    stretch,
    x,
    y,
  }
}

/**
 * Signed distance to a rounded rect, negative inside. A stretched shape is
 * measured in its own unstretched frame and scaled back by the smaller axis,
 * which keeps the outline exact and the distance a safe underestimate.
 */
export const roundRectDistance = (px: number, py: number, shape: PreparedShape): number => {
  const dx = px - shape.x
  const dy = py - shape.y
  const lx = shape.a * dx + shape.b * dy
  const ly = shape.b * dx + shape.d * dy
  const qx = Math.abs(lx) - shape.halfWidth + shape.radius
  const qy = Math.abs(ly) - shape.halfHeight + shape.radius
  const ox = qx > 0 ? qx : 0
  const oy = qy > 0 ? qy : 0
  const distance = Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - shape.radius
  return distance * shape.lipschitz
}

/**
 * Quadratic smooth minimum. Two edges closer than `k / 2` bridge, and where
 * shapes overlap the concave corner fills by up to `k / 4`.
 */
export const smoothMin = (a: number, b: number, k: number): number => {
  if (k <= 0) return Math.min(a, b)
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/** The merged outline as a field, negative inside: every shape folded together with `smoothMin`. */
export const mergedField = (shapes: readonly PreparedShape[], spacing: number) => {
  const k = Math.max(0, spacing) * 2
  return (px: number, py: number): number => {
    if (shapes.length === 0) return 1
    let distance = roundRectDistance(px, py, shapes[0]!)
    for (let index = 1; index < shapes.length; index += 1) {
      distance = smoothMin(distance, roundRectDistance(px, py, shapes[index]!), k)
    }
    return distance
  }
}

/** The box the shapes reach into, grown by `pad` on every side. Null when there is nothing to draw. */
export const shapeBounds = (shapes: readonly PreparedShape[], pad: number): ContourBox | null => {
  if (shapes.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const shape of shapes) {
    left = Math.min(left, shape.x - shape.extentX)
    top = Math.min(top, shape.y - shape.extentY)
    right = Math.max(right, shape.x + shape.extentX)
    bottom = Math.max(bottom, shape.y + shape.extentY)
  }
  left = Math.floor(left - pad)
  top = Math.floor(top - pad)
  return { height: Math.ceil(bottom + pad) - top, width: Math.ceil(right + pad) - left, x: left, y: top }
}

/**
 * Traces `sample < 0` over the box with marching squares, one sample every
 * `step` pixels, and returns each closed loop as a flat `[x0, y0, x1, y1, …]`.
 *
 * Every crossing is keyed by the grid edge it sits on, so it is shared by
 * exactly two segments and the loops can be walked without orientation
 * tables. The ring of samples around the box is forced outside, so every
 * loop closes. Loops nest for holes; drawn with `evenodd` they come out right.
 */
export const traceContours = (
  box: ContourBox,
  step: number,
  sample: (x: number, y: number) => number,
): number[][] => {
  const columns = Math.ceil(box.width / step) + 2
  const rows = Math.ceil(box.height / step) + 2
  const originX = box.x - step
  const originY = box.y - step
  const stride = columns + 1
  const values = new Float64Array(stride * (rows + 1))
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      values[row * stride + column] = row === 0 || column === 0 || row === rows || column === columns
        ? 1
        : sample(originX + column * step, originY + row * step)
    }
  }

  const xs: number[] = []
  const ys: number[] = []
  const pointByEdge = new Map<number, number>()
  const links: number[][] = []
  const point = (edgeKey: number, x: number, y: number): number => {
    let index = pointByEdge.get(edgeKey)
    if (index === undefined) {
      index = xs.length
      xs.push(x)
      ys.push(y)
      links.push([])
      pointByEdge.set(edgeKey, index)
    }
    return index
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const v0 = values[row * stride + column]!
      const v1 = values[row * stride + column + 1]!
      const v2 = values[(row + 1) * stride + column + 1]!
      const v3 = values[(row + 1) * stride + column]!
      const corners = (v0 < 0 ? 8 : 0) | (v1 < 0 ? 4 : 0) | (v2 < 0 ? 2 : 0) | (v3 < 0 ? 1 : 0)
      if (corners === 0 || corners === 15) continue

      const x = originX + column * step
      const y = originY + row * step
      // Edges 0–3 are top, right, bottom, left. A horizontal edge is keyed by
      // its left vertex times two, a vertical one by its top vertex times two plus one.
      const edge = (side: number): number => {
        if (side === 0) return point((row * stride + column) * 2, x + step * (v0 / (v0 - v1)), y)
        if (side === 1) return point((row * stride + column + 1) * 2 + 1, x + step, y + step * (v1 / (v1 - v2)))
        if (side === 2) return point(((row + 1) * stride + column) * 2, x + step * (v3 / (v3 - v2)), y + step)
        return point((row * stride + column) * 2 + 1, x, y + step * (v0 / (v0 - v3)))
      }
      const segment = (from: number, to: number): void => {
        const a = edge(from)
        const b = edge(to)
        links[a]!.push(b)
        links[b]!.push(a)
      }
      switch (corners) {
        case 1: case 14: segment(3, 2); break
        case 2: case 13: segment(2, 1); break
        case 3: case 12: segment(3, 1); break
        case 4: case 11: segment(0, 1); break
        case 6: case 9: segment(0, 2); break
        case 7: case 8: segment(3, 0); break
        case 5: case 10: {
          // A saddle: the cell's mean decides whether its two inside corners join.
          const centreInside = (v0 + v1 + v2 + v3) / 4 < 0
          if ((corners === 5) === centreInside) {
            segment(3, 0)
            segment(1, 2)
          } else {
            segment(0, 1)
            segment(3, 2)
          }
          break
        }
        default: break
      }
    }
  }

  const visited = new Uint8Array(xs.length)
  const loops: number[][] = []
  for (let start = 0; start < xs.length; start += 1) {
    if (visited[start]) continue
    const loop = [xs[start]!, ys[start]!]
    visited[start] = 1
    let previous = -1
    let current = start
    for (;;) {
      const next = links[current]!
      const candidate = next[0] !== previous ? next[0] : next[1]
      if (candidate === undefined || visited[candidate]) break
      loop.push(xs[candidate]!, ys[candidate]!)
      visited[candidate] = 1
      previous = current
      current = candidate
    }
    loops.push(loop)
  }
  return loops
}

/** Loops as SVG/CSS path data, one `M…Z` each, to one decimal. */
export const contourPath = (loops: readonly (readonly number[])[]): string => {
  let path = ''
  for (const loop of loops) {
    for (let index = 0; index < loop.length; index += 2) {
      path += `${index === 0 ? 'M' : 'L'}${loop[index]!.toFixed(1)} ${loop[index + 1]!.toFixed(1)}`
    }
    path += 'Z'
  }
  return path
}

// --------------------------------------------------------------- sprites ---

// Abramowitz & Stegun 7.1.26, good to 1.5e-7 — plenty for a threshold.
const erf = (x: number): number => {
  const sign = x < 0 ? -1 : 1
  const z = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * z)
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  return sign * (1 - poly * Math.exp(-z * z))
}

const normalCdf = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2))

/**
 * A white disc of radius `discRadius` blurred by `sigma`, read `distance`
 * from its centre. The blur is separable, so across x it is a difference of
 * two normal CDFs and only the integral over y is left; `y = R sin θ` takes
 * the square root out of it so Simpson's rule converges quickly.
 */
export const blurredDiscAt = (discRadius: number, distance: number, sigma: number): number => {
  if (discRadius <= 0) return 0
  if (sigma <= 0) return distance < discRadius ? 1 : 0
  const intervals = 64
  const stepAngle = Math.PI / 2 / intervals
  let sum = 0
  for (let index = 0; index <= intervals; index += 1) {
    const theta = index * stepAngle
    const y = discRadius * Math.sin(theta)
    const halfChord = discRadius * Math.cos(theta)
    const across = normalCdf((halfChord - distance) / sigma) - normalCdf((-halfChord - distance) / sigma)
    const density = Math.exp(-(y * y) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))
    const weight = index === 0 || index === intervals ? 1 : index % 2 === 1 ? 4 : 2
    sum += weight * density * across * halfChord
  }
  // Both halves of the disc in y.
  return (2 * sum * stepAngle) / 3
}

const inflationCache = new Map<string, number>()

/**
 * How much to grow a shape's sprite so that, once the sprites are blurred by
 * `sigma` and cut at half, a lone shape with this corner radius keeps its
 * size: a blurred disc cut at 0.5 comes out smaller than it went in.
 *
 * It is one number per shape, worked out for the corners. Straight sides
 * erode far less, so a pill's flat sides end up about this much too far out.
 */
export const gooInflation = (radius: number, sigma: number): number => {
  if (sigma <= 0) return 0
  const r = Math.max(0, Math.round(radius * 2) / 2)
  const key = `${r}:${sigma.toFixed(3)}`
  const cached = inflationCache.get(key)
  if (cached !== undefined) return cached

  let low = r
  let high = r + sigma * 3
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const middle = (low + high) / 2
    if (blurredDiscAt(middle, r, sigma) < 0.5) low = middle
    else high = middle
  }
  const growth = (low + high) / 2 - r
  if (inflationCache.size > 512) inflationCache.clear()
  inflationCache.set(key, growth)
  return growth
}

export type GlassMergeSprite = {
  /** Half the sprite image's width and height, in its own units. */
  halfHeight: number
  halfWidth: number
  href: string
  key: string
  /** Pixels per sprite unit when it is drawn for this shape. */
  scale: number
}

const STRETCH_STEP = 0.02
const ANGLE_STEP = 3
/** A circle's sprite is drawn at this radius and scaled to fit, so one image serves every size. */
const CIRCLE_UNITS = 32

const round = (value: number, step: number): number => Math.round(value / step) * step
const format = (value: number): string => String(Math.round(value * 100) / 100)

/**
 * Stretch and angle snapped to the steps sprites are cached at. A stretch
 * within half a step of none drops its angle, which then means nothing.
 */
export const quantiseStretch = (stretch: number, angle: number): readonly [number, number] => {
  const k = Math.round(round(stretch, STRETCH_STEP) * 100) / 100
  if (k === 1) return [1, 0]
  return [k, round(angle, ANGLE_STEP) % 180]
}

type SpriteShape = {
  angle: number
  height: number
  key: string
  radius: number
  /** Pixels per sprite unit. */
  scale: number
  stretch: number
  width: number
}

/**
 * The sprite a shape needs, in the sprite's own units, and the key it is
 * cached under. Position never matters. A circle scales uniformly, so one
 * drawn at a fixed size serves every size and only its stretch is in the key.
 * Anything else is keyed by its grown size to the pixel, which the blur after
 * it cannot resolve anyway.
 */
const describeSprite = (shape: PreparedShape, growth: number): SpriteShape => {
  const [stretch, angle] = quantiseStretch(shape.stretch, shape.angle)
  const width = shape.halfWidth * 2 + growth * 2
  const height = shape.halfHeight * 2 + growth * 2
  const radius = shape.radius + growth
  if (Math.abs(width - height) < 0.5 && radius >= Math.min(width, height) / 2 - 0.25) {
    return {
      angle,
      height: CIRCLE_UNITS * 2,
      key: `c:${stretch}:${angle}`,
      radius: CIRCLE_UNITS,
      scale: (width + height) / 4 / CIRCLE_UNITS,
      stretch,
      width: CIRCLE_UNITS * 2,
    }
  }
  const roundedWidth = Math.max(1, Math.round(width))
  const roundedHeight = Math.max(1, Math.round(height))
  const roundedRadius = Math.min(Math.round(radius * 2) / 2, roundedWidth / 2, roundedHeight / 2)
  return {
    angle,
    height: roundedHeight,
    key: `r:${roundedWidth}x${roundedHeight}:${roundedRadius}:${stretch}:${angle}`,
    radius: roundedRadius,
    scale: 1,
    stretch,
    width: roundedWidth,
  }
}

/** The key a shape's sprite is cached under; see `spriteFor`. */
export const spriteKey = (shape: PreparedShape, growth: number): string => describeSprite(shape, growth).key

const spriteCache = new Map<string, Omit<GlassMergeSprite, 'scale'>>()

const buildSprite = ({ angle, height, key, radius, stretch, width }: SpriteShape): Omit<GlassMergeSprite, 'scale'> => {
  // The same R · diag(k, 1/k) · R⁻¹ as prepareShape, forward this time.
  const turn = (angle * Math.PI) / 180
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const a = c * c * stretch + (s * s) / stretch
  const b = c * s * (stretch - 1 / stretch)
  const d = s * s * stretch + (c * c) / stretch
  // The sprite's own box: big enough for the stretched shape, plus a unit so
  // its antialiased edge is not cut.
  const halfWidth = Math.ceil(Math.abs(a) * (width / 2) + Math.abs(b) * (height / 2)) + 1
  const halfHeight = Math.ceil(Math.abs(b) * (width / 2) + Math.abs(d) * (height / 2)) + 1
  const transform = stretch === 1 ? '' : ` transform="matrix(${format(a)} ${format(b)} ${format(b)} ${format(d)} 0 0)"`
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${halfWidth * 2}" height="${halfHeight * 2}" `
    + `viewBox="${-halfWidth} ${-halfHeight} ${halfWidth * 2} ${halfHeight * 2}">`
    + `<rect x="${format(-width / 2)}" y="${format(-height / 2)}" width="${format(width)}" height="${format(height)}" `
    + `rx="${format(radius)}"${transform} fill="#fff"/></svg>`
  return { halfHeight, halfWidth, href: `data:image/svg+xml,${encodeURIComponent(markup)}`, key }
}

/**
 * The sprite for a shape grown by `growth`: a white rounded rect as an SVG
 * `data:` image, stretched if the shape is. Built once per key and cached,
 * because every new image is a new SVG document for the browser to parse,
 * while moving or scaling one already loaded is only an attribute write.
 */
export const spriteFor = (shape: PreparedShape, growth: number): GlassMergeSprite => {
  const described = describeSprite(shape, growth)
  let sprite = spriteCache.get(described.key)
  if (!sprite) {
    sprite = buildSprite(described)
    if (spriteCache.size >= 256) spriteCache.delete(spriteCache.keys().next().value!)
    spriteCache.set(described.key, sprite)
  }
  return { ...sprite, scale: described.scale }
}
