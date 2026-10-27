import type { ParticleFrame, ParticleShape, ParticleSystem } from './particle-system'

type Rgb = readonly [number, number, number]

/** Side of the picture a sprite shape is drawn once into, in canvas pixels. */
const SPRITE = 64

/**
 * How much bigger than its `size` each sprite is drawn. The glass disc of a
 * bead or a bubble stops short of its sprite's edge; a flake's and a spark's
 * glow reach well past the part that reads as the particle.
 */
const SPRITE_SCALE: Partial<Record<ParticleShape, number>> = {
  bead: SPRITE / (SPRITE - 6),
  bubble: SPRITE / (SPRITE - 6),
  flake: 1.7,
  spark: 3.2,
  sparkle: 1,
}

/** A confetti piece is a strip this much as tall as it is wide. */
const CONFETTI_ASPECT = 0.55

const rgba = ([r, g, b]: Rgb, alpha: number): string => `rgba(${r}, ${g}, ${b}, ${alpha})`

/** `rgb` toward white by `amount`, 0 to 1. */
const lighten = ([r, g, b]: Rgb, amount: number): Rgb =>
  [r, g, b].map((channel) => Math.round(channel + (255 - channel) * amount)) as unknown as Rgb

/** `rgb` toward black by `amount`, 0 to 1. */
const darken = ([r, g, b]: Rgb, amount: number): Rgb =>
  [r, g, b].map((channel) => Math.round(channel * (1 - amount))) as unknown as Rgb

const newCanvas = (size: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

let probe: CanvasRenderingContext2D | null | undefined

/** Paints one pixel of `color` and reads it back: whatever CSS colour it is, as sRGB bytes. */
const bytesOf = (color: string): Rgb | null => {
  probe ??= newCanvas(1).getContext('2d', { willReadFrequently: true })
  if (!probe) return null
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#000'
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

const disc = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
}

/**
 * A drop of water as a tiny lens: nearly clear in the middle and tinted toward
 * the rim, light gathered at the bottom where the drop focuses it, a lit edge,
 * and the point of light every glass in the library has, upper left. A faint
 * dark ring under it keeps it readable over a bright sky.
 */
const paintBead = (context: CanvasRenderingContext2D, rgb: Rgb): void => {
  const c = SPRITE / 2
  const r = c - 3

  disc(context, c, c + 1, r + 0.6)
  context.lineWidth = 2
  context.strokeStyle = 'rgba(0, 0, 0, 0.16)'
  context.stroke()

  const body = context.createRadialGradient(c - r * 0.2, c - r * 0.25, 0, c, c, r)
  body.addColorStop(0, rgba(lighten(rgb, 0.5), 0.08))
  body.addColorStop(0.65, rgba(rgb, 0.16))
  body.addColorStop(1, rgba(rgb, 0.46))
  disc(context, c, c, r)
  context.fillStyle = body
  context.fill()

  context.save()
  disc(context, c, c, r)
  context.clip()
  const caustic = context.createRadialGradient(c + r * 0.1, c + r * 0.62, 0, c + r * 0.1, c + r * 0.62, r * 0.62)
  caustic.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
  caustic.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = caustic
  context.fillRect(0, 0, SPRITE, SPRITE)
  context.restore()

  const rim = context.createLinearGradient(c - r, c - r, c + r, c + r)
  rim.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  rim.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
  rim.addColorStop(1, rgba(lighten(rgb, 0.35), 0.75))
  disc(context, c, c, r - 1.1)
  context.lineWidth = 2.2
  context.strokeStyle = rim
  context.stroke()

  context.save()
  context.translate(c - r * 0.36, c - r * 0.42)
  context.rotate(-0.6)
  context.scale(1, 0.62)
  const highlight = context.createRadialGradient(0, 0, 0, 0, 0, r * 0.32)
  highlight.addColorStop(0, 'rgba(255, 255, 255, 1)')
  highlight.addColorStop(0.55, 'rgba(255, 255, 255, 0.85)')
  highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')
  disc(context, 0, 0, r * 0.32)
  context.fillStyle = highlight
  context.fill()
  context.restore()

  disc(context, c + r * 0.45, c + r * 0.4, r * 0.09)
  context.fillStyle = 'rgba(255, 255, 255, 0.6)'
  context.fill()
}

/**
 * A bubble: a film, so clearer than a drop, a bright rim with a thin band of
 * the tint inside it, and a window's reflection curving round its upper left.
 */
const paintBubble = (context: CanvasRenderingContext2D, rgb: Rgb): void => {
  const c = SPRITE / 2
  const r = c - 3

  const body = context.createRadialGradient(c, c, 0, c, c, r)
  body.addColorStop(0, rgba(rgb, 0.02))
  body.addColorStop(0.78, rgba(rgb, 0.08))
  body.addColorStop(1, 'rgba(255, 255, 255, 0.32)')
  disc(context, c, c, r)
  context.fillStyle = body
  context.fill()

  disc(context, c, c, r - 0.9)
  context.lineWidth = 1.8
  context.strokeStyle = 'rgba(255, 255, 255, 0.78)'
  context.stroke()

  disc(context, c, c, r - 3)
  context.lineWidth = 1.4
  context.strokeStyle = rgba(lighten(rgb, 0.2), 0.4)
  context.stroke()

  context.beginPath()
  context.arc(c, c, r * 0.7, Math.PI * 1.08, Math.PI * 1.42)
  context.lineCap = 'round'
  context.lineWidth = r * 0.13
  context.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  context.stroke()

  disc(context, c + r * 0.44, c + r * 0.46, r * 0.075)
  context.fillStyle = 'rgba(255, 255, 255, 0.65)'
  context.fill()
}

const paintFlake = (context: CanvasRenderingContext2D, rgb: Rgb): void => {
  const c = SPRITE / 2
  const glow = context.createRadialGradient(c, c, 0, c, c, c)
  glow.addColorStop(0, rgba(rgb, 1))
  glow.addColorStop(0.3, rgba(rgb, 0.85))
  glow.addColorStop(1, rgba(rgb, 0))
  context.fillStyle = glow
  context.fillRect(0, 0, SPRITE, SPRITE)
}

const paintSpark = (context: CanvasRenderingContext2D, rgb: Rgb): void => {
  const c = SPRITE / 2
  const glow = context.createRadialGradient(c, c, 0, c, c, c)
  glow.addColorStop(0, 'rgba(255, 255, 255, 1)')
  glow.addColorStop(0.14, rgba(lighten(rgb, 0.4), 1))
  glow.addColorStop(0.3, rgba(rgb, 0.9))
  glow.addColorStop(0.55, rgba(rgb, 0.35))
  glow.addColorStop(1, rgba(rgb, 0))
  context.fillStyle = glow
  context.fillRect(0, 0, SPRITE, SPRITE)
}

/** A four-pointed star over a soft glow, white at its heart. */
const paintSparkle = (context: CanvasRenderingContext2D, rgb: Rgb): void => {
  const c = SPRITE / 2
  const glow = context.createRadialGradient(c, c, 0, c, c, c * 0.62)
  glow.addColorStop(0, rgba(rgb, 0.5))
  glow.addColorStop(1, rgba(rgb, 0))
  context.fillStyle = glow
  context.fillRect(0, 0, SPRITE, SPRITE)

  const tip = c - 1
  const waist = tip * 0.12
  context.beginPath()
  context.moveTo(c, c - tip)
  context.quadraticCurveTo(c + waist, c - waist, c + tip, c)
  context.quadraticCurveTo(c + waist, c + waist, c, c + tip)
  context.quadraticCurveTo(c - waist, c + waist, c - tip, c)
  context.quadraticCurveTo(c - waist, c - waist, c, c - tip)
  context.closePath()
  const fill = context.createRadialGradient(c, c, 0, c, c, tip)
  fill.addColorStop(0, 'rgba(255, 255, 255, 1)')
  fill.addColorStop(0.35, rgba(lighten(rgb, 0.55), 1))
  fill.addColorStop(1, rgba(rgb, 0.9))
  context.fillStyle = fill
  context.fill()
}

const PAINTERS: Partial<Record<ParticleShape, (context: CanvasRenderingContext2D, rgb: Rgb) => void>> = {
  bead: paintBead,
  bubble: paintBubble,
  flake: paintFlake,
  spark: paintSpark,
  sparkle: paintSparkle,
}

/**
 * Draws a `ParticleSystem` onto a 2D canvas. The glassy and the glowing
 * shapes are each painted once per colour into a small sprite and stamped
 * from then on, so a frame of a few hundred particles is a few hundred
 * `drawImage`s; streaks and confetti are a line or a rectangle each.
 *
 * Colours are read through the canvas element, so a custom property such as
 * the provider's tint resolves where the canvas is on the page.
 */
export class ParticlePainter {
  private readonly colors = new Map<string, Rgb | null>()
  private readonly context: CanvasRenderingContext2D | null
  private density = 1
  private left = 0
  private readonly sprites = new Map<string, HTMLCanvasElement>()
  private top = 0

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')
  }

  /** Whether there is a 2D context to draw with. Without one, nothing is drawn. */
  public get ready(): boolean {
    return this.context !== null
  }

  /**
   * Sizes the canvas to `width` by `height` CSS pixels, with the field's
   * top-left corner `left` and `top` in from the canvas's own.
   */
  public resize(width: number, height: number, left = 0, top = 0): void {
    this.density = Math.min(globalThis.devicePixelRatio || 1, 2)
    this.canvas.width = Math.max(1, Math.round(width * this.density))
    this.canvas.height = Math.max(1, Math.round(height * this.density))
    this.left = left
    this.top = top
  }

  /** Forgets the colours read so far, for when a tint behind them has changed. */
  public refresh(): void {
    this.colors.clear()
    this.sprites.clear()
  }

  public clear(): void {
    const context = this.context
    if (!context) return
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  public draw(system: ParticleSystem): void {
    const context = this.context
    if (!context) return
    this.clear()
    const { density } = this
    const originX = this.left * density
    const originY = this.top * density
    system.each((frame) => {
      const rgb = this.rgbOf(frame.color)
      if (!rgb || frame.opacity <= 0.002 || frame.size <= 0.05) return
      context.setTransform(density, 0, 0, density, originX, originY)
      context.globalAlpha = Math.min(1, frame.opacity)
      this.drawOne(context, frame, rgb)
    })
    context.globalAlpha = 1
  }

  private drawOne(context: CanvasRenderingContext2D, frame: ParticleFrame, rgb: Rgb): void {
    const { shape, size, x, y } = frame
    if (shape === 'streak') {
      const gradient = context.createLinearGradient(x + frame.tailX, y + frame.tailY, x, y)
      gradient.addColorStop(0, rgba(rgb, 0))
      gradient.addColorStop(1, rgba(rgb, 1))
      context.beginPath()
      context.moveTo(x + frame.tailX, y + frame.tailY)
      context.lineTo(x, y)
      context.lineCap = 'round'
      context.lineWidth = size
      context.strokeStyle = gradient
      context.stroke()
      return
    }
    if (shape === 'confetti') {
      context.translate(x, y)
      context.rotate((frame.rotation * Math.PI) / 180)
      context.scale(1, frame.flip)
      // Its back is in its own shade, so a tumbling piece catches the light.
      context.fillStyle = `rgb(${(frame.flip >= 0 ? rgb : darken(rgb, 0.28)).join(', ')})`
      context.fillRect(-size / 2, (-size * CONFETTI_ASPECT) / 2, size, size * CONFETTI_ASPECT)
      return
    }
    if (shape === 'circle') {
      disc(context, x, y, size / 2)
      context.fillStyle = `rgb(${rgb.join(', ')})`
      context.fill()
      return
    }
    const sprite = this.spriteOf(shape, rgb)
    if (!sprite) return
    const drawn = size * (SPRITE_SCALE[shape] ?? 1)
    // A spark with a tail is a comet: a fading line behind its glow.
    if (shape === 'spark' && Math.abs(frame.tailX) + Math.abs(frame.tailY) > size) {
      const gradient = context.createLinearGradient(x + frame.tailX, y + frame.tailY, x, y)
      gradient.addColorStop(0, rgba(rgb, 0))
      gradient.addColorStop(1, rgba(lighten(rgb, 0.3), 1))
      context.beginPath()
      context.moveTo(x + frame.tailX, y + frame.tailY)
      context.lineTo(x, y)
      context.lineCap = 'round'
      context.lineWidth = size * 0.5
      context.strokeStyle = gradient
      context.stroke()
    }
    if (shape === 'sparkle') {
      context.translate(x, y)
      context.rotate((frame.rotation * Math.PI) / 180)
      context.drawImage(sprite, -drawn / 2, -drawn / 2, drawn, drawn)
      return
    }
    context.drawImage(sprite, x - drawn / 2, y - drawn / 2, drawn, drawn)
  }

  private spriteOf(shape: ParticleShape, rgb: Rgb): HTMLCanvasElement | null {
    const key = `${shape}:${rgb.join(',')}`
    const known = this.sprites.get(key)
    if (known) return known
    const paint = PAINTERS[shape]
    const sprite = newCanvas(SPRITE)
    const context = sprite.getContext('2d')
    if (!paint || !context) return null
    paint(context, rgb)
    this.sprites.set(key, sprite)
    return sprite
  }

  /** A colour as bytes, resolved where the canvas is, so `var(--lq-particle-tint)` takes the tint around it. */
  private rgbOf(color: string): Rgb | null {
    if (this.colors.has(color)) return this.colors.get(color)!
    const style = this.canvas.style
    const before = style.color
    style.color = ''
    style.color = color
    const resolved = getComputedStyle(this.canvas).color
    style.color = before
    const rgb = bytesOf(resolved || color)
    this.colors.set(color, rgb)
    return rgb
  }
}
