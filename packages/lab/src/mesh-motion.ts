import { clamp } from '@liquefy-ui/core'
import { fromOklab, toOklab, type BackdropRgb } from './backdrop-color'
import { seededRandom } from './fluid-motion'

/** The knobs of a mesh gradient. */
export type MeshOptions = {
  /** Points across each row, 2 to 8. */
  columns: number
  /** Most device pixels per CSS pixel the canvas is drawn at. A gradient has no edges, so 1 loses nothing visible. */
  maxPixelRatio: number
  /** Points down each column, 2 to 8. */
  rows: number
  /** How fast the points drift, 1 being the default pace. 0 holds them still. */
  speed: number
  /** 0 to 0.45: how far a point strays from its place, in cells. Past half a cell, neighbours could cross. */
  wander: number
}

export const MESH_DEFAULTS: Readonly<MeshOptions> = {
  columns: 3,
  maxPixelRatio: 1,
  rows: 3,
  speed: 1,
  wander: 0.3,
}

const LIMITS: Record<keyof MeshOptions, readonly [number, number, boolean]> = {
  // [least, most, whole numbers only]
  columns: [2, 8, true],
  maxPixelRatio: [0.25, 3, false],
  rows: [2, 8, true],
  speed: [0, 4, false],
  wander: [0, 0.45, false],
}

/**
 * Fills in what was left out and holds everything else to its range: a
 * value that is not a number falls back to the default, and one outside the
 * range is clamped to its end.
 */
export const resolveMeshOptions = (options: Partial<MeshOptions> = {}): MeshOptions => {
  const resolved = { ...MESH_DEFAULTS }
  for (const key of Object.keys(LIMITS) as (keyof MeshOptions)[]) {
    const value = options[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const [least, most, whole] = LIMITS[key]
    resolved[key] = clamp(whole ? Math.round(value) : value, least, most)
  }
  return resolved
}

/**
 * Lays a palette onto a grid of `columns` × `rows` points, row by row. A
 * palette exactly that long is used as it is. A shorter one is repeated in a
 * staggered order — each row starts further along than the one above — so no
 * two neighbouring points share a colour where the palette has enough of them
 * to avoid it; a longer one is cut short.
 */
export function meshColorGrid(palette: readonly BackdropRgb[], columns: number, rows: number): BackdropRgb[]
export function meshColorGrid<T>(palette: readonly T[], columns: number, rows: number, empty: T): T[]
export function meshColorGrid<T>(palette: readonly T[], columns: number, rows: number, empty?: T): T[] {
  const count = columns * rows
  const blank = (empty ?? [0.5, 0.5, 0.5]) as T
  if (palette.length === 0) return Array.from({ length: count }, () => blank)
  if (palette.length >= count) return palette.slice(0, count)
  const n = palette.length
  const shift = n >= 3 ? Math.floor(n / 2) : 1
  return Array.from({ length: count }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return palette[(column + row * shift) % n] ?? blank
  })
}

type Drift = {
  /** Reach on each axis, in fractions of the gradient; zero for an axis the point may not move along. */
  ax: number
  ay: number
  /** Angular speeds and phases of two harmonics per axis. */
  f1: number
  f2: number
  g1: number
  g2: number
  p1: number
  p2: number
  q1: number
  q2: number
}

/**
 * The points of a mesh gradient and how they drift. Each point has a home on
 * an even grid and wanders round it on a slow, never-quite-repeating loop of
 * two sine harmonics per axis, up to `wander` of a cell away. Corner points
 * stay in their corners and edge points slide only along their edge, so the
 * mesh always covers the whole rectangle; points inside move freely. Since
 * no point strays as much as half a cell, neighbours never cross.
 *
 * Positions are fractions of the gradient from its top-left corner. It
 * touches no DOM: `points(time)` is the whole of it.
 */
export class MeshMotion {
  private readonly drifts: Drift[]

  public constructor(
    public readonly columns: number,
    public readonly rows: number,
    wander: number = MESH_DEFAULTS.wander,
    seed = 1,
  ) {
    const random = seededRandom(seed)
    const reach = clamp(wander, 0, 0.45)
    this.drifts = Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const freeX = column > 0 && column < columns - 1
      const freeY = row > 0 && row < rows - 1
      // A full swing every eight to sixteen seconds at speed 1.
      const speed = () => 0.4 + random() * 0.4
      return {
        ax: freeX ? reach / (columns - 1) : 0,
        ay: freeY ? reach / (rows - 1) : 0,
        f1: speed(),
        f2: speed() * 1.9,
        g1: speed(),
        g2: speed() * 1.6,
        p1: random() * Math.PI * 2,
        p2: random() * Math.PI * 2,
        q1: random() * Math.PI * 2,
        q2: random() * Math.PI * 2,
      }
    })
  }

  /** Every point's position at `time`, row by row, as x, y pairs. */
  public points(time: number, into?: Float32Array): Float32Array {
    const out = into ?? new Float32Array(this.columns * this.rows * 2)
    for (let index = 0; index < this.drifts.length; index += 1) {
      const drift = this.drifts[index]
      if (!drift) continue
      const column = index % this.columns
      const row = Math.floor(index / this.columns)
      out[index * 2] = column / (this.columns - 1)
        + drift.ax * (0.7 * Math.sin(drift.f1 * time + drift.p1) + 0.3 * Math.sin(drift.f2 * time + drift.p2))
      out[index * 2 + 1] = row / (this.rows - 1)
        + drift.ay * (0.7 * Math.sin(drift.g1 * time + drift.q1) + 0.3 * Math.sin(drift.g2 * time + drift.q2))
    }
    return out
  }
}

/**
 * A mesh gradient cut into small triangles: for each vertex, which grid
 * points it is made of and how much of each. The surface through the points
 * is a Catmull–Rom patch in each direction, so it passes through every point
 * with no kink at the seams between cells, which is what makes the colour
 * flow rather than show the grid.
 */
export type MeshTessellation = {
  /** Triangle corners, three per triangle. */
  indices: Uint16Array
  /** Sixteen grid points per vertex. */
  sources: Int32Array
  /** Vertices across and down. */
  vertexColumns: number
  vertexRows: number
  /** The weight of each of a vertex's sixteen grid points. */
  weights: Float32Array
}

const catmullRom = (t: number): readonly [number, number, number, number] => {
  const t2 = t * t
  const t3 = t2 * t
  return [
    (-t3 + 2 * t2 - t) / 2,
    (3 * t3 - 5 * t2 + 2) / 2,
    (-3 * t3 + 4 * t2 + t) / 2,
    (t3 - t2) / 2,
  ]
}

/**
 * The weights for one axis: the four points either side of `t` within cell
 * `cell` of a row of `count`, with the points one past each end — which do
 * not exist — folded back as straight-line extrapolations of the last two.
 */
const axisWeights = (cell: number, t: number, count: number): [number, number][] => {
  const basis = catmullRom(t)
  const weights = new Map<number, number>()
  const add = (index: number, weight: number) => weights.set(index, (weights.get(index) ?? 0) + weight)
  basis.forEach((weight, offset) => {
    const index = cell - 1 + offset
    if (index < 0) {
      add(0, 2 * weight)
      add(1, -weight)
    } else if (index > count - 1) {
      add(count - 1, 2 * weight)
      add(count - 2, -weight)
    } else {
      add(index, weight)
    }
  })
  return [...weights.entries()]
}

/**
 * Cuts a `columns` × `rows` mesh into about `density` vertices along each
 * side in all, however many points it has, so a finer grid of points does not
 * cost more to draw.
 */
export const tessellateMesh = (columns: number, rows: number, density = 48): MeshTessellation => {
  const perColumn = Math.max(1, Math.ceil(density / (columns - 1)))
  const perRow = Math.max(1, Math.ceil(density / (rows - 1)))
  const vertexColumns = (columns - 1) * perColumn + 1
  const vertexRows = (rows - 1) * perRow + 1
  const vertices = vertexColumns * vertexRows
  const sources = new Int32Array(vertices * 16)
  const weights = new Float32Array(vertices * 16)

  for (let vy = 0; vy < vertexRows; vy += 1) {
    const cellY = Math.min(Math.floor(vy / perRow), rows - 2)
    const ys = axisWeights(cellY, vy / perRow - cellY, rows)
    for (let vx = 0; vx < vertexColumns; vx += 1) {
      const cellX = Math.min(Math.floor(vx / perColumn), columns - 2)
      const xs = axisWeights(cellX, vx / perColumn - cellX, columns)
      const base = (vy * vertexColumns + vx) * 16
      let slot = 0
      for (const [row, wy] of ys) {
        for (const [column, wx] of xs) {
          sources[base + slot] = row * columns + column
          weights[base + slot] = wx * wy
          slot += 1
        }
      }
      // Fewer than sixteen distinct points near an edge: the rest weigh nothing.
      for (; slot < 16; slot += 1) {
        sources[base + slot] = 0
        weights[base + slot] = 0
      }
    }
  }

  const indices = new Uint16Array((vertexColumns - 1) * (vertexRows - 1) * 6)
  let at = 0
  for (let vy = 0; vy < vertexRows - 1; vy += 1) {
    for (let vx = 0; vx < vertexColumns - 1; vx += 1) {
      const a = vy * vertexColumns + vx
      const b = a + 1
      const c = a + vertexColumns
      const d = c + 1
      indices.set([a, c, b, b, c, d], at)
      at += 6
    }
  }
  return { indices, sources, vertexColumns, vertexRows, weights }
}

/** Where each vertex of `mesh` is, for grid points at `points` (from `MeshMotion.points`). */
export const meshPositions = (
  mesh: MeshTessellation,
  points: Float32Array,
  into?: Float32Array,
): Float32Array => {
  const out = into ?? new Float32Array(mesh.vertexColumns * mesh.vertexRows * 2)
  const { sources, weights } = mesh
  const vertices = mesh.vertexColumns * mesh.vertexRows
  for (let vertex = 0; vertex < vertices; vertex += 1) {
    let x = 0
    let y = 0
    for (let slot = vertex * 16; slot < vertex * 16 + 16; slot += 1) {
      const weight = weights[slot] ?? 0
      if (weight === 0) continue
      const source = (sources[slot] ?? 0) * 2
      x += weight * (points[source] ?? 0)
      y += weight * (points[source + 1] ?? 0)
    }
    out[vertex * 2] = x
    out[vertex * 2 + 1] = y
  }
  return out
}

/**
 * The colour of each vertex of `mesh`, from one colour per grid point. The
 * blending is done in OKLab, so the way from one colour to its neighbour
 * passes through colours as vivid as the two ends rather than a grey middle.
 */
export const meshColors = (mesh: MeshTessellation, grid: readonly BackdropRgb[]): Float32Array => {
  const labs = grid.map(toOklab)
  const vertices = mesh.vertexColumns * mesh.vertexRows
  const out = new Float32Array(vertices * 3)
  for (let vertex = 0; vertex < vertices; vertex += 1) {
    let l = 0
    let a = 0
    let b = 0
    for (let slot = vertex * 16; slot < vertex * 16 + 16; slot += 1) {
      const weight = mesh.weights[slot] ?? 0
      if (weight === 0) continue
      const lab = labs[mesh.sources[slot] ?? 0] ?? [0.5, 0, 0]
      l += weight * lab[0]
      a += weight * lab[1]
      b += weight * lab[2]
    }
    // The curve can swing a little past its ends; the conversion clamps it back.
    out.set(fromOklab([clamp(l), a, b]), vertex * 3)
  }
  return out
}

/**
 * Draws `mesh` into an RGBA pixel buffer `width` × `height`, without a GPU:
 * every triangle filled with its corners' colours blended across it. This is
 * the 2D-canvas stand-in for WebGL, drawn small and scaled up by the browser,
 * which costs little because a gradient has nothing sharp to lose.
 */
export const rasterizeMesh = (
  mesh: MeshTessellation,
  positions: Float32Array,
  colors: Float32Array,
  width: number,
  height: number,
  out: Uint8ClampedArray,
): void => {
  const { indices } = mesh
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] ?? 0
    const b = indices[index + 1] ?? 0
    const c = indices[index + 2] ?? 0
    // Into pixel space, sampling at pixel centres.
    const ax = (positions[a * 2] ?? 0) * width
    const ay = (positions[a * 2 + 1] ?? 0) * height
    const bx = (positions[b * 2] ?? 0) * width
    const by = (positions[b * 2 + 1] ?? 0) * height
    const cx = (positions[c * 2] ?? 0) * width
    const cy = (positions[c * 2 + 1] ?? 0) * height
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    if (Math.abs(area) < 1e-9) continue
    const left = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 0.5))
    const right = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx) - 0.5))
    const top = Math.max(0, Math.floor(Math.min(ay, by, cy) - 0.5))
    const bottom = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy) - 0.5))
    for (let py = top; py <= bottom; py += 1) {
      const y = py + 0.5
      for (let px = left; px <= right; px += 1) {
        const x = px + 0.5
        // Barycentric weights. A pixel centre exactly on a shared edge belongs
        // to both triangles; the tolerance stops one from slipping between
        // them through rounding.
        const wa = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / area
        const wb = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / area
        const wc = 1 - wa - wb
        if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue
        const pixel = (py * width + px) * 4
        for (let channel = 0; channel < 3; channel += 1) {
          out[pixel + channel] = 255 * (
            wa * (colors[a * 3 + channel] ?? 0)
            + wb * (colors[b * 3 + channel] ?? 0)
            + wc * (colors[c * 3 + channel] ?? 0)
          )
        }
        out[pixel + 3] = 255
      }
    }
  }
}

/**
 * A CSS background that stands in for a gradient that is not drawn yet — on
 * the server, before the first frame, and where neither WebGL nor a 2D
 * canvas is available: a soft pool of each colour laid where its point sits,
 * over the average of them all. `colors` can be any CSS colours, one per
 * point, row by row.
 */
export const meshFallbackCss = (colors: readonly string[], columns: number, rows: number): string => {
  if (colors.length === 0) return 'transparent'
  const pools = colors.slice(0, columns * rows).map((color, index) => {
    const x = Math.round(((index % columns) / Math.max(1, columns - 1)) * 100)
    const y = Math.round((Math.floor(index / columns) / Math.max(1, rows - 1)) * 100)
    return `radial-gradient(farthest-side at ${x}% ${y}%, ${color}, transparent)`
  })
  return [...pools, `linear-gradient(${colors[0]}, ${colors.at(-1) ?? colors[0]})`].join(', ')
}
