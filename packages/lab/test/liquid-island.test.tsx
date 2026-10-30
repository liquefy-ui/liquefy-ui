// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassMergeShape } from '@liquefy-ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidIsland, type LiquidIslandProps, type LiquidIslandView } from '../src/liquid-island'

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
const lastShape = () => glass.frames.at(-1)?.[0]

/** `motion={false}` lands every morph at once, so these read behaviour, not timing. */
const mount = (node: Parameters<typeof render>[0], motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const focused = () => document.activeElement
const status = () => screen.getByRole('status')

const VIEWS = (paused: string[] = []): Record<string, LiquidIslandView> => ({
  done: { announce: 'Download complete', bounce: true, content: <span>Done</span>, height: 36, width: 36 },
  download: { announce: 'Downloading', content: <span>42%</span>, height: 36, width: 220 },
  music: {
    content: (
      <>
        <span>Hold On</span>
        <button onClick={() => paused.push('paused')} type="button">Pause</button>
      </>
    ),
    height: 40,
    width: 200,
  },
})

const PANEL: LiquidIslandProps['panel'] = {
  content: ({ close }) => (
    <div>
      <button type="button">Previous</button>
      <button onClick={close} type="button">Done</button>
    </div>
  ),
  height: 180,
  label: 'Player',
  width: 320,
}

afterEach(() => {
  document.body.innerHTML = ''
  glass.frames = []
})

describe('LiquidIsland', () => {
  it('renders the view and its live region on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <LiquidIsland label="Activity" view="download" views={VIEWS()} />
      </LiquefyProvider>,
    )
    expect(markup).toContain('42%')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('Downloading')
    // Nothing to open, so no button.
    expect(markup).not.toContain('<button')
  })

  it('rests as a round bubble of the size it is given', () => {
    mount(<LiquidIsland label="Activity" size={32} view="idle" views={VIEWS()} />)
    expect(lastShape()).toMatchObject({ height: 32, radius: 16, width: 32 })
  })

  it('takes the shape of each view it is switched to', () => {
    const island = (view: string) => (
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <LiquidIsland label="Activity" view={view} views={VIEWS()} />
      </LiquefyProvider>
    )
    const { rerender } = render(island('idle'))
    rerender(island('download'))
    expect(lastShape()).toMatchObject({ height: 36, radius: 18, width: 220 })
    expect(screen.getByText('42%')).toBeTruthy()
    rerender(island('done'))
    expect(lastShape()).toMatchObject({ height: 36, radius: 18, width: 36 })
    // The view it left is gone once the glass is at rest.
    expect(screen.queryByText('42%')).toBeNull()
  })

  it('says what each view announces, politely, as it arrives', () => {
    const island = (view: string) => (
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <LiquidIsland label="Activity" view={view} views={VIEWS()} />
      </LiquefyProvider>
    )
    const { rerender } = render(island('idle'))
    expect(status().getAttribute('aria-live')).toBe('polite')
    expect(status().textContent).toBe('')
    rerender(island('download'))
    expect(status().textContent).toBe('Downloading')
    rerender(island('done'))
    expect(status().textContent).toBe('Download complete')
    // The visible content is not what is read: a percentage ticking over would be read out every time.
    expect(status().textContent).not.toContain('42%')
  })

  it('keeps what a view holds pressable', async () => {
    const user = userEvent.setup()
    const paused: string[] = []
    mount(<LiquidIsland label="Now playing" panel={PANEL} view="music" views={VIEWS(paused)} />)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(paused).toEqual(['paused'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens into its panel when pressed and takes focus inside', async () => {
    const user = userEvent.setup()
    mount(<LiquidIsland label="Now playing" panel={PANEL} view="music" views={VIEWS()} />)
    const island = screen.getByRole('button', { name: 'Now playing' })
    expect(island.getAttribute('aria-expanded')).toBe('false')

    await user.click(island)
    const panel = await screen.findByRole('dialog', { name: 'Player' })
    expect(island.getAttribute('aria-expanded')).toBe('true')
    await waitFor(() => expect(focused()).toBe(within(panel).getByRole('button', { name: 'Previous' })))
    expect(lastShape()).toMatchObject({ height: 180, width: 320 })
    // The view underneath is out of reach while the panel is up.
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
  })

  it('opens from the keyboard and closes on Escape, handing focus back', async () => {
    const user = userEvent.setup()
    mount(<LiquidIsland label="Now playing" panel={PANEL} view="music" views={VIEWS()} />)
    const island = screen.getByRole('button', { name: 'Now playing' })
    island.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(focused()).toBe(island)
    expect(lastShape()).toMatchObject({ height: 40, width: 200 })
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
  })

  it('closes on a press outside, and from inside the panel', async () => {
    const user = userEvent.setup()
    mount(
      <>
        <button type="button">Elsewhere</button>
        <LiquidIsland label="Now playing" panel={PANEL} view="music" views={VIEWS()} />
      </>,
    )
    const island = screen.getByRole('button', { name: 'Now playing' })
    await user.click(island)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click(island)
    await user.click(await screen.findByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(focused()).toBe(island)
  })

  it('follows a controlled open prop and asks before changing it', async () => {
    const user = userEvent.setup()
    const changes: boolean[] = []
    const Harness = () => {
      const [open, setOpen] = useState(false)
      return (
        <LiquidIsland
          label="Now playing"
          onOpenChange={(next) => {
            changes.push(next)
            setOpen(next)
          }}
          open={open}
          panel={PANEL}
          view="music"
          views={VIEWS()}
        />
      )
    }
    mount(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Now playing' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(changes).toEqual([true, false])
  })

  it('hands focus to its button when the view holding it is replaced', () => {
    const island = (view: string) => (
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <LiquidIsland label="Now playing" panel={PANEL} view={view} views={VIEWS()} />
      </LiquefyProvider>
    )
    const { rerender } = render(island('music'))
    screen.getByRole('button', { name: 'Pause' }).focus()
    rerender(island('download'))
    expect(focused()).toBe(screen.getByRole('button', { name: 'Now playing' }))
  })

  it('keeps the panel up until the glass is back to the view', async () => {
    const user = userEvent.setup()
    mount(<LiquidIsland label="Now playing" panel={PANEL} view="music" views={VIEWS()} />, true)
    const island = screen.getByRole('button', { name: 'Now playing' })
    await user.click(island)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(island.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull(), { timeout: 15_000 })
    expect(focused()).toBe(island)
  }, 20_000)

  it('keeps the glass out from under anything that would hide the page from it', () => {
    const { container } = mount(<LiquidIsland label="Now playing" panel={PANEL} view="music" views={VIEWS()} />)
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
})
