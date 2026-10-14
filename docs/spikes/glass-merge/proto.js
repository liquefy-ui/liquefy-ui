// Glass-merge spike: several ways of drawing glass shapes that melt into one
// another when they are close, all on the same deterministic scene so their
// frame cost and their neck can be compared. See ../glass-merge.md.
//
//   ?mode=separate   one lensed glass element per shape (today's DropletMenu)
//   ?mode=clip       A   one sheet clipped by clip-path: path() from marching squares, blur only
//   ?mode=clipmap    A+B the same clip plus a per-frame displacement map from the smin SDF
//   ?mode=map        B   per-frame displacement map that also carries the mask, no clip-path
//   ?mode=goo        C   the whole lens built inside the SVG filter from per-shape feImages
//   ?mode=bridge     D   per-shape lensed glass plus a WebGL neck painted on top
//   ?mode=bridgeclip D   per-shape lensed glass plus a blur-only neck sheet clipped to the neck
//   ?mode=bridgegoo  D   per-shape lensed glass plus the goo lens cut down to the neck
//
// Other parameters: n (shapes), w/h (container), scene=orbit|menu|pair, gap
// (pair only), spacing, bezel, mapScale, grid (marching-squares step), enc=blob,
// fit=1 (shrink the sheet to the shapes), rim=0, nogl=1, bg=grid, outline=1,
// t=<seconds> to freeze one frame, and for goo: beta, e, passes,
// sprites=live|ref. The letters are the approaches in the write-up.

const SVG_NS = 'http://www.w3.org/2000/svg'
const params = new URLSearchParams(location.search)
const num = (name, fallback) => (params.has(name) ? Number(params.get(name)) : fallback)

const MODE = params.get('mode') ?? 'goo'
const N = num('n', 5)
const W = num('w', 800)
const H = num('h', 500)
const SCENE = params.get('scene') ?? 'orbit'
const SPACING = num('spacing', 24) // largest gap that still bridges, in px
const BEZEL = num('bezel', 14)
const CURVE = 2
const MAP_SCALE = num('mapScale', 0.5)
const GRID = num('grid', 4)
const FIT = params.get('fit') === '1'
const RIM = params.get('rim') !== '0'
const ENC = params.get('enc') ?? 'png'
const FROZEN = params.has('t') ? Number(params.get('t')) : null
const OUTLINE = params.get('outline') === '1'
const GL_OFF = params.get('nogl') === '1'
// `sprites=ref` feeds the goo filter live SVG shapes through feImage
// href="#id" instead of static data-URL sprites, so a shape can rotate or
// change aspect without a new image.
const SPRITE_REFS = params.get('sprites') === 'ref'
// `sprites=live` rebuilds every sprite each frame as a stretched, rotated
// shape — what DropletMenu's stretch along the direction of travel needs.
const SPRITE_LIVE = params.get('sprites') === 'live'
if (params.get('bg') === 'grid') document.body.classList.add('grid')

// Same budget as packages/core/src/lens.ts: the rim may squeeze the backdrop by
// at most 0.88 so the mapping never folds.
const MAX_DISPLACEMENT = (BEZEL * 0.88) / CURVE
const DISPLACEMENT_SCALE = MAX_DISPLACEMENT * 2
// Quadratic smin merges two edges once they are closer than k / 2.
const K = SPACING * 2

const stage = document.getElementById('stage')
stage.style.width = `${W}px`
stage.style.height = `${H}px`
const defs = document.querySelector('#defs defs')
const hud = document.getElementById('hud')

// ---------------------------------------------------------------- scene ---

const shapes = []
const makeShape = (hw, hh, r) => ({ hh, hw, r, x: 0, y: 0 })

if (SCENE === 'menu') {
  shapes.push(makeShape(28, 28, 28))
  for (let i = 0; i < N - 1; i += 1) shapes.push(makeShape(23, 23, 23))
} else if (SCENE === 'pair') {
  shapes.push(makeShape(32, 32, 32), makeShape(32, 32, 32))
} else {
  for (let i = 0; i < N; i += 1) {
    const pill = N >= 5 && i % 4 === 3
    shapes.push(pill ? makeShape(60, 24, 24) : makeShape(32, 32, 32))
  }
}

const place = (t) => {
  const cx = W / 2
  const cy = H / 2
  if (SCENE === 'menu') {
    shapes[0].x = cx
    shapes[0].y = cy
    const count = shapes.length - 1
    shapes.slice(1).forEach((shape, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2
      const out = 0.5 - 0.5 * Math.cos(t * 1.6 - i * 0.45)
      const distance = 30 + 72 * out
      shape.x = cx + Math.cos(angle) * distance
      shape.y = cy + Math.sin(angle) * distance
    })
    return
  }
  if (SCENE === 'pair') {
    const gap = num('gap', 12)
    shapes[0].x = cx - 32 - gap / 2
    shapes[1].x = cx + 32 + gap / 2
    shapes[0].y = shapes[1].y = cy
    return
  }
  shapes.forEach((shape, i) => {
    const ax = (0.18 + 0.17 * (((i * 7) % 5) / 4)) * W
    const ay = (0.16 + 0.16 * (((i * 3) % 4) / 3)) * H
    const wx = 0.5 + 0.23 * ((i * 5) % 3)
    const wy = 0.4 + 0.19 * ((i * 11) % 4)
    shape.x = cx + ax * Math.sin(wx * t + i * 1.7)
    shape.y = cy + ay * Math.sin(wy * t + i * 2.3 + 0.6)
  })
}

// ------------------------------------------------------------ the field ---

const sdRoundRect = (px, py, s) => {
  const qx = Math.abs(px - s.x) - s.hw + s.r
  const qy = Math.abs(py - s.y) - s.hh + s.r
  const ox = qx > 0 ? qx : 0
  const oy = qy > 0 ? qy : 0
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - s.r
}

const smin = (a, b) => {
  const h = Math.max(K - Math.abs(a - b), 0) / K
  return Math.min(a, b) - h * h * K * 0.25
}

const fieldAt = (px, py) => {
  let d = sdRoundRect(px, py, shapes[0])
  for (let i = 1; i < shapes.length; i += 1) d = smin(d, sdRoundRect(px, py, shapes[i]))
  return d
}

// Inside the smooth union but outside every shape: the neck alone, pushed
// 2px into the shapes so the sheet tucks under their rims.
const neckAt = (px, py) => {
  let union = sdRoundRect(px, py, shapes[0])
  let hard = union
  for (let i = 1; i < shapes.length; i += 1) {
    const d = sdRoundRect(px, py, shapes[i])
    union = smin(union, d)
    hard = Math.min(hard, d)
  }
  return Math.max(union, -(hard + 2))
}

const bounds = (pad) => {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const s of shapes) {
    x0 = Math.min(x0, s.x - s.hw)
    y0 = Math.min(y0, s.y - s.hh)
    x1 = Math.max(x1, s.x + s.hw)
    y1 = Math.max(y1, s.y + s.hh)
  }
  x0 = Math.max(0, Math.floor(x0 - pad))
  y0 = Math.max(0, Math.floor(y0 - pad))
  x1 = Math.min(W, Math.ceil(x1 + pad))
  y1 = Math.min(H, Math.ceil(y1 + pad))
  return { h: y1 - y0, w: x1 - x0, x: x0, y: y0 }
}

// ------------------------------------------------------ marching squares ---

// Builds an evenodd path for {field < 0} over the box, sampling every `step`
// px. Edge points are keyed by the grid edge they sit on, so every point is
// shared by exactly two segments and the loops can be walked without
// worrying about orientation; evenodd takes care of holes.
const contourPath = (box, step, sample) => {
  const cols = Math.ceil(box.w / step) + 2
  const rows = Math.ceil(box.h / step) + 2
  const ox = box.x - step
  const oy = box.y - step
  const stride = cols + 1
  const values = new Float32Array(stride * (rows + 1))
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= cols; i += 1) {
      // The outer ring is forced outside so every contour closes.
      values[j * stride + i] = i === 0 || j === 0 || i === cols || j === rows
        ? 1
        : sample(ox + i * step, oy + j * step)
    }
  }

  const px = []
  const py = []
  const keyToPoint = new Map()
  const links = new Map()
  const point = (key, x, y) => {
    let index = keyToPoint.get(key)
    if (index === undefined) {
      index = px.length
      px.push(x)
      py.push(y)
      keyToPoint.set(key, index)
    }
    return index
  }
  const link = (a, b) => {
    const la = links.get(a)
    if (la) la.push(b)
    else links.set(a, [b])
    const lb = links.get(b)
    if (lb) lb.push(a)
    else links.set(b, [a])
  }

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const v0 = values[j * stride + i]
      const v1 = values[j * stride + i + 1]
      const v2 = values[(j + 1) * stride + i + 1]
      const v3 = values[(j + 1) * stride + i]
      const index = (v0 < 0 ? 8 : 0) | (v1 < 0 ? 4 : 0) | (v2 < 0 ? 2 : 0) | (v3 < 0 ? 1 : 0)
      if (index === 0 || index === 15) continue

      const x = ox + i * step
      const y = oy + j * step
      const edge = (e) => {
        if (e === 0) return point((j * stride + i) * 2, x + step * (v0 / (v0 - v1)), y)
        if (e === 1) return point((j * stride + i + 1) * 2 + 1, x + step, y + step * (v1 / (v1 - v2)))
        if (e === 2) return point(((j + 1) * stride + i) * 2, x + step * (v3 / (v3 - v2)), y + step)
        return point((j * stride + i) * 2 + 1, x, y + step * (v0 / (v0 - v3)))
      }
      const seg = (a, b) => link(edge(a), edge(b))
      switch (index) {
        case 1: case 14: seg(3, 2); break
        case 2: case 13: seg(2, 1); break
        case 3: case 12: seg(3, 1); break
        case 4: case 11: seg(0, 1); break
        case 6: case 9: seg(0, 2); break
        case 7: case 8: seg(3, 0); break
        case 5: case 10: {
          const centre = (v0 + v1 + v2 + v3) / 4 < 0
          const cutTopLeft = (index === 5) === centre
          if (cutTopLeft) { seg(3, 0); seg(1, 2) } else { seg(0, 1); seg(3, 2) }
          break
        }
        default: break
      }
    }
  }

  const visited = new Uint8Array(px.length)
  let d = ''
  for (let start = 0; start < px.length; start += 1) {
    if (visited[start]) continue
    let previous = -1
    let current = start
    d += `M${px[current].toFixed(1)} ${py[current].toFixed(1)}`
    visited[current] = 1
    for (;;) {
      const next = links.get(current)
      const candidate = next[0] !== previous ? next[0] : next[1]
      if (candidate === undefined || visited[candidate]) break
      d += `L${px[candidate].toFixed(1)} ${py[candidate].toFixed(1)}`
      visited[candidate] = 1
      previous = current
      current = candidate
    }
    d += 'Z'
  }
  return d
}

// --------------------------------------------------------------- WebGL ---

const FIELD_GLSL = `
uniform vec4 u_shapes[16];
uniform float u_radii[16];
uniform int u_count;
uniform float u_k;

float sdRoundRect(vec2 p, vec4 s, float r) {
  vec2 q = abs(p - s.xy) - s.zw + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float smin(float a, float b) {
  float h = max(u_k - abs(a - b), 0.0) / u_k;
  return min(a, b) - h * h * u_k * 0.25;
}

float field(vec2 p) {
  float d = sdRoundRect(p, u_shapes[0], u_radii[0]);
  for (int i = 1; i < 16; i++) {
    if (i >= u_count) break;
    d = smin(d, sdRoundRect(p, u_shapes[i], u_radii[i]));
  }
  return d;
}

float hardField(vec2 p) {
  float d = sdRoundRect(p, u_shapes[0], u_radii[0]);
  for (int i = 1; i < 16; i++) {
    if (i >= u_count) break;
    d = min(d, sdRoundRect(p, u_shapes[i], u_radii[i]));
  }
  return d;
}

vec2 outwardNormal(vec2 p) {
  vec2 g = vec2(field(p + vec2(1.0, 0.0)) - field(p - vec2(1.0, 0.0)),
                field(p + vec2(0.0, 1.0)) - field(p - vec2(0.0, 1.0)));
  return g / max(length(g), 0.0001);
}
`

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

// u_origin is the stage position of the canvas' top-left pixel and u_scale
// canvas pixels per CSS pixel, so one shader serves full-size, fitted and
// downscaled canvases alike.
const PREAMBLE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_origin;
uniform vec2 u_resolution;
uniform float u_scale;
vec2 stagePoint() {
  return u_origin + vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_scale;
}
${FIELD_GLSL}
`

// Displacement exactly as packages/core/src/lens.ts builds it for one rounded
// rect, but cut from the smooth union: R/G carry the bend, B the inside mask.
const MAP_FRAGMENT = `${PREAMBLE}
uniform float u_bezel;
uniform float u_curve;
void main() {
  vec2 p = stagePoint();
  float d = field(p);
  float mask = smoothstep(0.75, -0.75, d);
  if (d > 0.0) { outColor = vec4(0.5, 0.5, mask, 1.0); return; }
  float t = clamp(1.0 + d / u_bezel, 0.0, 1.0);
  vec2 displacement = -outwardNormal(p) * pow(t, u_curve);
  outColor = vec4(displacement * 0.5 + 0.5, mask, 1.0);
}
`

// The lit rim of packages/core/src/renderer.ts, reduced to what reads at rest:
// a bright band on the edges facing up, a faint one elsewhere.
const RIM_FRAGMENT = `${PREAMBLE}
void main() {
  vec2 p = stagePoint();
  float d = field(p);
  float inside = smoothstep(0.9, -0.9, d);
  float edge = -d;
  float rim = exp(-pow(max(edge - 0.6, 0.0) / 2.6, 1.5));
  float bezel = smoothstep(12.0, 0.0, edge) * (1.0 - rim);
  vec2 n = outwardNormal(p);
  float facing = clamp(0.35 - 0.65 * n.y - 0.25 * n.x, 0.12, 1.0);
  vec3 color = vec3(0.98, 0.99, 1.0) * (rim * facing * 0.85 + bezel * 0.035);
  color *= inside;
  outColor = vec4(color, clamp(max(color.r, max(color.g, color.b)), 0.0, 0.85));
}
`

// Only the neck: inside the smooth union, outside every shape.
const NECK_FRAGMENT = `${PREAMBLE}
void main() {
  vec2 p = stagePoint();
  float d = field(p);
  float hard = hardField(p);
  float neck = smoothstep(0.9, -0.9, d) * smoothstep(-1.5, 1.5, hard);
  float rim = exp(-pow(max(-d - 0.6, 0.0) / 2.6, 1.5));
  vec2 n = outwardNormal(p);
  float facing = clamp(0.35 - 0.65 * n.y, 0.12, 1.0);
  float alpha = neck * clamp(0.16 + rim * facing * 0.8, 0.0, 0.85);
  outColor = vec4(vec3(alpha), alpha);
}
`

const createGl = (canvas, fragment, attributes) => {
  if (GL_OFF) return null
  const gl = canvas.getContext('webgl2', attributes)
  if (!gl) return null
  const compile = (type, source) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
    return shader
  }
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  const u = (name) => gl.getUniformLocation(program, name)
  const uniforms = {
    bezel: u('u_bezel'), count: u('u_count'), curve: u('u_curve'), k: u('u_k'), origin: u('u_origin'),
    radii: u('u_radii'), resolution: u('u_resolution'), scale: u('u_scale'), shapes: u('u_shapes'),
  }
  const shapeData = new Float32Array(64)
  const radiusData = new Float32Array(16)
  return {
    draw(origin, scale, list = shapes) {
      list.forEach((s, i) => {
        shapeData.set([s.x, s.y, s.hw, s.hh], i * 4)
        radiusData[i] = s.r
      })
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uniforms.origin, origin.x, origin.y)
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform1f(uniforms.scale, scale)
      gl.uniform4fv(uniforms.shapes, shapeData)
      gl.uniform1fv(uniforms.radii, radiusData)
      gl.uniform1i(uniforms.count, list.length)
      gl.uniform1f(uniforms.k, K)
      gl.uniform1f(uniforms.bezel, BEZEL)
      gl.uniform1f(uniforms.curve, CURVE)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    },
  }
}

// ---------------------------------------------------------- SVG filters ---

let filterCount = 0
const svg = (tag, attributes = {}, parent) => {
  const element = document.createElementNS(SVG_NS, tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
  parent?.appendChild(element)
  return element
}

const newFilter = (width, height) => svg('filter', {
  'color-interpolation-filters': 'sRGB',
  filterUnits: 'userSpaceOnUse',
  height,
  id: `gm-${(filterCount += 1)}`,
  primitiveUnits: 'userSpaceOnUse',
  width,
  x: 0,
  y: 0,
}, defs)

const resizeFilter = (filter, width, height) => {
  filter.setAttribute('width', width)
  filter.setAttribute('height', height)
}

// The lens of packages/core/src/lens-filter.ts: map in, bend, a touch of
// blur and saturation. `masked` also cuts the result to the B channel.
const mapFilter = (width, height, masked) => {
  const filter = newFilter(width, height)
  const image = svg('feImage', { height, preserveAspectRatio: 'none', result: 'map', width, x: 0, y: 0 }, filter)
  const displacement = svg('feDisplacementMap', {
    in: 'SourceGraphic', in2: 'map', result: 'bent', scale: DISPLACEMENT_SCALE,
    xChannelSelector: 'R', yChannelSelector: 'G',
  }, filter)
  svg('feGaussianBlur', { in: 'bent', result: 'soft', stdDeviation: 0.6 }, filter)
  svg('feColorMatrix', { in: 'soft', result: 'lens', type: 'saturate', values: 1.24 }, filter)
  if (masked) {
    svg('feColorMatrix', {
      in: 'map', result: 'mask', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0',
    }, filter)
    svg('feFlood', { 'flood-color': '#fff', 'flood-opacity': 0.06, result: 'veil' }, filter)
    svg('feComposite', { in: 'veil', in2: 'lens', operator: 'over', result: 'lit' }, filter)
    svg('feComposite', { in: 'lit', in2: 'mask', operator: 'in' }, filter)
  }
  return { displacement, filter, image }
}

// Circles and pills as vector sprites: positioned per frame by feImage x/y,
// which never reloads the image.
const sprite = (w, h, r) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  + `<rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`,
)}`

// Gaussian-blurring a disc and cutting at 0.5 shrinks it. Find how much to
// grow the sprite so a lone shape keeps its size.
const gooInflation = (radius, sigma) => {
  const blurredDiscAt = (discRadius, distance) => {
    let sum = 0
    let total = 0
    const reach = discRadius + sigma * 4
    for (let y = -reach; y <= reach; y += 0.5) {
      for (let x = -reach; x <= reach; x += 0.5) {
        const g = Math.exp(-((x - distance) ** 2 + y ** 2) / (2 * sigma * sigma))
        total += g
        if (x * x + y * y <= discRadius * discRadius) sum += g
      }
    }
    return sum / total
  }
  let low = radius
  let high = radius + sigma * 2
  for (let i = 0; i < 18; i += 1) {
    const mid = (low + high) / 2
    if (blurredDiscAt(mid, radius) < 0.5) low = mid
    else high = mid
  }
  return (low + high) / 2 - radius
}

// Everything in the filter: metaball the sprites into one mask, blur the mask
// into a height field, difference it into a displacement map, bend the
// backdrop with it and light its slope for the rim. No canvas, no encode.
const GOO_SIGMA = SPACING / 1.35
const GOO_BETA = num('beta', BEZEL / 2)
// `neckOnly` keeps just what lies outside every shape, for a layer under
// shapes that keep their own lenses.
const gooFilter = (width, height, neckOnly = false) => {
  const filter = newFilter(width, height)
  const images = shapes.map((s, i) => {
    const grow = gooInflation(s.r, GOO_SIGMA)
    const w = s.hw * 2 + grow * 2
    const h = s.hh * 2 + grow * 2
    if (SPRITE_REFS) {
      const live = svg('rect', { fill: '#fff', height: h, id: `${filter.id}-shape-${i}`, rx: s.r + grow, width: w }, defs)
      svg('feImage', { href: `#${live.id}`, result: `s${i}` }, filter)
      return { element: live, exact: null, grow }
    }
    return {
      element: svg('feImage', { height: h, href: sprite(w, h, s.r + grow), preserveAspectRatio: 'none', result: `s${i}`, width: w }, filter),
      exact: neckOnly
        ? svg('feImage', { height: s.hh * 2, href: sprite(s.hw * 2, s.hh * 2, s.r), preserveAspectRatio: 'none', result: `e${i}`, width: s.hw * 2 }, filter)
        : null,
      grow,
    }
  })
  const merge = svg('feMerge', { result: 'shapes' }, filter)
  shapes.forEach((_, i) => svg('feMergeNode', { in: `s${i}` }, merge))
  svg('feGaussianBlur', { in: 'shapes', result: 'potential', stdDeviation: GOO_SIGMA.toFixed(2) }, filter)
  const sharp = 24
  svg('feColorMatrix', {
    in: 'potential', result: 'mask', type: 'matrix',
    values: `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${sharp} ${-sharp * 0.5}`,
  }, filter)
  let cut = 'mask'
  if (neckOnly) {
    const hard = svg('feMerge', { result: 'hard' }, filter)
    shapes.forEach((_, i) => svg('feMergeNode', { in: `e${i}` }, hard))
    svg('feComposite', { in: 'mask', in2: 'hard', operator: 'out', result: 'neck' }, filter)
    cut = 'neck'
  }
  // Skia blurs anything above sigma 4 at a reduced scale and upsamples it
  // bilinearly, so differencing the field can stair-step the map. Several
  // passes at sigma <= 4 add up to the same bezel without that; at these
  // sizes the difference did not show, so one pass is the default.
  const passes = num('passes', 1)
  const each = GOO_BETA / Math.sqrt(passes)
  for (let i = 0; i < passes; i += 1) {
    svg('feGaussianBlur', {
      in: i === 0 ? 'mask' : `height${i}`, result: i === passes - 1 ? 'height' : `height${i + 1}`, stdDeviation: each.toFixed(3),
    }, filter)
  }

  // Central differences 2e apart, done on alpha so the arithmetic composite
  // cannot clamp the signal against a premultiplied colour, then moved into
  // R and G for feDisplacementMap. The gain puts the steepest slope near the
  // ends of the 0..1 range.
  const e = num('e', 2)
  const slope = 1 / (GOO_BETA * Math.sqrt(2 * Math.PI))
  const gain = 0.46 / (2 * e * slope)
  svg('feOffset', { dx: e, in: 'height', result: 'hxl' }, filter)
  svg('feOffset', { dx: -e, in: 'height', result: 'hxr' }, filter)
  svg('feOffset', { dy: e, in: 'height', result: 'hyu' }, filter)
  svg('feOffset', { dy: -e, in: 'height', result: 'hyd' }, filter)
  svg('feComposite', { in: 'hxr', in2: 'hxl', k1: 0, k2: gain, k3: -gain, k4: 0.5, operator: 'arithmetic', result: 'gxa' }, filter)
  svg('feComposite', { in: 'hyd', in2: 'hyu', k1: 0, k2: gain, k3: -gain, k4: 0.5, operator: 'arithmetic', result: 'gya' }, filter)
  svg('feColorMatrix', { in: 'gxa', result: 'gx', type: 'matrix', values: '0 0 0 1 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1' }, filter)
  svg('feColorMatrix', { in: 'gya', result: 'gy', type: 'matrix', values: '0 0 0 0 0  0 0 0 1 0  0 0 0 0 0.5  0 0 0 0 1' }, filter)
  svg('feComposite', { in: 'gx', in2: 'gy', k1: 0, k2: 1, k3: 1, k4: 0, operator: 'arithmetic', result: 'map' }, filter)

  // The map's peak is 0.46 off neutral, so this is the bend at the rim.
  const scale = MAX_DISPLACEMENT / 0.46
  svg('feDisplacementMap', {
    in: 'SourceGraphic', in2: 'map', result: 'bent', scale: scale.toFixed(2), xChannelSelector: 'R', yChannelSelector: 'G',
  }, filter)
  // feDisplacementMap samples nearest-neighbour; the same 0.6 softening as
  // packages/core/src/lens-filter.ts hides the stair steps it leaves.
  svg('feGaussianBlur', { in: 'bent', result: 'soft', stdDeviation: 0.6 }, filter)
  svg('feColorMatrix', { in: 'soft', result: 'lens', type: 'saturate', values: 1.24 }, filter)
  svg('feFlood', { 'flood-color': '#fff', 'flood-opacity': 0.06, result: 'veil' }, filter)
  svg('feComposite', { in: 'veil', in2: 'lens', operator: 'over', result: 'lit' }, filter)
  svg('feComposite', { in: 'lit', in2: cut, operator: 'in', result: 'glass' }, filter)

  if (RIM) {
    // A thin bevel lit from above for the bright lip, and a weaker one from
    // below for the shade line: the two insets of .lq-surface, but following
    // the merged outline.
    svg('feGaussianBlur', { in: 'mask', result: 'lip', stdDeviation: 1.4 }, filter)
    const top = svg('feSpecularLighting', {
      in: 'lip', 'lighting-color': '#fff', result: 'topLit', specularConstant: 1.15, specularExponent: 42, surfaceScale: 3,
    }, filter)
    svg('feDistantLight', { azimuth: 268, elevation: 22 }, top)
    const bottom = svg('feSpecularLighting', {
      in: 'lip', 'lighting-color': '#fff', result: 'bottomLit', specularConstant: 0.4, specularExponent: 42, surfaceScale: 3,
    }, filter)
    svg('feDistantLight', { azimuth: 90, elevation: 22 }, bottom)
    svg('feComposite', { in: 'topLit', in2: 'bottomLit', k1: 0, k2: 1, k3: 1, k4: 0, operator: 'arithmetic', result: 'spec' }, filter)
    svg('feComposite', { in: 'spec', in2: cut, operator: 'in', result: 'rim' }, filter)
    const out = svg('feMerge', {}, filter)
    svg('feMergeNode', { in: 'glass' }, out)
    svg('feMergeNode', { in: 'rim' }, out)
  }
  return { filter, images }
}

// ----------------------------------------------------------------- modes ---

const perf = { encode: [], update: [] }
let update = () => {}

const makeSheet = (className) => {
  const element = document.createElement('div')
  element.className = `glass ${className}`
  element.style.width = `${W}px`
  element.style.height = `${H}px`
  stage.appendChild(element)
  return element
}

const makeCanvas = (className, width, height) => {
  const canvas = document.createElement('canvas')
  canvas.className = className
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  stage.appendChild(canvas)
  return canvas
}

// Today's approach: each shape its own element and its own static lens.
const makeSeparate = () => {
  const lensCanvas = document.createElement('canvas')
  const lensGl = createGl(lensCanvas, MAP_FRAGMENT, { alpha: false, antialias: false, preserveDrawingBuffer: true })
  const elements = shapes.map((s) => {
    const element = document.createElement('div')
    element.className = 'glass droplet'
    element.style.width = `${s.hw * 2}px`
    element.style.height = `${s.hh * 2}px`
    element.style.borderRadius = `${s.r}px`
    if (lensGl) {
      lensCanvas.width = s.hw * 2
      lensCanvas.height = s.hh * 2
      const lone = [{ ...s, x: s.hw, y: s.hh }]
      lensGl.draw({ x: 0, y: 0 }, 1, lone)
      const { filter, image } = mapFilter(s.hw * 2, s.hh * 2, false)
      image.setAttribute('href', lensCanvas.toDataURL('image/png'))
      element.style.setProperty('--lens', `url(#${filter.id})`)
    }
    stage.appendChild(element)
    return element
  })
  return () => {
    shapes.forEach((s, i) => {
      elements[i].style.transform = `translate(${(s.x - s.hw).toFixed(2)}px, ${(s.y - s.hh).toFixed(2)}px)`
    })
  }
}

// A shape stretched by `k` along `angle` (degrees), in a square sprite big
// enough for any rotation.
const liveSprite = (s, grow, k, angle) => {
  const w = (s.hw + grow) * 2 * k
  const h = ((s.hh + grow) * 2) / k
  const side = Math.ceil(Math.hypot(w, h)) + 2
  const r = Math.min(s.r + grow, w / 2, h / 2)
  const href = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="${-side / 2} ${-side / 2} ${side} ${side}">`
    + `<rect x="${(-w / 2).toFixed(2)}" y="${(-h / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${r.toFixed(2)}" `
    + `transform="rotate(${angle.toFixed(1)})" fill="#fff"/></svg>`,
  )}`
  return { href, side }
}

let liveTime = 0
const moveSprites = (images, origin) => {
  if (SPRITE_LIVE) {
    shapes.forEach((s, i) => {
      const { element, grow } = images[i]
      const k = 1 + 0.22 * Math.sin(liveTime * 2.2 + i)
      const { href, side } = liveSprite(s, grow, k, (liveTime * 60 + i * 40) % 360)
      element.setAttribute('href', href)
      element.setAttribute('width', side)
      element.setAttribute('height', side)
      element.setAttribute('x', (s.x - side / 2 - origin.x).toFixed(2))
      element.setAttribute('y', (s.y - side / 2 - origin.y).toFixed(2))
    })
    return
  }
  shapes.forEach((s, i) => {
    const { element, exact, grow } = images[i]
    element.setAttribute('x', (s.x - s.hw - grow - origin.x).toFixed(2))
    element.setAttribute('y', (s.y - s.hh - grow - origin.y).toFixed(2))
    exact?.setAttribute('x', (s.x - s.hw - origin.x).toFixed(2))
    exact?.setAttribute('y', (s.y - s.hh - origin.y).toFixed(2))
  })
}

const setup = {
  bridge() {
    const moveDroplets = makeSeparate()
    const canvas = makeCanvas('rim', W, H)
    const neck = createGl(canvas, NECK_FRAGMENT, { premultipliedAlpha: true })
    return () => {
      moveDroplets()
      neck?.draw({ x: 0, y: 0 }, 1)
    }
  },

  bridgeclip() {
    const sheet = makeSheet('sheet')
    const moveDroplets = makeSeparate()
    return () => {
      moveDroplets()
      const box = bounds(SPACING + 4)
      sheet.style.clipPath = `path(evenodd, '${contourPath(box, GRID, neckAt)}')`
    }
  },

  clip() {
    const sheet = makeSheet('sheet')
    const canvas = RIM ? makeCanvas('rim', W, H) : null
    const rim = canvas ? createGl(canvas, RIM_FRAGMENT, { premultipliedAlpha: true }) : null
    return () => {
      const box = bounds(SPACING + 4)
      if (FIT) {
        // The sheet shrinks to the shapes, so the backdrop it filters does too.
        sheet.style.transform = `translate(${box.x}px, ${box.y}px)`
        sheet.style.width = `${box.w}px`
        sheet.style.height = `${box.h}px`
        sheet.style.clipPath = `path(evenodd, '${contourPath({ ...box, x: 0, y: 0 }, GRID, (x, y) => fieldAt(x + box.x, y + box.y))}')`
      } else {
        sheet.style.clipPath = `path(evenodd, '${contourPath(box, GRID, fieldAt)}')`
      }
      rim?.draw({ x: 0, y: 0 }, 1)
    }
  },

  clipmap() {
    return setup.mapped(true)
  },

  map() {
    return setup.mapped(false)
  },

  mapped(clipped) {
    const sheet = makeSheet(clipped ? 'sheet' : '')
    const mapCanvas = document.createElement('canvas')
    mapCanvas.width = Math.round(W * MAP_SCALE)
    mapCanvas.height = Math.round(H * MAP_SCALE)
    const mapGl = createGl(mapCanvas, MAP_FRAGMENT, { alpha: false, antialias: false, preserveDrawingBuffer: true })
    const { filter, image } = mapFilter(W, H, !clipped)
    sheet.style.setProperty('--lens', `url(#${filter.id})`)
    const canvas = RIM ? makeCanvas('rim', W, H) : null
    const rim = canvas ? createGl(canvas, RIM_FRAGMENT, { premultipliedAlpha: true }) : null
    let lastUrl = ''
    return () => {
      if (clipped) {
        const box = bounds(SPACING + 4)
        sheet.style.clipPath = `path(evenodd, '${contourPath(box, GRID, fieldAt)}')`
      }
      mapGl?.draw({ x: 0, y: 0 }, MAP_SCALE)
      const encodeStart = performance.now()
      if (ENC === 'blob') {
        mapCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          image.setAttribute('href', url)
          if (lastUrl) URL.revokeObjectURL(lastUrl)
          lastUrl = url
        })
      } else {
        image.setAttribute('href', mapCanvas.toDataURL('image/png'))
      }
      perf.encode.push(performance.now() - encodeStart)
      rim?.draw({ x: 0, y: 0 }, 1)
    }
  },

  bridgegoo() {
    const sheet = makeSheet('')
    const { filter, images } = gooFilter(W, H, true)
    sheet.style.setProperty('--lens', `url(#${filter.id})`)
    const moveDroplets = makeSeparate()
    return () => {
      moveDroplets()
      moveSprites(images, { x: 0, y: 0 })
    }
  },

  goo() {
    const sheet = makeSheet('')
    const { filter, images } = gooFilter(W, H)
    sheet.style.setProperty('--lens', `url(#${filter.id})`)
    return () => {
      let origin = { x: 0, y: 0 }
      if (FIT) {
        const box = bounds(GOO_SIGMA * 3 + 4)
        origin = box
        sheet.style.transform = `translate(${box.x}px, ${box.y}px)`
        sheet.style.width = `${box.w}px`
        sheet.style.height = `${box.h}px`
        resizeFilter(filter, box.w, box.h)
      }
      moveSprites(images, origin)
    }
  },

  separate() {
    return makeSeparate()
  },
}

// Thin true outlines on top, to judge how far each method strays from the shapes.
const outlineLayer = OUTLINE ? svg('svg', { class: 'outline', height: H, width: W }) : null
if (outlineLayer) stage.appendChild(outlineLayer)
const outlines = outlineLayer
  ? shapes.map((s) => svg('rect', {
    fill: 'none', height: s.hh * 2, rx: s.r, stroke: '#ff2d55', 'stroke-dasharray': '3 3', 'stroke-width': 1, width: s.hw * 2,
  }, outlineLayer))
  : []

const paintScene = setup[MODE]?.()
if (!paintScene) throw new Error(`unknown mode ${MODE}`)

update = (t) => {
  const start = performance.now()
  liveTime = t
  place(t)
  paintScene()
  outlines.forEach((rect, i) => {
    rect.setAttribute('x', shapes[i].x - shapes[i].hw)
    rect.setAttribute('y', shapes[i].y - shapes[i].hh)
  })
  perf.update.push(performance.now() - start)
}

// ------------------------------------------------------------ the loop ---

// Time advances a fixed 1/60 s per frame so every mode replays the same
// motion however slowly this machine renders it.
let virtualTime = 0.4
let frames = []
let running = FROZEN === null

const quantile = (values, q) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

let last = 0
const tick = (now) => {
  if (last) frames.push(now - last)
  last = now
  if (frames.length > 240) frames = frames.slice(-240)
  update(virtualTime)
  virtualTime += 1 / 60
  if (frames.length % 15 === 0) hud.textContent = `${MODE} n=${shapes.length} ${(1000 / mean(frames.slice(-60))).toFixed(1)} fps`
  if (running) requestAnimationFrame(tick)
}

if (FROZEN === null) requestAnimationFrame(tick)
else {
  update(FROZEN)
  hud.style.display = 'none'
}

window.glassMerge = {
  shapes,
  // Paints the scene at time t without the free-running loop.
  step(t) {
    running = false
    update(t)
  },
  // Serialised frames: change the scene in rAF, then wait for that frame's
  // swap before starting the next, so each sample is the whole pipeline —
  // main thread, raster and the (software) GPU — for one frame. Needs
  // --enable-gpu-benchmarking.
  async swapFrames(count, from = 0.4) {
    running = false
    const benchmarking = window.chrome?.gpuBenchmarking
    if (!benchmarking) throw new Error('launch Chromium with --enable-gpu-benchmarking')
    perf.encode = []
    perf.update = []
    const walls = []
    let t = from
    for (let i = 0; i < count; i += 1) {
      const start = performance.now()
      await new Promise((resolve) => requestAnimationFrame(() => {
        update((t += 1 / 60))
        benchmarking.addSwapCompletionEventListener(resolve)
      }))
      walls.push(performance.now() - start)
    }
    return {
      encodeMean: mean(perf.encode),
      updateMean: mean(perf.update),
      wallMean: mean(walls),
      wallMedian: quantile(walls, 0.5),
      wallP90: quantile(walls, 0.9),
    }
  },
}
window.__ready = true
