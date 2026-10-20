// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassMergeShape } from '@liquefy-ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DropletMenu, type DropletMenuItem } from '../src/droplet-menu'

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

const Glyph = () => <svg aria-hidden="true" />

const items = (chosen: string[] = []): DropletMenuItem[] => [
  { icon: <Glyph />, label: 'Camera', onSelect: () => chosen.push('Camera') },
  { icon: <Glyph />, label: 'Photo', onSelect: () => chosen.push('Photo') },
  { disabled: true, icon: <Glyph />, label: 'Voice memo' },
]

/** `motion={false}` lands and absorbs droplets instantly, so these read behaviour, not timing. */
const mount = (node: Parameters<typeof render>[0], motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const focused = () => document.activeElement

// jsdom lays nothing out, so the trigger's centre is the page's origin and a
// droplet sits at its offset from there: with three items around a large
// trigger, Camera is 65px straight up.
const CAMERA = { clientX: 0, clientY: -65 }
const touch = (point: { clientX: number, clientY: number }) => ({ ...point, isPrimary: true, pointerId: 7, pointerType: 'touch' })
const mouse = (point: { clientX: number, clientY: number }) => ({ ...point, isPrimary: true, pointerId: 1, pointerType: 'mouse' })

/** Where a droplet's button is drawn, from its translate. */
const drawnAt = (menuitem: HTMLElement) => {
  const [, x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(menuitem.parentElement?.style.transform ?? '') ?? []
  return { x: Number(x), y: Number(y) }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The tests that wait for droplets to come home wait for real frames. The
// timeline counts at most 1/30 s per frame however long the frame took, so on
// a loaded machine the return takes longer in wall-clock time than it
// animates — they get a budget sized for a busy CI runner, not an idle laptop.
const RETURN_BUDGET = 15_000

afterEach(() => {
  document.body.innerHTML = ''
  glass.frames = []
})

describe('DropletMenu', () => {
  it('renders only the trigger on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <DropletMenu icon={<Glyph />} items={items()} label="Create" />
      </LiquefyProvider>,
    )
    expect(markup).toContain('aria-label="Create"')
    expect(markup).toContain('aria-haspopup="menu"')
    expect(markup).not.toContain('role="menu"')
  })

  it('opens from the keyboard into a menu of named droplets', async () => {
    const user = userEvent.setup()
    mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)

    const trigger = screen.getByRole('button', { name: 'Create' })
    await user.tab()
    expect(focused()).toBe(trigger)
    await user.keyboard('{Enter}')

    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map((item) => item.getAttribute('aria-label')))
      .toEqual(['Camera', 'Photo', 'Voice memo'])
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('selects with the arrow keys, closes and hands focus back', async () => {
    const user = userEvent.setup()
    const chosen: string[] = []
    mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)

    const trigger = screen.getByRole('button', { name: 'Create' })
    await user.tab()
    await user.keyboard('{ArrowDown}')
    await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(chosen).toEqual(['Photo'])
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(focused()).toBe(trigger)
  })

  // The WAI-ARIA menu pattern keeps a disabled item reachable, so a screen
  // reader user learns it exists; it just does nothing when chosen.
  it('reaches a disabled droplet but does not act on it', async () => {
    const user = userEvent.setup()
    const chosen: string[] = []
    mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    const menu = await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}{ArrowDown}')

    const voiceMemo = within(menu).getByRole('menuitem', { name: 'Voice memo' })
    expect(focused()).toBe(voiceMemo)
    expect(voiceMemo.getAttribute('aria-disabled')).toBe('true')
    await user.keyboard('{Enter}')
    expect(chosen).toEqual([])
    expect(screen.queryByRole('menu')).not.toBeNull()
  })

  it('closes on Escape and returns focus', async () => {
    const user = userEvent.setup()
    mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)
    const trigger = screen.getByRole('button', { name: 'Create' })
    await user.click(trigger)
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(focused()).toBe(trigger)
  })

  it('keeps the droplets mounted until they are home, then unmounts', async () => {
    const user = userEvent.setup()
    mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" stagger={0} />, true)
    const trigger = screen.getByRole('button', { name: 'Create' })
    await user.click(trigger)
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')

    // Closed as far as assistive technology is concerned, still on screen
    // while the droplets travel back.
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu', { hidden: true })).not.toBeNull()

    await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
  }, RETURN_BUDGET + 5_000)

  // The library leaves prefers-reduced-motion to the app, which maps it to the
  // provider's `motion`. With motion on, the OS setting alone changes nothing:
  // the popup is still held open while the droplets travel home.
  it('still animates when the system asks for reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      removeEventListener: () => {},
      removeListener: () => {},
    }))
    try {
      const user = userEvent.setup()
      mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" stagger={0} />, true)
      await user.click(screen.getByRole('button', { name: 'Create' }))
      await screen.findByRole('menu')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu', { hidden: true })).not.toBeNull()
      await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
    } finally {
      vi.unstubAllGlobals()
    }
  }, RETURN_BUDGET + 5_000)

  // Two synchronous renders leave no frame in between, so no droplet has left
  // when the close arrives — everything reads as home, and the popup Base UI
  // was asked to hold still has to be let go.
  it('releases the popup when closed before the first droplet has left', async () => {
    const menu = (open: boolean) => (
      <LiquefyProvider theme="dark" webgl={false}>
        <DropletMenu icon={<Glyph />} items={items()} label="Create" open={open} />
      </LiquefyProvider>
    )
    const { rerender } = render(menu(false))
    rerender(menu(true))
    expect(screen.queryByRole('menu')).not.toBeNull()
    rerender(menu(false))
    await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
  }, RETURN_BUDGET + 5_000)

  it('lays the droplets over the trigger, next to their glass', async () => {
    const user = userEvent.setup()
    const { container } = mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    const menu = await screen.findByRole('menu')
    // Portalled into the menu itself rather than out to the provider, so the
    // buttons and the glass are clipped and stacked by the same ancestors.
    const root = container.querySelector('.lq-droplet-menu')!
    expect(root.contains(menu)).toBe(true)
    expect(root.contains(root.querySelector('.lq-glass-merge__surface'))).toBe(true)
    // Settled droplets sit at their offsets from the trigger's centre.
    const first = within(menu).getByRole('menuitem', { name: 'Camera' }).parentElement
    expect(first?.style.transform).toMatch(/translate\(0\.00px, -\d+\.\d+px\)/)
  })

  it('draws the trigger and every droplet as one glass body', async () => {
    const user = userEvent.setup()
    mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)

    // Closed: the trigger alone, a 56px circle.
    expect(lastFrame()).toHaveLength(1)
    const [closed] = lastFrame()
    expect(closed).toMatchObject({ height: 56, radius: 28, stretch: 1, width: 56 })

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('menu')
    // Open: the trigger and all three droplets, the disabled one included,
    // each one size down and at its place around the trigger's centre.
    const [trigger, ...droplets] = lastFrame()
    expect(droplets).toHaveLength(3)
    droplets.forEach((droplet) => expect(droplet).toMatchObject({ height: 46, radius: 23, width: 46 }))
    const camera = droplets[0]!
    expect(camera.x - trigger!.x).toBeCloseTo(0, 1)
    expect(camera.y - trigger!.y).toBeLessThan(-50)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(lastFrame()).toHaveLength(1)
  })

  it('keeps the glass out from under anything that would hide the page from it', () => {
    const { container } = mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />, true)
    const surface = container.querySelector<HTMLElement>('.lq-glass-merge__surface')!
    for (let element = surface.parentElement; element; element = element.parentElement) {
      const style = getComputedStyle(element)
      expect(Number(style.opacity || 1)).toBe(1)
      for (const property of ['filter', 'clip-path', 'mask', 'mask-image', 'backdrop-filter']) {
        expect(['', 'none']).toContain(style.getPropertyValue(property))
      }
      expect(style.willChange).not.toMatch(/opacity|filter/)
    }
  })

  it('leaves the buttons clear, with no glass of their own', async () => {
    const user = userEvent.setup()
    const { container } = mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('menu')
    expect(container.querySelector('.lq-button, .lq-surface__edge, .lq-surface__shader')).toBeNull()
  })

  it('follows a controlled open prop both ways without reporting it back', async () => {
    const changes: boolean[] = []
    const menu = (open: boolean) => (
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <DropletMenu icon={<Glyph />} items={items()} label="Create" onOpenChange={(next) => changes.push(next)} open={open} />
      </LiquefyProvider>
    )
    const { rerender } = render(menu(false))
    expect(screen.queryByRole('menu')).toBeNull()

    rerender(menu(true))
    await screen.findByRole('menu')
    rerender(menu(false))
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(changes).toEqual([])
  })

  it('asks a controlled caller before opening and closing', async () => {
    const user = userEvent.setup()
    const changes: boolean[] = []
    const Harness = () => {
      const [open, setOpen] = useState(false)
      return (
        <DropletMenu
          icon={<Glyph />}
          items={items()}
          label="Create"
          onOpenChange={(next) => {
            changes.push(next)
            setOpen(next)
          }}
          open={open}
        />
      )
    }
    mount(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(changes).toEqual([true, false])
  })

  it('stays shut when a controlled caller declines to open it', async () => {
    const user = userEvent.setup()
    mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" open={false} />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  describe('laid out in a line', () => {
    it('stacks a column above the trigger that reads, and is walked, top to bottom', async () => {
      const user = userEvent.setup()
      mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" layout="line" placement="top" />)
      await user.tab()
      await user.keyboard('{ArrowDown}')
      const menu = await screen.findByRole('menu')
      const [camera, photo, voiceMemo] = within(menu).getAllByRole('menuitem')
      expect(drawnAt(camera!)).toEqual({ x: 0, y: -195 })
      expect(drawnAt(photo!)).toEqual({ x: 0, y: -130 })
      expect(drawnAt(voiceMemo!)).toEqual({ x: 0, y: -65 })

      expect(focused()).toBe(camera)
      await user.keyboard('{ArrowDown}')
      expect(focused()).toBe(photo)
    })

    it('walks a row with the left and right arrows', async () => {
      const user = userEvent.setup()
      const chosen: string[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" layout="line" placement="right" />)
      await user.tab()
      await user.keyboard('{Enter}')
      const menu = await screen.findByRole('menu')
      expect(menu.getAttribute('aria-orientation')).toBe('horizontal')
      const [camera, photo] = within(menu).getAllByRole('menuitem')
      expect(drawnAt(camera!)).toEqual({ x: 65, y: 0 })
      expect(drawnAt(photo!)).toEqual({ x: 130, y: 0 })

      await waitFor(() => expect(focused()).toBe(camera))
      await user.keyboard('{ArrowRight}{Enter}')
      expect(chosen).toEqual(['Photo'])
    })
  })

  describe('a press that slides', () => {
    it('chooses the droplet it lets go on, opening on the press for touch', async () => {
      const chosen: string[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)
      const trigger = screen.getByRole('button', { name: 'Create' })

      fireEvent.pointerDown(trigger, touch({ clientX: 0, clientY: 0 }))
      // Open while the finger is still down, not on the tap that never comes.
      await screen.findByRole('menu')
      fireEvent.pointerMove(trigger, touch({ clientX: 0, clientY: -30 }))
      fireEvent.pointerMove(trigger, touch(CAMERA))
      fireEvent.pointerUp(trigger, touch(CAMERA))

      expect(chosen).toEqual(['Camera'])
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('closes without choosing when let go off the droplets', async () => {
      const chosen: string[] = []
      const changes: boolean[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" onOpenChange={(open) => changes.push(open)} />)
      const trigger = screen.getByRole('button', { name: 'Create' })

      fireEvent.pointerDown(trigger, touch({ clientX: 0, clientY: 0 }))
      await screen.findByRole('menu')
      fireEvent.pointerMove(trigger, touch({ clientX: 140, clientY: -140 }))
      fireEvent.pointerUp(trigger, touch({ clientX: 140, clientY: -140 }))

      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      expect(chosen).toEqual([])
      expect(changes).toEqual([true, false])
    })

    it('does nothing when let go on a disabled droplet, as a click does', async () => {
      mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)
      const trigger = screen.getByRole('button', { name: 'Create' })
      fireEvent.pointerDown(trigger, touch({ clientX: 0, clientY: 0 }))
      await screen.findByRole('menu')
      // Voice memo, the disabled one, is down and to the left.
      const voiceMemo = { clientX: -56.29, clientY: 32.5 }
      fireEvent.pointerMove(trigger, touch(voiceMemo))
      fireEvent.pointerUp(trigger, touch(voiceMemo))
      await sleep(50)
      expect(screen.queryByRole('menu')).not.toBeNull()
    })

    it('leaves the menu open after a tap, as a click does', async () => {
      const chosen: string[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)
      const trigger = screen.getByRole('button', { name: 'Create' })
      fireEvent.pointerDown(trigger, touch({ clientX: 0, clientY: 0 }))
      fireEvent.pointerUp(trigger, touch({ clientX: 3, clientY: -2 }))
      await screen.findByRole('menu')
      await sleep(50)
      expect(screen.queryByRole('menu')).not.toBeNull()
      expect(chosen).toEqual([])
    })

    it('chooses with a mouse the same way, once', async () => {
      const user = userEvent.setup()
      const chosen: string[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)
      const trigger = screen.getByRole('button', { name: 'Create' })
      await user.pointer({ coords: { clientX: 0, clientY: 0 }, keys: '[MouseLeft>]', target: trigger })
      const menu = await screen.findByRole('menu')
      const camera = within(menu).getByRole('menuitem', { name: 'Camera' })
      // Held past the 200ms after which Base UI would click an item the mouse is released over itself.
      await sleep(250)
      await user.pointer({ coords: CAMERA, target: camera })
      await user.pointer({ coords: CAMERA, keys: '[/MouseLeft]', target: camera })
      expect(chosen).toEqual(['Camera'])
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    // Droplets fly out under a cursor still resting on the trigger. One that
    // happens to be under it when the button comes up has not been chosen.
    it('does not choose a droplet that passes under a press that never slid', async () => {
      const chosen: string[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)
      const trigger = screen.getByRole('button', { name: 'Create' })
      fireEvent.pointerDown(trigger, mouse({ clientX: 0, clientY: 0 }))
      fireEvent.mouseDown(trigger)
      const menu = await screen.findByRole('menu')
      const camera = within(menu).getByRole('menuitem', { name: 'Camera' })
      await sleep(250)
      fireEvent.pointerUp(camera, mouse({ clientX: 0, clientY: 0 }))
      fireEvent.mouseUp(camera)
      await sleep(50)
      expect(chosen).toEqual([])
      expect(screen.queryByRole('menu')).not.toBeNull()
    })
  })

  describe('with motion', () => {
    /** Opens a menu with motion on and waits for its droplets to land. */
    const openAnimated = async (node: Parameters<typeof render>[0]) => {
      const user = userEvent.setup()
      mount(node, true)
      await user.click(screen.getByRole('button', { name: 'Create' }))
      const menu = await screen.findByRole('menu')
      const camera = within(menu).getByRole('menuitem', { name: 'Camera' })
      await waitFor(() => expect(drawnAt(camera).y).toBeCloseTo(-65, 0), { timeout: RETURN_BUDGET })
      return { camera, menu, user }
    }

    it('draws a droplet and its glass toward a pointer near it, together', async () => {
      const { camera } = await openAnimated(<DropletMenu icon={<Glyph />} items={items()} label="Create" stagger={0} />)
      const atRest = drawnAt(camera)

      // Just past Camera's top rim.
      fireEvent.pointerMove(window, mouse({ clientX: 0, clientY: -65 - 30 }))
      await waitFor(() => expect(drawnAt(camera).y).toBeLessThan(atRest.y - 5), { timeout: RETURN_BUDGET })

      const [trigger, glassCamera] = lastFrame()
      expect(glassCamera!.y - trigger!.y).toBeCloseTo(drawnAt(camera).y, 1)
      expect(glassCamera!.x - trigger!.x).toBeCloseTo(drawnAt(camera).x, 1)
    }, RETURN_BUDGET + 5_000)

    it('bounces the chosen droplet, then acts on it once and closes', async () => {
      const camera = vi.fn()
      const photo = vi.fn()
      const { menu, user } = await openAnimated(
        <DropletMenu
          icon={<Glyph />}
          items={[
            { icon: <Glyph />, label: 'Camera', onSelect: camera },
            { icon: <Glyph />, label: 'Photo', onSelect: photo },
          ]}
          label="Create"
          stagger={0}
        />,
      )
      const trigger = screen.getByRole('button', { name: 'Create' })
      const cameraItem = within(menu).getByRole('menuitem', { name: 'Camera' })
      const before = glass.frames.length

      fireEvent.click(cameraItem)
      expect(camera).not.toHaveBeenCalled()
      // While it bounces, another press, a second choice and Escape all wait.
      fireEvent.click(cameraItem)
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Photo' }))
      await user.keyboard('{Escape}')
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      await waitFor(() => expect(camera).toHaveBeenCalledTimes(1), { timeout: RETURN_BUDGET })
      expect(photo).not.toHaveBeenCalled()
      // The glass bounced with the button: a third bigger at its height.
      const widest = Math.max(...glass.frames.slice(before).map((frame) => frame[1]?.width ?? 0))
      expect(widest).toBeGreaterThan(46 * 1.2)
      await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
      await sleep(400)
      expect(camera).toHaveBeenCalledTimes(1)
    }, RETURN_BUDGET + 5_000)

    it('acts on a droplet chosen from the keyboard after its bounce and hands focus back', async () => {
      const user = userEvent.setup()
      const chosen: string[] = []
      mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" stagger={0} />, true)
      const trigger = screen.getByRole('button', { name: 'Create' })
      await user.tab()
      await user.keyboard('{ArrowDown}')
      await screen.findByRole('menu')
      await user.keyboard('{ArrowDown}{Enter}')
      expect(chosen).toEqual([])

      await waitFor(() => expect(chosen).toEqual(['Photo']), { timeout: RETURN_BUDGET })
      await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
      expect(focused()).toBe(trigger)
    }, RETURN_BUDGET * 2 + 5_000)
  })

  it('neither pulls nor bounces with motion off, and acts at once', async () => {
    const user = userEvent.setup()
    const chosen: string[] = []
    mount(<DropletMenu icon={<Glyph />} items={items(chosen)} label="Create" />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    const menu = await screen.findByRole('menu')
    const camera = within(menu).getByRole('menuitem', { name: 'Camera' })
    const atRest = lastFrame()

    fireEvent.pointerMove(window, mouse({ clientX: 0, clientY: -95 }))
    await sleep(100)
    expect(lastFrame()).toEqual(atRest)
    expect(drawnAt(camera)).toEqual({ x: 0, y: -65 })

    fireEvent.click(camera)
    expect(chosen).toEqual(['Camera'])
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })
})
