import { describe, expect, it } from 'vitest'
import type { BackdropRgb } from '../src/backdrop-color'
import {
  MESH_DEFAULTS,
  meshColorGrid,
  meshColors,
  meshFallbackCss,
  MeshMotion,
  meshPositions,
  rasterizeMesh,
  resolveMeshOptions,
  tessellateMesh,
} from '../src/mesh-motion'

const RED: BackdropRgb = [1, 0, 0]
const GREEN: BackdropRgb = [0, 1, 0]
const BLUE: BackdropRgb = [0, 0, 1]

/** A point of a flat `x, y` array. */
const at = (points: Float32Array, index: number) => ({ x: points[index * 2] ?? Number.NaN, y: points[index * 2 + 1] ?? Number.NaN })

describe('resolveMeshOptions', () => {
  it('fills in the defaults', () => {
    expect(resolveMeshOptions()).toEqual(MESH_DEFAULTS)
  })

  it('clamps, rounds the grid and ignores what is not a number', () => {
    expect(resolveMeshOptions({ columns: 1, maxPixelRatio: 0, rows: 12.4, speed: -1, wander: 0.9 })).toEqual({
      columns: 2,
      maxPixelRatio: 0.25,
      rows: 8,
      speed: 0,
      wander: 0.45,
    })
    expect(resolveMeshOptions({ columns: Number.NaN }).columns).toBe(MESH_DEFAULTS.columns)
  })
})

describe('meshColorGrid', () => {
  it('uses a palette as long as the grid as it is', () => {
    const palette = Array.from({ length: 4 }, (_, index) => [index / 3, 0, 0] as const)
    expect(meshColorGrid(palette, 2, 2)).toEqual(palette)
  })

  it('repeats a short palette so that no two neighbours match', () => {
    for (const [count, columns, rows] of [[3, 3, 3], [4, 3, 3], [5, 4, 4], [6, 5, 3], [3, 6, 6]] as const) {
      const palette = Array.from({ length: count }, (_, index) => index)
      const grid = meshColorGrid(palette, columns, rows, -1)
      expect(grid).toHaveLength(columns * rows)
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const here = grid[row * columns + column]
          if (column + 1 < columns) expect(grid[row * columns + column + 1]).not.toBe(here)
          if (row + 1 < rows) expect(grid[(row + 1) * columns + column]).not.toBe(here)
        }
      }
      expect(new Set(grid).size).toBe(count)
    }
  })

  it('alternates two colours like a chessboard', () => {
    expect(meshColorGrid(['a', 'b'], 3, 2, '')).toEqual(['a', 'b', 'a', 'b', 'a', 'b'])
  })

  it('cuts a long palette short, and fills an empty one with the blank', () => {
    expect(meshColorGrid([1, 2, 3, 4, 5], 2, 2, 0)).toEqual([1, 2, 3, 4])
    expect(meshColorGrid([], 2, 1, 'x')).toEqual(['x', 'x'])
  })
})

describe('MeshMotion', () => {
  const columns = 4
  const rows = 3
  const motion = new MeshMotion(columns, rows, 0.45)
  const times = Array.from({ length: 400 }, (_, index) => index * 0.731)

  it('keeps the corners in the corners', () => {
    for (const time of times) {
      const points = motion.points(time)
      expect(at(points, 0)).toEqual({ x: 0, y: 0 })
      expect(at(points, columns - 1)).toEqual({ x: 1, y: 0 })
      expect(at(points, (rows - 1) * columns)).toEqual({ x: 0, y: 1 })
      expect(at(points, rows * columns - 1)).toEqual({ x: 1, y: 1 })
    }
  })

  it('slides edge points only along their edge', () => {
    for (const time of times) {
      const points = motion.points(time)
      for (let column = 1; column < columns - 1; column += 1) {
        expect(at(points, column).y).toBe(0)
        expect(at(points, (rows - 1) * columns + column).y).toBe(1)
      }
      for (let row = 1; row < rows - 1; row += 1) {
        expect(at(points, row * columns).x).toBe(0)
        expect(at(points, row * columns + columns - 1).x).toBe(1)
      }
    }
  })

  it('keeps every point within its wander of home, so neighbours never cross', () => {
    let moved = 0
    for (const time of times) {
      const points = motion.points(time)
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const { x, y } = at(points, row * columns + column)
          const dx = Math.abs(x - column / (columns - 1)) * (columns - 1)
          const dy = Math.abs(y - row / (rows - 1)) * (rows - 1)
          expect(dx).toBeLessThanOrEqual(0.45 + 1e-6)
          expect(dy).toBeLessThanOrEqual(0.45 + 1e-6)
          moved = Math.max(moved, dx, dy)
          if (column > 0) expect(x).toBeGreaterThan(at(points, row * columns + column - 1).x)
          if (row > 0) expect(y).toBeGreaterThan(at(points, (row - 1) * columns + column).y)
        }
      }
    }
    expect(moved).toBeGreaterThan(0.3)
  })

  it('drifts slowly and smoothly', () => {
    let previous = motion.points(0)
    for (let frame = 1; frame < 600; frame += 1) {
      const points = motion.points(frame / 60)
      for (let index = 0; index < points.length; index += 1) {
        expect(Math.abs((points[index] ?? 0) - (previous[index] ?? 0))).toBeLessThan(0.004)
      }
      previous = points
    }
  })

  it('holds still with no wander', () => {
    const still = new MeshMotion(3, 3, 0)
    expect([...still.points(0)]).toEqual([...still.points(17)])
  })
})

describe('tessellateMesh', () => {
  it('cuts the mesh about as finely whatever the grid', () => {
    for (const [columns, rows] of [[2, 2], [3, 3], [6, 4], [8, 8]] as const) {
      const mesh = tessellateMesh(columns, rows, 48)
      expect(mesh.vertexColumns).toBeGreaterThanOrEqual(49)
      expect(mesh.vertexColumns).toBeLessThanOrEqual(57)
      expect(mesh.indices.length).toBe((mesh.vertexColumns - 1) * (mesh.vertexRows - 1) * 6)
    }
  })

  it('weighs each vertex’s points to a total of one', () => {
    const mesh = tessellateMesh(4, 3, 24)
    for (let vertex = 0; vertex < mesh.vertexColumns * mesh.vertexRows; vertex += 1) {
      let sum = 0
      for (let slot = 0; slot < 16; slot += 1) sum += mesh.weights[vertex * 16 + slot] ?? 0
      expect(sum).toBeCloseTo(1, 5)
    }
  })

  it('lays the vertices on an even grid when the points are at home', () => {
    const mesh = tessellateMesh(3, 3, 12)
    const positions = meshPositions(mesh, new MeshMotion(3, 3, 0).points(0))
    for (let vy = 0; vy < mesh.vertexRows; vy += 1) {
      for (let vx = 0; vx < mesh.vertexColumns; vx += 1) {
        const { x, y } = at(positions, vy * mesh.vertexColumns + vx)
        expect(x).toBeCloseTo(vx / (mesh.vertexColumns - 1), 5)
        expect(y).toBeCloseTo(vy / (mesh.vertexRows - 1), 5)
      }
    }
  })

  it('passes through every point', () => {
    const mesh = tessellateMesh(3, 3, 12)
    const points = new MeshMotion(3, 3, 0.3).points(4)
    const positions = meshPositions(mesh, points)
    const step = (mesh.vertexColumns - 1) / 2
    const centre = at(positions, step * mesh.vertexColumns + step)
    expect(centre.x).toBeCloseTo(at(points, 4).x, 5)
    expect(centre.y).toBeCloseTo(at(points, 4).y, 5)
  })

  it('covers the whole rectangle without folding at the default wander', () => {
    // Counted and checked once at the end: an expect per triangle is a million
    // of them, which is slower than the geometry by far.
    let offEdge = 0
    let folded = 0
    let checked = 0
    for (const [columns, rows] of [[3, 3], [4, 4], [6, 3]] as const) {
      const mesh = tessellateMesh(columns, rows, 48)
      const motion = new MeshMotion(columns, rows, MESH_DEFAULTS.wander, 5)
      for (let time = 0; time < 120; time += 1.7) {
        const positions = meshPositions(mesh, motion.points(time))
        for (let vy = 0; vy < mesh.vertexRows; vy += 1) {
          if (Math.abs(at(positions, vy * mesh.vertexColumns).x) > 1e-6) offEdge += 1
          if (Math.abs(at(positions, vy * mesh.vertexColumns + mesh.vertexColumns - 1).x - 1) > 1e-6) offEdge += 1
        }
        // Every triangle keeps the winding it has at rest.
        for (let index = 0; index < mesh.indices.length; index += 3) {
          const a = at(positions, mesh.indices[index] ?? 0)
          const b = at(positions, mesh.indices[index + 1] ?? 0)
          const c = at(positions, mesh.indices[index + 2] ?? 0)
          if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) >= 0) folded += 1
          checked += 1
        }
      }
    }
    expect(checked).toBeGreaterThan(500_000)
    expect(offEdge).toBe(0)
    expect(folded).toBe(0)
  })
})

describe('meshColors', () => {
  it('is one colour everywhere for a grid of one colour', () => {
    const mesh = tessellateMesh(3, 3, 12)
    const colors = meshColors(mesh, meshColorGrid([BLUE], 3, 3))
    for (let index = 0; index < colors.length; index += 3) {
      expect(colors[index]).toBeCloseTo(0, 3)
      expect(colors[index + 1]).toBeCloseTo(0, 3)
      expect(colors[index + 2]).toBeCloseTo(1, 3)
    }
  })

  it('hits each point’s own colour at the point', () => {
    const mesh = tessellateMesh(2, 2, 8)
    const colors = meshColors(mesh, [RED, GREEN, BLUE, RED])
    const corner = (vx: number, vy: number) => [...colors.slice((vy * mesh.vertexColumns + vx) * 3, (vy * mesh.vertexColumns + vx) * 3 + 3)]
    expect(corner(0, 0).map((channel) => Math.round(channel * 100) / 100)).toEqual([1, 0, 0])
    expect(corner(mesh.vertexColumns - 1, 0).map((channel) => Math.round(channel * 100) / 100)).toEqual([0, 1, 0])
    expect(corner(0, mesh.vertexRows - 1).map((channel) => Math.round(channel * 100) / 100)).toEqual([0, 0, 1])
  })
})

describe('rasterizeMesh', () => {
  it('fills every pixel, with no gaps between the triangles', () => {
    const mesh = tessellateMesh(4, 3, 24)
    const colors = meshColors(mesh, meshColorGrid([RED, GREEN, BLUE], 4, 3))
    const positions = meshPositions(mesh, new MeshMotion(4, 3, 0.4, 9).points(13))
    const width = 97
    const height = 61
    const pixels = new Uint8ClampedArray(width * height * 4)
    rasterizeMesh(mesh, positions, colors, width, height, pixels)
    for (let index = 3; index < pixels.length; index += 4) expect(pixels[index]).toBe(255)
  })

  it('blends from one side to the other', () => {
    const mesh = tessellateMesh(2, 2, 8)
    const colors = meshColors(mesh, [RED, BLUE, RED, BLUE])
    const positions = meshPositions(mesh, new MeshMotion(2, 2, 0).points(0))
    const width = 40
    const height = 4
    const pixels = new Uint8ClampedArray(width * height * 4)
    rasterizeMesh(mesh, positions, colors, width, height, pixels)
    const blue = Array.from({ length: width }, (_, x) => pixels[(width + x) * 4 + 2] ?? 0)
    expect(blue[0]).toBeLessThan(20)
    expect(blue.at(-1)).toBeGreaterThan(235)
    for (let x = 1; x < width; x += 1) expect(blue[x]).toBeGreaterThanOrEqual((blue[x - 1] ?? 0) - 1)
  })
})

describe('meshFallbackCss', () => {
  it('lays a pool of each colour where its point sits', () => {
    const css = meshFallbackCss(['red', '#00f', 'var(--lq-accent)', 'green'], 2, 2)
    expect(css).toContain('at 0% 0%, red')
    expect(css).toContain('at 100% 0%, #00f')
    expect(css).toContain('at 0% 100%, var(--lq-accent)')
    expect(css).toContain('at 100% 100%, green')
    expect(meshFallbackCss([], 2, 2)).toBe('none')
  })
})
