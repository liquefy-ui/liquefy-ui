// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassMergeShape } from '@liquefy-ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidContextMenu, type LiquidContextMenuItem } from '../src/liquid-context-menu'

// Every frame's shapes, as the glass surface is handed them.
const glass = vi.hoisted(() => ({ frames: [] as GlassMergeShape[][] }))
vi.mock('@liquefy-ui/core', async (importOriginal) => {
  const core = await importOriginal<typeof import('@liquefy-ui/core')>()
  return {
    ...core,
    attachGlassMerge: (...args: Parameters<typeof core.attachGlassMerge>) => {
      const controller = core.attachGlassMerge(...args)
      return {
        destroy: controller.destroy,
        mode: controller.mode,
        setShapes: (shapes: readonly GlassMergeShape[]) => {
          glass.frames.push(shapes.map((shape) => ({ ...shape })))
          controller.setShapes(shapes)
        },
      }
    },
  }
})

const Glyph = () => <svg aria-hidden="true" />

const items = (chosen: string[] = []): LiquidContextMenuItem[] => [
  { icon: <Glyph />, label: 'Share', onSelect: () => chosen.push('Share') },
  { icon: <Glyph />, label: 'Copy', onSelect: () => chosen.push('Copy') },
  { disabled: true, icon: <Glyph />, label: 'Edit' },
  { danger: true, icon: <Glyph />, label: 'Delete', onSelect: () => chosen.push('Delete') },
]

/** `motion={false}` lifts and sets down instantly, so these read behaviour, not timing. */
const mount = (node: Parameters<typeof render>[0], motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const Photo = () => <img alt="Fjord at dawn" height={120} src="data:," width={180} />

const preview = () => screen.getByRole('img', { name: 'Fjord at dawn' }).closest<HTMLElement>('[aria-haspopup="menu"]')!

const focused = () => document.activeElement

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// jsdom lays nothing out: the preview is an empty box at the page's origin and
// the window is 1024 × 768, so the menu opens below it, 12px in from the
// margin: its top-left at (12, 24), its rows 44px tall under a 6px inset.
const row = (index: number) => ({ clientX: 120, clientY: 24 + 6 + 44 * index + 22 })
const touch = (point: { clientX: number, clientY: number }) => ({ ...point, isPrimary: true, pointerId: 7, pointerType: 'touch' })

/** Holds a finger on the preview until the menu opens. */
const longPress = async (target: HTMLElement) => {
  fireEvent.pointerDown(target, touch({ clientX: 4, clientY: 4 }))
  return screen.findByRole('menu')
}

// The tests that wait for the preview to be set down wait for real frames. The
// motion counts at most 1/30 s per frame however long the frame took, so on a
// loaded machine it takes longer in wall-clock time than it animates.
const RETURN_BUDGET = 15_000

afterEach(() => {
  document.body.innerHTML = ''
  glass.frames = []
})

describe('LiquidContextMenu', () => {
  it('renders only what it wraps on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <LiquidContextMenu items={items()} label="Photo">
          <Photo />
        </LiquidContextMenu>
      </LiquefyProvider>,
    )
    expect(markup).toContain('alt="Fjord at dawn"')
    expect(markup).toContain('aria-haspopup="menu"')
    expect(markup).not.toContain('role="menu"')
  })

  it('opens on a right click, as a menu of named rows', async () => {
    mount(<LiquidContextMenu items={items()} label="Photo"><Photo /></LiquidContextMenu>)
    fireEvent.contextMenu(preview(), { button: 2, clientX: 20, clientY: 20 })
    const menu = await screen.findByRole('menu', { name: 'Photo' })
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Share', 'Copy', 'Edit', 'Delete'])
  })

  it('opens once a finger has rested on it for the delay, not before', async () => {
    const changes: boolean[] = []
    mount(<LiquidContextMenu delay={120} items={items()} onOpenChange={(open) => changes.push(open)}><Photo /></LiquidContextMenu>)
    fireEvent.pointerDown(preview(), touch({ clientX: 4, clientY: 4 }))
    await sleep(40)
    expect(screen.queryByRole('menu')).toBeNull()
    await screen.findByRole('menu')
    expect(changes).toEqual([true])
  })

  it('lets a press that wanders off before the delay go, as a scroll', async () => {
    mount(<LiquidContextMenu delay={80} items={items()}><Photo /></LiquidContextMenu>)
    fireEvent.pointerDown(preview(), touch({ clientX: 4, clientY: 4 }))
    fireEvent.pointerMove(window, touch({ clientX: 4, clientY: 40 }))
    await sleep(160)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens on the browser’s own long press without waiting for the delay', async () => {
    mount(<LiquidContextMenu delay={10_000} items={items()}><Photo /></LiquidContextMenu>)
    fireEvent.pointerDown(preview(), touch({ clientX: 4, clientY: 4 }))
    fireEvent.contextMenu(preview(), { clientX: 4, clientY: 4 })
    await screen.findByRole('menu')
  })

  it('leaves a mouse’s left button to the page', async () => {
    mount(<LiquidContextMenu delay={20} items={items()}><Photo /></LiquidContextMenu>)
    fireEvent.pointerDown(preview(), { button: 0, clientX: 4, clientY: 4, isPrimary: true, pointerId: 1, pointerType: 'mouse' })
    await sleep(80)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  describe('a press that slides', () => {
    it('chooses the row it lets go on', async () => {
      const chosen: string[] = []
      mount(<LiquidContextMenu delay={20} items={items(chosen)}><Photo /></LiquidContextMenu>)
      await longPress(preview())
      fireEvent.pointerMove(window, touch(row(0)))
      fireEvent.pointerMove(window, touch(row(1)))
      fireEvent.pointerUp(window, touch(row(1)))
      expect(chosen).toEqual(['Copy'])
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('closes without choosing when let go off the menu', async () => {
      const chosen: string[] = []
      const changes: boolean[] = []
      mount(<LiquidContextMenu delay={20} items={items(chosen)} onOpenChange={(open) => changes.push(open)}><Photo /></LiquidContextMenu>)
      await longPress(preview())
      fireEvent.pointerMove(window, touch({ clientX: 600, clientY: 500 }))
      fireEvent.pointerUp(window, touch({ clientX: 600, clientY: 500 }))
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      expect(chosen).toEqual([])
      expect(changes).toEqual([true, false])
    })

    it('stays open when let go where it opened, as on iOS', async () => {
      const chosen: string[] = []
      mount(<LiquidContextMenu delay={20} items={items(chosen)}><Photo /></LiquidContextMenu>)
      await longPress(preview())
      fireEvent.pointerMove(window, touch({ clientX: 7, clientY: 2 }))
      fireEvent.pointerUp(window, touch({ clientX: 7, clientY: 2 }))
      await sleep(50)
      expect(screen.queryByRole('menu')).not.toBeNull()
      expect(chosen).toEqual([])

      // And a tap on a row then chooses it.
      fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }))
      expect(chosen).toEqual(['Share'])
    })

    it('does nothing when let go on a disabled row, as a click does', async () => {
      mount(<LiquidContextMenu delay={20} items={items()}><Photo /></LiquidContextMenu>)
      await longPress(preview())
      fireEvent.pointerMove(window, touch(row(2)))
      fireEvent.pointerUp(window, touch(row(2)))
      await sleep(50)
      expect(screen.queryByRole('menu')).not.toBeNull()
    })

    it('keeps the page from scrolling under the finger once the menu is open, not before', async () => {
      mount(<LiquidContextMenu delay={60} items={items()}><Photo /></LiquidContextMenu>)
      fireEvent.pointerDown(preview(), touch({ clientX: 4, clientY: 4 }))
      const early = new TouchEvent('touchmove', { cancelable: true })
      window.dispatchEvent(early)
      expect(early.defaultPrevented).toBe(false)
      await screen.findByRole('menu')
      const late = new TouchEvent('touchmove', { cancelable: true })
      window.dispatchEvent(late)
      expect(late.defaultPrevented).toBe(true)
    })
  })

  describe('from the keyboard', () => {
    it('opens on Shift+F10 with the first row focused', async () => {
      const user = userEvent.setup()
      mount(<LiquidContextMenu items={items()}><Photo /></LiquidContextMenu>)
      await user.tab()
      expect(focused()).toBe(preview())
      await user.keyboard('{Shift>}{F10}{/Shift}')
      const menu = await screen.findByRole('menu')
      await waitFor(() => expect(focused()).toBe(within(menu).getByRole('menuitem', { name: 'Share' })))
    })

    it('opens on the context-menu key', async () => {
      const user = userEvent.setup()
      mount(<LiquidContextMenu items={items()}><Photo /></LiquidContextMenu>)
      await user.tab()
      await user.keyboard('{ContextMenu}')
      await screen.findByRole('menu')
    })

    it('chooses with the arrow keys, closes and hands focus back', async () => {
      const user = userEvent.setup()
      const chosen: string[] = []
      mount(<LiquidContextMenu items={items(chosen)}><Photo /></LiquidContextMenu>)
      await user.tab()
      await user.keyboard('{Shift>}{F10}{/Shift}')
      const menu = await screen.findByRole('menu')
      await waitFor(() => expect(focused()).toBe(within(menu).getByRole('menuitem', { name: 'Share' })))
      await user.keyboard('{ArrowDown}{Enter}')
      expect(chosen).toEqual(['Copy'])
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      expect(focused()).toBe(preview())
    })

    it('closes on Escape and hands focus back', async () => {
      const user = userEvent.setup()
      mount(<LiquidContextMenu items={items()}><Photo /></LiquidContextMenu>)
      await user.tab()
      await user.keyboard('{Shift>}{F10}{/Shift}')
      await screen.findByRole('menu')
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      expect(focused()).toBe(preview())
    })

    it('does nothing when disabled', async () => {
      const user = userEvent.setup()
      mount(<LiquidContextMenu disabled items={items()}><Photo /></LiquidContextMenu>)
      fireEvent.keyDown(preview(), { key: 'F10', shiftKey: true })
      fireEvent.contextMenu(preview())
      await user.keyboard('{ContextMenu}')
      await sleep(30)
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  it('lifts a copy of the preview over the scrim, leaving the original in place unseen', async () => {
    mount(<LiquidContextMenu items={items()}><Photo /></LiquidContextMenu>)
    const original = screen.getByRole('img', { name: 'Fjord at dawn' })
    fireEvent.contextMenu(preview())
    await screen.findByRole('menu')
    const copies = document.querySelectorAll('img[alt="Fjord at dawn"]')
    expect(copies).toHaveLength(2)
    const copy = [...copies].find((image) => image !== original)!
    expect(copy.closest('[inert]')).not.toBeNull()
    expect(original.parentElement?.style.visibility).toBe('hidden')
  })

  it('draws the menu as glass, apart from the preview once it has settled', async () => {
    mount(<LiquidContextMenu items={items()}><Photo /></LiquidContextMenu>)
    fireEvent.contextMenu(preview())
    await screen.findByRole('menu')
    const shapes = glass.frames.at(-1) ?? []
    expect(shapes).toHaveLength(1)
    expect(shapes[0]).toMatchObject({ height: 4 * 44 + 12, width: 240 })
  })

  describe('with motion', () => {
    it('keeps the menu up until the preview is set down, then lets it go', async () => {
      mount(<LiquidContextMenu items={items()} stagger={0}><Photo /></LiquidContextMenu>, true)
      fireEvent.contextMenu(preview())
      await screen.findByRole('menu')
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
      // Still drawn while the menu goes back under the preview.
      expect(screen.queryByRole('menu', { hidden: true })).not.toBeNull()
      await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
      expect(document.querySelectorAll('img[alt="Fjord at dawn"]')).toHaveLength(1)
      expect(screen.getByRole('img', { name: 'Fjord at dawn' }).parentElement?.style.visibility).toBe('')
    }, RETURN_BUDGET + 5_000)

    it('sets the preview down where the page has scrolled it to while it closes', async () => {
      mount(<LiquidContextMenu items={items()} stagger={0}><Photo /></LiquidContextMenu>, true)
      const trigger = preview()
      let top = 40
      vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(() => DOMRect.fromRect({ height: 120, width: 180, x: 20, y: top }))
      const original = screen.getByRole('img', { name: 'Fjord at dawn' })
      fireEvent.contextMenu(trigger)
      await screen.findByRole('menu')
      const copy = [...document.querySelectorAll('img[alt="Fjord at dawn"]')].find((image) => image !== original)!.parentElement!
      const drawn: { transform: string, visibility: string }[] = []
      const watch = new MutationObserver(() => drawn.push({ transform: copy.style.transform, visibility: copy.style.visibility }))
      watch.observe(copy, { attributeFilter: ['style'] })
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
      // The page, no longer held still, scrolls 300px under it as it goes back down.
      top = -260
      await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
      watch.disconnect()
      // The copy was laid where the preview lifted from, so landing in its new place is 300px up from there.
      const landing = drawn.filter((frame) => frame.visibility === '').at(-1)?.transform.match(/^translate\((.+)px, (.+)px\) scale\((.+)\)$/)
      expect(landing?.slice(1).map(Number)).toEqual([0, -300, expect.closeTo(1, 2)])
      // Once down it is not drawn again over the original, which is back.
      expect(drawn.at(-1)?.visibility).toBe('hidden')
      expect(original.parentElement?.style.visibility).toBe('')
    }, RETURN_BUDGET + 5_000)

    // Acting on the choice closes the menu from inside a frame. The close must
    // not end up with two frame loops stepping the motion, which would play it
    // at double speed: no two of the component's frames may share a timestamp.
    it('steps the motion once a frame while it closes after a choice', async () => {
      const request = window.requestAnimationFrame.bind(window)
      const stamps: number[] = []
      const spy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => request((time) => {
        if (callback.name === 'tick') stamps.push(time)
        callback(time)
      }))
      try {
        mount(<LiquidContextMenu items={items()} stagger={0}><Photo /></LiquidContextMenu>, true)
        fireEvent.contextMenu(preview())
        await screen.findByRole('menu')
        fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }))
        stamps.length = 0
        await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
        expect(stamps.length).toBeGreaterThan(5)
        expect(new Set(stamps).size).toBe(stamps.length)
      } finally {
        spy.mockRestore()
      }
    }, RETURN_BUDGET + 5_000)

    it('pulls a neck of glass out of the preview, then lets it go', async () => {
      mount(<LiquidContextMenu items={items()} stagger={0}><Photo /></LiquidContextMenu>, true)
      fireEvent.contextMenu(preview())
      await screen.findByRole('menu')
      await waitFor(() => expect(glass.frames.at(-1)).toHaveLength(1), { timeout: RETURN_BUDGET })
      // On the way out there were two pieces: the menu and the one under the preview's edge.
      expect(glass.frames.some((frame) => frame.length === 2)).toBe(true)
    }, RETURN_BUDGET + 5_000)

    it('pops the chosen row, then acts on it once and closes', async () => {
      const share = vi.fn()
      const copy = vi.fn()
      const user = userEvent.setup()
      mount(
        <LiquidContextMenu items={[{ label: 'Share', onSelect: share }, { label: 'Copy', onSelect: copy }]} stagger={0}>
          <Photo />
        </LiquidContextMenu>,
        true,
      )
      fireEvent.contextMenu(preview())
      const menu = await screen.findByRole('menu')
      const shareItem = within(menu).getByRole('menuitem', { name: 'Share' })
      fireEvent.click(shareItem)
      expect(share).not.toHaveBeenCalled()
      // While it pops, a second choice and Escape both wait.
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Copy' }))
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeNull()
      await waitFor(() => expect(share).toHaveBeenCalledTimes(1), { timeout: RETURN_BUDGET })
      expect(copy).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
    }, RETURN_BUDGET * 2 + 5_000)

    it('sinks the preview a little while a press is held', async () => {
      mount(<LiquidContextMenu delay={10_000} items={items()}><Photo /></LiquidContextMenu>, true)
      fireEvent.pointerDown(preview(), touch({ clientX: 4, clientY: 4 }))
      const content = screen.getByRole('img', { name: 'Fjord at dawn' }).parentElement!
      await waitFor(() => expect(content.style.transform).toMatch(/scale\(0\.9[5-9]/), { timeout: RETURN_BUDGET })
      fireEvent.pointerUp(window, touch({ clientX: 4, clientY: 4 }))
      await waitFor(() => expect(content.style.transform).toBe(''), { timeout: RETURN_BUDGET })
    }, RETURN_BUDGET * 2 + 5_000)
  })

  it('opens and closes at once with motion off', async () => {
    mount(<LiquidContextMenu items={items()}><Photo /></LiquidContextMenu>)
    fireEvent.contextMenu(preview())
    const menu = await screen.findByRole('menu')
    // Every row is there already, at full strength.
    for (const item of within(menu).getAllByRole('menuitem')) expect(item.style.opacity).toBe('')
    fireEvent.keyDown(menu, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull())
  })
})
