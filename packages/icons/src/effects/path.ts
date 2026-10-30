/**
 * Path geometry for the icon effects, with no DOM: reading `d`, spelling every
 * shape as path commands, cutting a path into its subpaths, measuring them and
 * blending one into another.
 *
 * Everything here works in absolute coordinates with only five commands. H and
 * V are lines, S and T are written out as C and Q, and relative commands are
 * resolved, so two strokes that look the same compare equal however they were
 * written, and two with the same commands can be blended number by number.
 */

/** One drawing command in absolute coordinates. An arc's values are rx, ry, rotation, large-arc, sweep, x, y. */
export type PathCommand = { type: 'A' | 'C' | 'L' | 'M' | 'Q' | 'Z'; values: number[] }

/** A run of commands from one M to the next, the unit a stroke is drawn in. */
export type Subpath = PathCommand[]

const ARGUMENTS: Record<string, number> = { A: 7, C: 6, H: 1, L: 2, M: 2, Q: 4, S: 4, T: 2, V: 1, Z: 0 }

/**
 * The commands and numbers in `d`, as written. Arc flags are read one
 * character at a time, so the packed form a minifier writes (`a1 1 0 017 0`)
 * reads the same as the spaced one. Reading stops at the first thing that is
 * not path data, keeping what came before, which is what browsers render.
 */
const tokenize = (d: string): { type: string; values: number[] }[] => {
  const commands: { type: string; values: number[] }[] = []
  const number = /^[\s,]*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/
  const flag = /^[\s,]*([01])/
  let rest = d
  let type = ''

  while (true) {
    rest = rest.replace(/^[\s,]+/, '')
    if (rest === '') break
    const letter = /^[AaCcHhLlMmQqSsTtVvZz]/.exec(rest)
    if (letter) {
      type = letter[0]
      rest = rest.slice(1)
      if (type === 'Z' || type === 'z') {
        commands.push({ type, values: [] })
        continue
      }
    } else if (type === '' || type === 'Z' || type === 'z') {
      break
    }

    const count = ARGUMENTS[type.toUpperCase()] ?? 0
    const values: number[] = []
    for (let index = 0; index < count; index += 1) {
      const isFlag = type.toUpperCase() === 'A' && (index === 3 || index === 4)
      const match = (isFlag ? flag : number).exec(rest)
      if (!match) return commands
      values.push(Number(match[1]))
      rest = rest.slice(match[0].length)
    }
    commands.push({ type, values })
    // Coordinates after a moveto are linetos of the same case.
    if (type === 'M') type = 'L'
    else if (type === 'm') type = 'l'
  }

  return commands
}

/**
 * `d` in absolute coordinates with only M, L, C, Q, A and Z. A command that
 * follows Z without a moveto starts its subpath where the last one did, so an
 * explicit M is put in for it.
 */
export const parsePath = (d: string): PathCommand[] => {
  const result: PathCommand[] = []
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let control: { x: number; y: number; type: 'C' | 'Q' } | undefined
  let closed = false

  for (const { type, values } of tokenize(d)) {
    const upper = type.toUpperCase()
    const relative = type !== upper && result.length > 0
    const ox = relative ? x : 0
    const oy = relative ? y : 0

    if (closed && upper !== 'M') result.push({ type: 'M', values: [x, y] })
    closed = false

    switch (upper) {
      case 'M': {
        x = ox + (values[0] ?? 0)
        y = oy + (values[1] ?? 0)
        startX = x
        startY = y
        result.push({ type: 'M', values: [x, y] })
        control = undefined
        break
      }
      case 'L':
      case 'H':
      case 'V': {
        if (upper === 'H') x = (relative ? x : 0) + (values[0] ?? 0)
        else if (upper === 'V') y = (relative ? y : 0) + (values[0] ?? 0)
        else {
          x = ox + (values[0] ?? 0)
          y = oy + (values[1] ?? 0)
        }
        result.push({ type: 'L', values: [x, y] })
        control = undefined
        break
      }
      case 'C':
      case 'S': {
        const [a = 0, b = 0, c = 0, e = 0, f = 0, g = 0] = values
        const reflected = control?.type === 'C' ? { x: 2 * x - control.x, y: 2 * y - control.y } : { x, y }
        const x1 = upper === 'C' ? ox + a : reflected.x
        const y1 = upper === 'C' ? oy + b : reflected.y
        const x2 = upper === 'C' ? ox + c : ox + a
        const y2 = upper === 'C' ? oy + e : oy + b
        x = upper === 'C' ? ox + f : ox + c
        y = upper === 'C' ? oy + g : oy + e
        result.push({ type: 'C', values: [x1, y1, x2, y2, x, y] })
        control = { type: 'C', x: x2, y: y2 }
        break
      }
      case 'Q':
      case 'T': {
        const [a = 0, b = 0, c = 0, e = 0] = values
        const reflected = control?.type === 'Q' ? { x: 2 * x - control.x, y: 2 * y - control.y } : { x, y }
        const x1 = upper === 'Q' ? ox + a : reflected.x
        const y1 = upper === 'Q' ? oy + b : reflected.y
        x = upper === 'Q' ? ox + c : ox + a
        y = upper === 'Q' ? oy + e : oy + b
        result.push({ type: 'Q', values: [x1, y1, x, y] })
        control = { type: 'Q', x: x1, y: y1 }
        break
      }
      case 'A': {
        const [rx = 0, ry = 0, rotation = 0, large = 0, sweep = 0, ex = 0, ey = 0] = values
        x = ox + ex
        y = oy + ey
        result.push({ type: 'A', values: [rx, ry, rotation, large, sweep, x, y] })
        control = undefined
        break
      }
      case 'Z': {
        result.push({ type: 'Z', values: [] })
        x = startX
        y = startY
        control = undefined
        closed = true
        break
      }
    }
  }

  return result
}

/** The commands cut at every M. Anything before the first M has nowhere to start and is dropped. */
export const splitSubpaths = (commands: readonly PathCommand[]): Subpath[] => {
  const subpaths: Subpath[] = []
  for (const command of commands) {
    if (command.type === 'M') subpaths.push([command])
    else subpaths.at(-1)?.push(command)
  }
  // A lone M draws nothing, and nothing would be seen being drawn.
  return subpaths.filter((subpath) => subpath.length > 1)
}

const format = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

/** Commands back to a `d` string, rounded to a thousandth of a unit. */
export const serializePath = (commands: readonly PathCommand[]): string =>
  commands.map(({ type, values }) => `${type}${values.map(format).join(' ')}`).join('')

/** The attributes a shape is drawn from, by name. Missing ones read as 0. */
export type ShapeAttributes = Readonly<Record<string, string | null | undefined>>

const read = (attributes: ShapeAttributes, name: string): number => {
  const value = Number.parseFloat(attributes[name] ?? '')
  return Number.isFinite(value) ? value : 0
}

const pointsOf = (list: string): number[][] => {
  const numbers = (list.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number)
  const points: number[][] = []
  for (let index = 0; index + 1 < numbers.length; index += 2) points.push([numbers[index]!, numbers[index + 1]!])
  return points
}

/**
 * A shape element spelled as path commands, starting where a browser starts
 * dashing it and running the same way: a circle or ellipse from three o'clock
 * clockwise, a rectangle from the end of its top-left corner. Unknown elements
 * come back empty.
 */
export const shapeCommands = (tag: string, attributes: ShapeAttributes): PathCommand[] => {
  switch (tag.toLowerCase()) {
    case 'path':
      return parsePath(attributes.d ?? '')
    case 'line':
      return [
        { type: 'M', values: [read(attributes, 'x1'), read(attributes, 'y1')] },
        { type: 'L', values: [read(attributes, 'x2'), read(attributes, 'y2')] },
      ]
    case 'polyline':
    case 'polygon': {
      const points = pointsOf(attributes.points ?? '')
      if (points.length < 2) return []
      const commands: PathCommand[] = points.map((point, index) => ({ type: index === 0 ? 'M' : 'L', values: point }))
      if (tag.toLowerCase() === 'polygon') commands.push({ type: 'Z', values: [] })
      return commands
    }
    case 'circle':
    case 'ellipse': {
      const cx = read(attributes, 'cx')
      const cy = read(attributes, 'cy')
      const rx = tag.toLowerCase() === 'circle' ? read(attributes, 'r') : read(attributes, 'rx')
      const ry = tag.toLowerCase() === 'circle' ? rx : read(attributes, 'ry')
      if (rx <= 0 || ry <= 0) return []
      const arc = (x: number, y: number): PathCommand => ({ type: 'A', values: [rx, ry, 0, 0, 1, x, y] })
      return [
        { type: 'M', values: [cx + rx, cy] },
        arc(cx, cy + ry),
        arc(cx - rx, cy),
        arc(cx, cy - ry),
        arc(cx + rx, cy),
        { type: 'Z', values: [] },
      ]
    }
    case 'rect': {
      const x = read(attributes, 'x')
      const y = read(attributes, 'y')
      const width = read(attributes, 'width')
      const height = read(attributes, 'height')
      if (width <= 0 || height <= 0) return []
      // One corner radius given stands for both, and neither may pass half the side.
      const givenX = attributes.rx != null && attributes.rx !== 'auto'
      const givenY = attributes.ry != null && attributes.ry !== 'auto'
      let rx = givenX ? read(attributes, 'rx') : givenY ? read(attributes, 'ry') : 0
      let ry = givenY ? read(attributes, 'ry') : rx
      rx = Math.min(Math.max(rx, 0), width / 2)
      ry = Math.min(Math.max(ry, 0), height / 2)
      if (rx === 0 || ry === 0) {
        return [
          { type: 'M', values: [x, y] },
          { type: 'L', values: [x + width, y] },
          { type: 'L', values: [x + width, y + height] },
          { type: 'L', values: [x, y + height] },
          { type: 'Z', values: [] },
        ]
      }
      const arc = (ex: number, ey: number): PathCommand => ({ type: 'A', values: [rx, ry, 0, 0, 1, ex, ey] })
      return [
        { type: 'M', values: [x + rx, y] },
        { type: 'L', values: [x + width - rx, y] },
        arc(x + width, y + ry),
        { type: 'L', values: [x + width, y + height - ry] },
        arc(x + width - rx, y + height),
        { type: 'L', values: [x + rx, y + height] },
        arc(x, y + height - ry),
        { type: 'L', values: [x, y + ry] },
        arc(x + rx, y),
        { type: 'Z', values: [] },
      ]
    }
    default:
      return []
  }
}

const distance = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay)

/** Length of a curve given as a point at t, by summing a polyline through `steps` points on it. */
const curveLength = (at: (t: number) => readonly [number, number], steps: number): number => {
  let total = 0
  let [px, py] = at(0)
  for (let step = 1; step <= steps; step += 1) {
    const [qx, qy] = at(step / steps)
    total += distance(px, py, qx, qy)
    px = qx
    py = qy
  }
  return total
}

/**
 * An arc's length, from its endpoint form (SVG 2, appendix B.2.4): radii too
 * small to span the chord are grown until they do, and a circular arc is
 * measured exactly, an elliptical one along a fine polyline.
 */
const arcLength = (x0: number, y0: number, values: readonly number[]): number => {
  const [rxIn = 0, ryIn = 0, rotation = 0, large = 0, sweep = 0, x = 0, y = 0] = values
  if (x0 === x && y0 === y) return 0
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  if (rx === 0 || ry === 0) return distance(x0, y0, x, y)

  const phi = (rotation * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x0 - x) / 2
  const dy = (y0 - y) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }

  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const sign = large === sweep ? -1 : 1
  const factor = sign * Math.sqrt(Math.max(0, numerator / denominator))
  const cx1 = (factor * rx * y1) / ry
  const cy1 = (-factor * ry * x1) / rx

  const angle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const theta = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
  if (sweep === 0 && delta > 0) delta -= 2 * Math.PI
  if (sweep === 1 && delta < 0) delta += 2 * Math.PI

  if (Math.abs(rx - ry) < 1e-9) return rx * Math.abs(delta)

  const cx = cos * cx1 - sin * cy1 + (x0 + x) / 2
  const cy = sin * cx1 + cos * cy1 + (y0 + y) / 2
  return curveLength((t) => {
    const a = theta + delta * t
    return [cx + rx * Math.cos(a) * cos - ry * Math.sin(a) * sin, cy + rx * Math.cos(a) * sin + ry * Math.sin(a) * cos]
  }, 64)
}

/**
 * How long the stroke along `commands` is, in user units: exact for lines and
 * circular arcs, to well under a percent for curves. What a browser's
 * `getTotalLength()` returns, for where there is no browser to ask.
 */
export const pathLength = (commands: readonly PathCommand[]): number => {
  let total = 0
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  for (const { type, values } of commands) {
    switch (type) {
      case 'M':
        x = values[0]!
        y = values[1]!
        startX = x
        startY = y
        break
      case 'L':
        total += distance(x, y, values[0]!, values[1]!)
        x = values[0]!
        y = values[1]!
        break
      case 'C': {
        const [x1, y1, x2, y2, ex, ey] = values as [number, number, number, number, number, number]
        const x0 = x
        const y0 = y
        total += curveLength((t) => {
          const u = 1 - t
          return [
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey,
          ]
        }, 48)
        x = ex
        y = ey
        break
      }
      case 'Q': {
        const [x1, y1, ex, ey] = values as [number, number, number, number]
        const x0 = x
        const y0 = y
        total += curveLength((t) => {
          const u = 1 - t
          return [u * u * x0 + 2 * u * t * x1 + t * t * ex, u * u * y0 + 2 * u * t * y1 + t * t * ey]
        }, 32)
        x = ex
        y = ey
        break
      }
      case 'A':
        total += arcLength(x, y, values)
        x = values[5]!
        y = values[6]!
        break
      case 'Z':
        total += distance(x, y, startX, startY)
        x = startX
        y = startY
        break
    }
  }

  return total
}

/**
 * What has to match for two subpaths to blend: the same commands in the same
 * order, and for arcs the same flags, which pick one of four arcs and have no
 * value in between.
 */
export const pathSignature = (subpath: readonly PathCommand[]): string =>
  subpath.map(({ type, values }) => (type === 'A' ? `A${values[3]}${values[4]}` : type)).join('')

/**
 * The subpath `progress` of the way from `from` to `to`, which share a
 * signature. Progress past 1 carries on past `to`, which is how a spring that
 * overshoots shows on a shape. Arc radii stay at zero or above.
 */
export const blendPath = (from: readonly PathCommand[], to: readonly PathCommand[], progress: number): PathCommand[] =>
  to.map((command, index) => {
    const source = from[index]
    if (!source) return command
    return {
      type: command.type,
      values: command.values.map((value, position) => {
        const start = source.values[position] ?? value
        if (command.type === 'A' && (position === 3 || position === 4)) return value
        const blended = start + (value - start) * progress
        return command.type === 'A' && position < 2 ? Math.max(0, blended) : blended
      }),
    }
  })

/** How far apart two subpaths with the same signature are: the sum of how far each number moves. */
export const pathDistance = (from: readonly PathCommand[], to: readonly PathCommand[]): number => {
  let total = 0
  to.forEach((command, index) => {
    command.values.forEach((value, position) => {
      if (command.type === 'A' && (position === 3 || position === 4)) return
      total += Math.abs(value - (from[index]?.values[position] ?? value))
    })
  })
  return total
}
