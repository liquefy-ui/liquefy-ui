// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { DropletMenu, type DropletMenuItem } from '../src/droplet-menu'

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

afterEach(() => {
  document.body.innerHTML = ''
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

    await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: 4000 })
  })

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
    await waitFor(() => expect(screen.queryByRole('menu', { hidden: true })).toBeNull(), { timeout: 4000 })
  })

  it('lays the droplets over the trigger and portals them into the provider', async () => {
    const user = userEvent.setup()
    const { container } = mount(<DropletMenu icon={<Glyph />} items={items()} label="Create" />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    const menu = await screen.findByRole('menu')
    expect(container.querySelector('.lq-portal')?.contains(menu)).toBe(true)
    // Settled droplets sit at their offsets from the trigger's centre.
    const first = within(menu).getByRole('menuitem', { name: 'Camera' }).parentElement
    expect(first?.style.transform).toMatch(/translate\(0\.00px, -\d+\.\d+px\)/)
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
