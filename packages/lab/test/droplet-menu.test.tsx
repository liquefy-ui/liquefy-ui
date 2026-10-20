// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
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
})
