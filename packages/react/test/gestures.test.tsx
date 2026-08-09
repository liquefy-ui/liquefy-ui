// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidDrawer } from '../src/liquid-drawer'
import { LiquidSelect } from '../src/liquid-select'
import { LiquefyProvider } from '../src/provider'

/**
 * The pointer gestures, which no amount of keyboard or role testing reaches: a
 * flick that dismisses a drawer, and the cases where that flick belongs to
 * something else — a scrolled panel, an open listbox, a mouse.
 */

const ui = (node: React.ReactNode) => render(
  <LiquefyProvider motion={false} theme="light" webgl={false}>{node}</LiquefyProvider>,
)

const options = [
  { label: 'Clear', value: 'clear' },
  { label: 'Regular', value: 'regular' },
]

/** A flick from `from` to `to`, as a touch rather than a mouse drag. */
const flick = (
  target: Element,
  from: { x: number; y: number },
  to: { x: number; y: number },
  pointerType = 'touch',
) => {
  fireEvent.pointerDown(target, { clientX: from.x, clientY: from.y, pointerType })
  fireEvent.pointerUp(target, { clientX: to.x, clientY: to.y, pointerType })
}

const drawer = (props: Partial<React.ComponentProps<typeof LiquidDrawer>> = {}) => {
  const onOpenChange = vi.fn()
  ui(
    <LiquidDrawer onOpenChange={onOpenChange} open side="bottom" title="Filters" {...props}>
      <LiquidSelect label="Finish" options={options} />
    </LiquidDrawer>,
  )

  return { onOpenChange, panel: screen.getByRole('dialog') }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('drawer flick', () => {
  it('closes when the panel is flicked towards its own edge', () => {
    const { onOpenChange, panel } = drawer()
    flick(panel, { x: 40, y: 100 }, { x: 40, y: 220 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stays open when the flick goes away from that edge', () => {
    const { onOpenChange, panel } = drawer()
    flick(panel, { x: 40, y: 220 }, { x: 40, y: 100 })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('stays open when the flick is too short to mean it', () => {
    const { onOpenChange, panel } = drawer()
    flick(panel, { x: 40, y: 100 }, { x: 40, y: 130 })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('reads a sideways drag on a bottom panel as something else', () => {
    const { onOpenChange, panel } = drawer()
    flick(panel, { x: 40, y: 100 }, { x: 260, y: 200 })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('leaves the mouse alone, which selects text rather than dismissing', () => {
    const { onOpenChange, panel } = drawer()
    flick(panel, { x: 40, y: 100 }, { x: 40, y: 220 }, 'mouse')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('does nothing when the gesture is turned off', () => {
    const { onOpenChange, panel } = drawer({ swipeToClose: false })
    flick(panel, { x: 40, y: 100 }, { x: 40, y: 220 })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closes when the flick starts on content that is already at the top', () => {
    const { onOpenChange, panel } = drawer()
    const surface = panel.querySelector('.lq-drawer__surface') as HTMLElement

    flick(surface, { x: 40, y: 100 }, { x: 40, y: 220 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('gives the flick to content that can still scroll that way', () => {
    const { onOpenChange, panel } = drawer()
    const surface = panel.querySelector('.lq-drawer__surface') as HTMLElement
    // jsdom lays nothing out, so the scrolled state has to be stated outright.
    Object.defineProperty(surface, 'scrollTop', { configurable: true, value: 120 })

    flick(surface, { x: 40, y: 100 }, { x: 40, y: 220 })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('ignores a flick through an open listbox, which is portaled elsewhere', async () => {
    const { onOpenChange, panel } = drawer()

    await userEvent.click(screen.getByRole('combobox', { name: 'Finish' }))
    const listbox = screen.getByRole('listbox')
    expect(panel.contains(listbox)).toBe(false)

    // React bubbles the portaled popup's events back through the drawer, so this
    // is the flick that used to close the sheet mid-selection.
    flick(listbox, { x: 40, y: 100 }, { x: 40, y: 220 })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('still closes a side panel flicked towards its own edge', () => {
    const { onOpenChange, panel } = drawer({ side: 'right' })
    flick(panel, { x: 100, y: 40 }, { x: 260, y: 40 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the caller own pointer handlers', () => {
    const onPointerDown = vi.fn()
    const { onOpenChange, panel } = drawer({ onPointerDown })
    flick(panel, { x: 40, y: 100 }, { x: 40, y: 220 })
    expect(onPointerDown).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('select open state', () => {
  it('reports the popup opening and closing', async () => {
    const onOpenChange = vi.fn()
    ui(<LiquidSelect label="Finish" onOpenChange={onOpenChange} options={options} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Finish' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(true)

    await userEvent.click(screen.getByRole('option', { name: 'Regular' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})
