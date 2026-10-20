import { describe, expect, it } from 'vitest'
import {
  ContextMenuMotion,
  contextMenuLayout,
  type ContextMenuLayout,
  type ContextMenuRect,
} from '../src/context-menu-motion'

const PHONE = { height: 844, width: 390 }
const DESKTOP = { height: 900, width: 1440 }
const MENU = { height: 4 * 44 + 12, width: 240 }

const centre = (rect: ContextMenuRect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })

/** Steps the motion at 60 fps for `ms` milliseconds, calling `each` after every frame. */
const play = (motion: ContextMenuMotion, ms: number, each?: (elapsed: number) => void) => {
  for (let elapsed = 1000 / 60; elapsed <= ms + 1e-6; elapsed += 1000 / 60) {
    motion.step(1 / 60)
    each?.(elapsed)
  }
}

/** Steps until nothing is moving, failing rather than spinning forever. */
const settleByStepping = (motion: ContextMenuMotion) => {
  for (let frame = 0; frame < 900; frame += 1) {
    if (!motion.step(1 / 60)) return
  }
  throw new Error('the context menu never came to rest')
}

describe('contextMenuLayout', () => {
  it('opens below a preview with room under it, lined up with its nearer end, and lifts it in place', () => {
    const preview = { height: 150, width: 220, x: 40, y: 120 }
    const layout = contextMenuLayout({ menu: MENU, preview, viewport: PHONE })
    expect(layout.side).toBe('bottom')
    expect(layout.align).toBe('start')
    expect(layout.scale).toBeCloseTo(1.04)
    // Lifted about its own centre: nothing had to move.
    expect(centre(layout.preview)).toEqual(centre(preview))
    expect(layout.menu.y).toBeCloseTo(layout.preview.y + layout.preview.height + 12)
    expect(layout.menu.x).toBeCloseTo(layout.preview.x)
  })

  it('lines the menu up with the right end of a preview on the right half', () => {
    const preview = { height: 120, width: 160, x: 1100, y: 200 }
    const layout = contextMenuLayout({ menu: MENU, preview, viewport: DESKTOP })
    expect(layout.align).toBe('end')
    expect(layout.menu.x + layout.menu.width).toBeCloseTo(layout.preview.x + layout.preview.width)
  })

  it('opens above a preview near the bottom of the screen', () => {
    const preview = { height: 150, width: 220, x: 40, y: 620 }
    const layout = contextMenuLayout({ menu: MENU, preview, viewport: PHONE })
    expect(layout.side).toBe('top')
    expect(layout.menu.y + layout.menu.height).toBeCloseTo(layout.preview.y - 12)
  })

  it('moves a tall preview as little as it can to make room, before it shrinks it', () => {
    const preview = { height: 360, width: 300, x: 45, y: 260 }
    const layout = contextMenuLayout({ menu: MENU, preview, viewport: PHONE })
    expect(layout.scale).toBeCloseTo(1.04)
    expect(layout.menu.y + layout.menu.height).toBeLessThanOrEqual(PHONE.height - 12 + 1e-6)
    expect(layout.preview.y).toBeGreaterThanOrEqual(12)
  })

  it('shrinks a preview that cannot fit with the menu however it moves', () => {
    const preview = { height: 700, width: 300, x: 45, y: 60 }
    const layout = contextMenuLayout({ menu: MENU, preview, viewport: PHONE })
    expect(layout.scale).toBeLessThan(1)
    expect(layout.preview.y).toBeGreaterThanOrEqual(12 - 1e-6)
    expect(layout.menu.y + layout.menu.height).toBeLessThanOrEqual(PHONE.height - 12 + 1e-6)
  })

  it('goes beside the preview when asked, and only fits there on a wide screen', () => {
    const preview = { height: 200, width: 280, x: 500, y: 300 }
    const layout = contextMenuLayout({ menu: MENU, preview, side: 'right', viewport: DESKTOP })
    expect(layout.side).toBe('right')
    expect(layout.menu.x).toBeCloseTo(layout.preview.x + layout.preview.width + 12)
    expect(layout.menu.y).toBeCloseTo(layout.preview.y)
  })

  it('keeps the menu on screen', () => {
    for (const x of [0, 100, 300]) {
      for (const y of [0, 300, 700]) {
        const layout = contextMenuLayout({ menu: MENU, preview: { height: 100, width: 90, x, y }, viewport: PHONE })
        expect(layout.menu.x).toBeGreaterThanOrEqual(12 - 1e-6)
        expect(layout.menu.x + layout.menu.width).toBeLessThanOrEqual(PHONE.width - 12 + 1e-6)
        expect(layout.menu.y).toBeGreaterThanOrEqual(12 - 1e-6)
        expect(layout.menu.y + layout.menu.height).toBeLessThanOrEqual(PHONE.height - 12 + 1e-6)
      }
    }
  })
})

describe('ContextMenuMotion', () => {
  const rest: ContextMenuRect = { height: 150, width: 220, x: 40, y: 120 }
  const layout: ContextMenuLayout = contextMenuLayout({ menu: MENU, preview: rest, viewport: PHONE })

  /** A motion opened over `rest` and played until its rows are all in. */
  const opened = (options: ConstructorParameters<typeof ContextMenuMotion>[1] = {}) => {
    const motion = new ContextMenuMotion(4, options)
    motion.open(layout, rest)
    settleByStepping(motion)
    return motion
  }

  it('starts at rest with nothing to draw', () => {
    const motion = new ContextMenuMotion(4)
    expect(motion.closed).toBe(true)
    expect(motion.preview()).toEqual({ scale: 1, shadow: 0, x: 0, y: 0 })
    expect(motion.panel()).toBeNull()
    expect(motion.shapes()).toEqual([])
    expect(motion.step(1 / 60)).toBe(false)
  })

  it('sinks the preview a little while a press is held, and lets it back up if the press goes', () => {
    const motion = new ContextMenuMotion(4)
    motion.press()
    play(motion, 450)
    expect(motion.preview().scale).toBeLessThan(0.97)
    expect(motion.preview().scale).toBeGreaterThan(0.94)
    motion.release()
    settleByStepping(motion)
    expect(motion.preview().scale).toBe(1)
    expect(motion.closed).toBe(true)
  })

  it('springs the preview up from its press, past its lift, and settles back onto it over the scrim', () => {
    const motion = new ContextMenuMotion(4)
    motion.press()
    play(motion, 450)
    motion.open(layout, rest)
    // From as far down as it had sunk: nothing jumps.
    expect(motion.preview().scale).toBeLessThan(0.97)
    let biggest = 0
    play(motion, 1200, () => {
      biggest = Math.max(biggest, motion.preview().scale)
    })
    expect(biggest).toBeGreaterThan(layout.scale + 0.01)
    settleByStepping(motion)
    expect(motion.preview()).toMatchObject({ scale: layout.scale, shadow: 1 })
    expect(motion.scrimOpacity()).toBe(1)
  })

  it('grows the menu out of the preview: a bud first, then its full size, and past it', () => {
    const motion = new ContextMenuMotion(4)
    motion.open(layout, rest)
    motion.step(1 / 60)
    const first = motion.panel()!
    expect(first.width).toBeLessThan(40)
    // Still mostly under the preview's bottom edge.
    expect(first.y).toBeLessThan(rest.y + rest.height * layout.scale)

    let tallest = 0
    play(motion, 1500, () => {
      tallest = Math.max(tallest, motion.panel()?.height ?? 0)
    })
    expect(tallest).toBeGreaterThan(MENU.height * 1.02)
    settleByStepping(motion)
    const panel = motion.panel()!
    expect(panel.x).toBeCloseTo(layout.menu.x, 1)
    expect(panel.y).toBeCloseTo(layout.menu.y, 1)
    expect(panel.width).toBeCloseTo(MENU.width, 1)
    expect(panel.height).toBeCloseTo(MENU.height, 1)
    expect(panel.frost).toBe(1)
  })

  it('pulls the menu out of a second piece of glass under the preview’s edge, which goes once it is out', () => {
    const motion = new ContextMenuMotion(4)
    motion.open(layout, rest)
    motion.step(1 / 60)
    const [anchor, menu] = motion.shapes()
    expect(menu).toBeDefined()
    // Hidden under the preview, just inside its bottom edge.
    const bottom = rest.y + rest.height / 2 + (rest.height * motion.preview().scale) / 2
    expect(anchor!.y + anchor!.height / 2).toBeLessThan(bottom)
    expect(anchor!.y).toBeGreaterThan(bottom - 30)
    settleByStepping(motion)
    expect(motion.shapes()).toHaveLength(1)
  })

  it('brings the rows in one at a time, in order', () => {
    const motion = new ContextMenuMotion(4, { stagger: 60 })
    motion.open(layout, rest)
    const arrived: number[] = []
    play(motion, 1200, () => {
      for (let index = 0; index < 4; index += 1) {
        if (!arrived.includes(index) && motion.row(index).opacity > 0.5) arrived.push(index)
      }
    })
    expect(arrived).toEqual([0, 1, 2, 3])
  })

  it('times the rows on its own clock, so a stalled frame does not bring them all at once', () => {
    const motion = new ContextMenuMotion(4, { stagger: 80 })
    motion.open(layout, rest)
    // Half a second of main thread lost to mounting the glass.
    motion.step(0.5)
    expect([0, 1, 2, 3].map((index) => motion.row(index).opacity)).toEqual([0, 0, 0, 0])
  })

  it('slides the highlight from row to row, stretching on the way, and leans it toward the pointer', () => {
    const motion = opened()
    motion.highlight(0)
    settleByStepping(motion)
    expect(motion.pill()).toMatchObject({ height: 44, opacity: 1, y: 6 + 22 })

    motion.highlight(3)
    let tallest = 0
    play(motion, 400, () => {
      tallest = Math.max(tallest, motion.pill().height)
    })
    expect(tallest).toBeGreaterThan(48)
    settleByStepping(motion)
    expect(motion.pill().y).toBeCloseTo(6 + 44 * 3 + 22, 1)

    // A pointer low in the row draws the highlight down toward it.
    motion.lean({ x: layout.menu.x + 120, y: layout.menu.y + 6 + 44 * 3 + 40 })
    settleByStepping(motion)
    expect(motion.pill().y).toBeGreaterThan(6 + 44 * 3 + 22 + 3)
    motion.lean(null)
    settleByStepping(motion)
    expect(motion.pill().y).toBeCloseTo(6 + 44 * 3 + 22, 1)
  })

  it('finds the row under a point, and none off the menu', () => {
    const motion = opened()
    const { menu } = layout
    expect(motion.rowAt({ x: menu.x + 20, y: menu.y + 6 + 44 * 2 + 10 })).toBe(2)
    expect(motion.rowAt({ x: menu.x - 4, y: menu.y + 30 })).toBe(-1)
    expect(motion.rowAt({ x: menu.x + 20, y: menu.y + menu.height + 4 })).toBe(-1)
  })

  it('pops a chosen row and hands the choice back once, after the pop', () => {
    const motion = opened()
    expect(motion.choose(1)).toBe(true)
    expect(motion.choose(2)).toBe(false)
    expect(motion.takeChoice()).toBe(-1)
    let widest = 0
    play(motion, 120, () => {
      widest = Math.max(widest, motion.pill().height)
    })
    expect(widest).toBeGreaterThan(44 * 1.04)
    expect(motion.takeChoice()).toBe(-1)
    play(motion, 120)
    expect(motion.takeChoice()).toBe(1)
    expect(motion.takeChoice()).toBe(-1)
  })

  it('keeps the highlight on a chosen row while it pops, whatever the pointer does', () => {
    const motion = opened()
    motion.highlight(0)
    settleByStepping(motion)
    motion.choose(2)
    motion.highlight(-1)
    motion.highlight(3)
    // Slid over from the first row, and stays there through the pop.
    let lowest = 0
    play(motion, 190, () => {
      lowest = Math.max(lowest, motion.pill().y)
      expect(motion.pill().opacity).toBeGreaterThan(0.95)
    })
    expect(motion.highlighted).toBe(2)
    expect(lowest).toBeLessThan(6 + 44 * 3)
  })

  it('draws the menu back under the preview and sets the preview down where it was', () => {
    const motion = opened()
    motion.close()
    expect(motion.isOpen).toBe(false)
    let lastPanel = motion.panel()
    play(motion, 200, () => {
      lastPanel = motion.panel() ?? lastPanel
    })
    expect(lastPanel!.height).toBeLessThan(MENU.height)
    settleByStepping(motion)
    expect(motion.closed).toBe(true)
    expect(motion.panel()).toBeNull()
    expect(motion.preview()).toEqual({ scale: 1, shadow: 0, x: 0, y: 0 })
  })

  it('sets the preview down where the page has moved it to', () => {
    const motion = opened()
    const drawn = motion.previewRect()!
    const scrolled = { ...rest, y: rest.y - 80 }
    motion.close(scrolled)
    // Nothing jumps the moment it is told...
    expect(motion.previewRect()!.y).toBeCloseTo(drawn.y)
    settleByStepping(motion)
    // ...and it is back on the page, wherever that is now.
    motion.press()
    expect(motion.closed).toBe(false)
  })

  it('turns round mid-close when opened again', () => {
    const motion = opened()
    motion.close()
    play(motion, 80)
    motion.open(layout, rest)
    settleByStepping(motion)
    expect(motion.isOpen).toBe(true)
    expect(motion.panel()!.height).toBeCloseTo(MENU.height, 1)
    expect(motion.row(3).opacity).toBe(1)
  })

  it('lands everything at once when settled, for motion off', () => {
    const motion = new ContextMenuMotion(4)
    motion.open(layout, rest)
    motion.settle()
    expect(motion.preview().scale).toBeCloseTo(layout.scale)
    expect(motion.panel()).toMatchObject({ frost: 1, height: MENU.height, width: MENU.width })
    expect(motion.row(3)).toEqual({ opacity: 1, scale: 1, x: 0, y: 0 })
    motion.close()
    motion.settle()
    expect(motion.closed).toBe(true)
  })

  it('rings for longer the wobblier the provider asks it to be', () => {
    const overshoot = (wobbliness: number) => {
      const motion = new ContextMenuMotion(4, { wobbliness })
      motion.open(layout, rest)
      let biggest = 0
      play(motion, 1500, () => {
        biggest = Math.max(biggest, motion.preview().scale)
      })
      return biggest - layout.scale
    }
    expect(overshoot(1)).toBeGreaterThan(overshoot(0.1) * 1.5)
  })
})
