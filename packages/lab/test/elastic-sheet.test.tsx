// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassMergeShape } from '@liquefy-ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ElasticSheet, type ElasticSheetProps } from '../src/elastic-sheet'
import type { ElasticSheetSnapPoint } from '../src/sheet-motion'

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
const lastFrame = () => glass.frames.at(-1) ?? []

// jsdom lays nothing out, so the sheet's room falls back to the window:
// 1024 × 768, less the 48px kept clear above — 720px to grow into.
const ROOM = 720

/** `motion={false}` puts the sheet at its stop at once, so these read behaviour, not timing. */
const mount = (node: ReactNode, motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const Sheet = (props: Partial<ElasticSheetProps>) => (
  <ElasticSheet title="Nearby" trigger={<button type="button">Open sheet</button>} {...props}>
    <p>Ferry terminal</p>
    <button type="button">Directions</button>
  </ElasticSheet>
)

const grabber = () => screen.getByRole('slider', { name: 'Sheet height' })
const sheet = () => screen.getByRole('dialog')

/** A pointer event at a given height on the screen and moment, as a finger or a mouse sends it. */
const pointer = (
  element: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientY: number,
  timeStamp: number,
  pointerType = 'touch',
) => {
  const event = new PointerEvent(type, { bubbles: true, button: 0, cancelable: true, clientX: 200, clientY, pointerId: 1, pointerType })
  Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  fireEvent(element, event)
}

/** Drags from `from` to `to` (screen y) over `ms` milliseconds in 8ms steps, then lets go. */
const drag = (element: Element, from: number, to: number, ms: number, pointerType = 'touch') => {
  pointer(element, 'pointerdown', from, 0, pointerType)
  const steps = Math.max(1, Math.round(ms / 8))
  for (let step = 1; step <= steps; step += 1) pointer(element, 'pointermove', from + ((to - from) * step) / steps, step * 8, pointerType)
  pointer(element, 'pointerup', to, steps * 8, pointerType)
}

/**
 * Waits for an animated sheet to come up into view. One closed before it got
 * there has nothing to slide away and lets go at once.
 */
const risen = (dialog: HTMLElement) =>
  waitFor(() => expect(Number.parseFloat(dialog.style.top)).toBeLessThan(768 - 100), { timeout: 10_000 })

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  glass.frames = []
})

describe('ElasticSheet', () => {
  it('renders only the trigger on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <Sheet defaultOpen />
      </LiquefyProvider>,
    )
    expect(markup).toContain('Open sheet')
    expect(markup).toContain('aria-haspopup="dialog"')
    expect(markup).not.toContain('role="dialog"')
  })

  it('opens from its trigger into a titled dialog with a grabber to resize it', async () => {
    const user = userEvent.setup()
    mount(<Sheet />)
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))

    const dialog = await screen.findByRole('dialog', { name: 'Nearby' })
    expect(within(dialog).getByRole('slider', { name: 'Sheet height' })).toBeTruthy()
    expect(grabber().getAttribute('aria-orientation')).toBe('vertical')
    expect(grabber().getAttribute('aria-valuenow')).toBe('50')
    expect(grabber().getAttribute('aria-valuetext')).toBe('50%')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('moves focus in, keeps it there, and hands it back on Escape', async () => {
    const user = userEvent.setup()
    mount(<Sheet />)
    const trigger = screen.getByRole('button', { name: 'Open sheet' })
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    // Past the last control Base UI's focus guard takes focus for a moment
    // and sends it round to the first, a frame later.
    for (let index = 0; index < 5; index += 1) {
      await user.tab()
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    }

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('closes from its close button', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    mount(<Sheet onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })

  it('steps between snap points from the grabber with the arrow keys, Home and End', async () => {
    const user = userEvent.setup()
    const seen: ElasticSheetSnapPoint[] = []
    mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} snapPoints={['25%', '50%', '100%']} />)
    await screen.findByRole('dialog')
    grabber().focus()

    expect(grabber().getAttribute('aria-valuenow')).toBe('25')
    expect(grabber().getAttribute('aria-valuemin')).toBe('25')
    expect(grabber().getAttribute('aria-valuemax')).toBe('100')
    await user.keyboard('{ArrowUp}')
    expect(grabber().getAttribute('aria-valuenow')).toBe('50')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(grabber().getAttribute('aria-valuenow')).toBe('100')
    await user.keyboard('{Home}')
    expect(grabber().getAttribute('aria-valuenow')).toBe('25')
    await user.keyboard('{End}{ArrowDown}')
    expect(grabber().getAttribute('aria-valuenow')).toBe('50')
    expect(seen).toEqual(['50%', '100%', '25%', '100%', '50%'])
  })

  it('steps up through the snap points, and round again, on a press of the grabber', async () => {
    const user = userEvent.setup()
    mount(<Sheet defaultOpen />)
    await screen.findByRole('dialog')
    await user.click(grabber())
    expect(grabber().getAttribute('aria-valuenow')).toBe('100')
    await user.click(grabber())
    expect(grabber().getAttribute('aria-valuenow')).toBe('50')
  })

  it('follows a controlled snap point', async () => {
    const Controlled = () => {
      const [snap, setSnap] = useState<ElasticSheetSnapPoint>('25%')
      return (
        <>
          <button onClick={() => setSnap('100%')} type="button">Expand</button>
          <Sheet defaultOpen modal={false} onSnapChange={setSnap} snap={snap} snapPoints={['25%', '50%', '100%']} />
        </>
      )
    }
    const user = userEvent.setup()
    mount(<Controlled />)
    await screen.findByRole('dialog')
    expect(grabber().getAttribute('aria-valuenow')).toBe('25')
    await user.click(screen.getByRole('button', { name: 'Expand' }))
    expect(grabber().getAttribute('aria-valuenow')).toBe('100')
  })

  it('takes pixels as well as shares, sorted by height', async () => {
    mount(<Sheet defaultOpen snapPoints={['100%', 188]} />)
    await screen.findByRole('dialog')
    expect(grabber().getAttribute('aria-valuenow')).toBe('100')
    expect(grabber().getAttribute('aria-valuemin')).toBe(String(Math.round((188 / ROOM) * 100)))
  })

  describe('dragging', () => {
    it('settles a slow drag on the nearest snap point', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} />)
      await screen.findByRole('dialog')
      // Half (376px) dragged up 300px is nearer the top (752px) than half.
      drag(grabber(), 500, 200, 600)
      expect(seen).toEqual(['100%'])
      expect(grabber().getAttribute('aria-valuenow')).toBe('100')
    })

    it('goes back where it was when let go short of halfway', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} />)
      await screen.findByRole('dialog')
      drag(grabber(), 500, 420, 800)
      expect(seen).toEqual([])
      expect(grabber().getAttribute('aria-valuenow')).toBe('50')
    })

    it('runs to the top on a quick flick up', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} snapPoints={['25%', '50%', '100%']} />)
      await screen.findByRole('dialog')
      // 60px in 40ms: 1500 px/s, which coasts past the middle stop to the top.
      drag(grabber(), 600, 540, 40)
      expect(seen).toEqual(['100%'])
    })

    it('puts the sheet away on a quick flick down', async () => {
      const onOpenChange = vi.fn()
      mount(<Sheet defaultOpen onOpenChange={onOpenChange} />)
      await screen.findByRole('dialog')
      drag(grabber(), 400, 460, 40)
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('holds a sheet that is not dismissible at its lowest snap point', async () => {
      const onOpenChange = vi.fn()
      const user = userEvent.setup()
      mount(<Sheet defaultOpen dismissible={false} onOpenChange={onOpenChange} />)
      await screen.findByRole('dialog')
      expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
      drag(grabber(), 400, 700, 40)
      await user.keyboard('{Escape}')
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(grabber().getAttribute('aria-valuenow')).toBe('50')
    })

    it('lets a mouse drag the grabber but not the content, which it selects', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} />)
      const dialog = await screen.findByRole('dialog')
      drag(within(dialog).getByText('Ferry terminal'), 500, 150, 600, 'mouse')
      expect(seen).toEqual([])
      drag(grabber(), 500, 150, 600, 'mouse')
      expect(seen).toEqual(['100%'])
    })

    it('grows from the content before the content scrolls', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} />)
      const dialog = await screen.findByRole('dialog')
      drag(within(dialog).getByText('Ferry terminal'), 500, 150, 600)
      expect(seen).toEqual(['100%'])
    })

    it('leaves a pull down to content that is scrolled down, until it is back at its top', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen defaultSnap="100%" onSnapChange={(snap) => seen.push(snap)} />)
      const dialog = await screen.findByRole('dialog')
      const text = within(dialog).getByText('Ferry terminal')
      const body = text.parentElement!
      body.scrollTop = 120
      drag(text, 200, 500, 2000)
      expect(seen).toEqual([])

      // Slow enough not to coast on past half and out of view.
      body.scrollTop = 0
      drag(text, 200, 500, 2000)
      expect(seen).toEqual(['50%'])
    })

    it('leaves a sideways move alone', async () => {
      const seen: ElasticSheetSnapPoint[] = []
      mount(<Sheet defaultOpen onSnapChange={(snap) => seen.push(snap)} />)
      await screen.findByRole('dialog')
      const element = grabber()
      pointer(element, 'pointerdown', 400, 0)
      fireEvent(element, new PointerEvent('pointermove', { bubbles: true, clientX: 260, clientY: 390, pointerId: 1, pointerType: 'touch' }))
      pointer(element, 'pointermove', 100, 100)
      pointer(element, 'pointerup', 100, 108)
      expect(seen).toEqual([])
    })

    it('does not press what a drag ends over', async () => {
      const onPress = vi.fn()
      mount(
        <ElasticSheet defaultOpen title="Nearby">
          <button onClick={onPress} type="button">Directions</button>
        </ElasticSheet>,
      )
      const button = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Directions' })
      drag(button, 500, 150, 600)
      fireEvent.click(button)
      expect(onPress).not.toHaveBeenCalled()
      fireEvent.click(button)
      expect(onPress).toHaveBeenCalledTimes(1)
    })
  })

  it('leaves the page live and focus where it was when it is not modal', async () => {
    const onOpenChange = vi.fn()
    const onPress = vi.fn()
    const user = userEvent.setup()
    mount(
      <>
        <button onClick={onPress} type="button">Map</button>
        <Sheet defaultOpen modal={false} onOpenChange={onOpenChange} />
      </>,
    )
    await screen.findByRole('dialog')
    expect(document.activeElement).toBe(document.body)
    await user.click(screen.getByRole('button', { name: 'Map' }))
    expect(onPress).toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.querySelector('.lq-drawer__backdrop')).toBeNull()
  })

  it('dims what is behind a modal sheet', async () => {
    mount(<Sheet defaultOpen />)
    await screen.findByRole('dialog')
    const backdrop = document.querySelector<HTMLElement>('.lq-drawer__backdrop')!
    expect(Number(backdrop.style.opacity)).toBe(1)
  })

  it('moves in the container it is given', async () => {
    const Framed = () => {
      const frame = useRef<HTMLDivElement>(null)
      return (
        <div data-testid="frame" ref={frame} style={{ position: 'relative' }}>
          <Sheet container={frame} defaultOpen modal={false} />
        </div>
      )
    }
    mount(<Framed />)
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(screen.getByTestId('frame').contains(dialog)).toBe(true))
    const room = document.querySelector<HTMLElement>('.lq-elastic-sheet__room')!
    expect(room.style.position).toBe('absolute')
  })

  it('draws its glass exactly under the content', async () => {
    mount(<Sheet defaultOpen />)
    const dialog = await screen.findByRole('dialog')
    const [shape] = lastFrame()
    expect(lastFrame()).toHaveLength(1)
    expect(shape!.width).toBeCloseTo(Number.parseFloat(dialog.style.width), 1)
    expect(shape!.height).toBeCloseTo(Number.parseFloat(dialog.style.height), 1)
    expect(shape!.radius).toBeCloseTo(Number.parseFloat(dialog.style.borderRadius), 1)
    // Half the room tall: the top edge 376px up from the bottom of the window.
    expect(Number.parseFloat(dialog.style.top)).toBeCloseTo(768 - ROOM / 2, 1)
  })

  it('keeps the glass out from under anything that would hide the page from it', async () => {
    mount(<Sheet defaultOpen />)
    await screen.findByRole('dialog')
    const surface = document.querySelector<HTMLElement>('.lq-glass-merge__surface')!
    for (let element = surface.parentElement; element; element = element.parentElement) {
      const style = getComputedStyle(element)
      expect(Number(style.opacity || 1)).toBe(1)
      for (const property of ['filter', 'clip-path', 'mask', 'mask-image', 'backdrop-filter']) {
        expect(['', 'none']).toContain(style.getPropertyValue(property))
      }
    }
  })

  it('stays mounted while it slides away, then lets go', async () => {
    const user = userEvent.setup()
    mount(<Sheet defaultOpen />, true)
    await risen(await screen.findByRole('dialog'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull(), { timeout: 10_000 })
  }, 15_000)

  it('slides away when a controlled caller closes it', async () => {
    const Controlled = () => {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button onClick={() => setOpen(false)} type="button">Done</button>
          <Sheet modal={false} onOpenChange={setOpen} open={open} />
        </>
      )
    }
    mount(<Controlled />, true)
    await risen(await screen.findByRole('dialog'))
    await act(async () => {
      screen.getByRole('button', { name: 'Done' }).click()
    })
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull(), { timeout: 10_000 })
  }, 15_000)
})
