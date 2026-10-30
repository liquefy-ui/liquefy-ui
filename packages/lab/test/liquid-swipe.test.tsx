// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidSwipe, type LiquidSwipeProps } from '../src/liquid-swipe'

// jsdom lays nothing out, so the carousel's room falls back to the window: 1024 × 768.
const WIDTH = 1024

/** `motion={false}` turns pages at once, so these read behaviour, not timing. */
const mount = (node: ReactNode, motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const Swipe = (props: Partial<LiquidSwipeProps>) => (
  <LiquidSwipe label="Getting started" {...props}>
    <section style={{ background: '#1d5c58' }}>
      <h3>Offline maps</h3>
      <button type="button">Download</button>
    </section>
    <section style={{ background: '#e6c27a' }}>
      <h3>Weather</h3>
      <input aria-label="Home town" />
    </section>
    <section style={{ background: '#241c0e' }}>
      <h3>Safety</h3>
    </section>
  </LiquidSwipe>
)

const carousel = () => screen.getByRole('region')
const slides = () => within(carousel()).getAllByRole('group', { hidden: true })
const slide = (index: number) => slides()[index]!
const isInert = (element: Element) => element.hasAttribute('inert')
/** The slide that is not inert: the one showing. */
const showing = () => slides().findIndex((element) => !isInert(element))

/** A pointer event at a point and moment, as a finger or a mouse sends it. */
const pointer = (
  element: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientX: number,
  clientY: number,
  timeStamp: number,
  pointerType = 'touch',
) => {
  const event = new PointerEvent(type, { bubbles: true, button: 0, cancelable: true, clientX, clientY, pointerId: 1, pointerType })
  Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  fireEvent(element, event)
}

/** Drags from `from` to `to` (screen x) at height `y` over `ms` milliseconds in 8ms steps, then lets go. */
const drag = (element: Element, from: number, to: number, ms: number, { pointerType = 'touch', toY = 300, y = 300 } = {}) => {
  pointer(element, 'pointerdown', from, y, 0, pointerType)
  const steps = Math.max(1, Math.round(ms / 8))
  for (let step = 1; step <= steps; step += 1) {
    pointer(element, 'pointermove', from + ((to - from) * step) / steps, y + ((toY - y) * step) / steps, step * 8, pointerType)
  }
  pointer(element, 'pointerup', to, toY, steps * 8, pointerType)
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('LiquidSwipe', () => {
  it('renders a carousel of labelled slides on the server, with only the first reachable', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <Swipe />
      </LiquefyProvider>,
    )
    expect(markup).toContain('aria-roledescription="carousel"')
    expect(markup).toContain('aria-label="Getting started"')
    expect(markup.match(/aria-roledescription="slide"/g)).toHaveLength(3)
    expect(markup).toContain('aria-label="1 of 3"')
    expect(markup).toContain('aria-label="3 of 3"')
    expect(markup.match(/inert=""/g)).toHaveLength(2)
    expect(markup).toContain('aria-label="Next page"')
    expect(markup).toContain('aria-label="Previous page"')
  })

  it('is a region of slides named "n of total", in a polite live region', () => {
    mount(<Swipe />)
    expect(screen.getByRole('region', { name: 'Getting started' }).getAttribute('aria-roledescription')).toBe('carousel')
    expect(slides().map((element) => element.getAttribute('aria-label'))).toEqual(['1 of 3', '2 of 3', '3 of 3'])
    for (const element of slides()) expect(element.getAttribute('aria-roledescription')).toBe('slide')
    expect(slide(0).parentElement!.getAttribute('aria-live')).toBe('polite')
    expect(showing()).toBe(0)
    expect(isInert(slide(1))).toBe(true)
    expect(isInert(slide(2))).toBe(true)
  })

  it('names its slides with pageLabel and its buttons with their labels', () => {
    mount(<Swipe nextLabel="Weiter" pageLabel={(index, count) => `Seite ${index + 1} von ${count}`} previousLabel="Zurück" />)
    expect(slide(1).getAttribute('aria-label')).toBe('Seite 2 von 3')
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeTruthy()
  })

  it('turns with the next and previous buttons, which go dim at the ends', async () => {
    const user = userEvent.setup()
    const seen: number[] = []
    mount(<Swipe onIndexChange={(index) => seen.push(index)} />)
    const next = screen.getByRole('button', { name: 'Next page' })
    const previous = screen.getByRole('button', { name: 'Previous page' })
    expect(previous.hasAttribute('disabled') || previous.getAttribute('aria-disabled') === 'true').toBe(true)

    await user.click(next)
    expect(showing()).toBe(1)
    await user.click(next)
    expect(showing()).toBe(2)
    expect(next.hasAttribute('disabled') || next.getAttribute('aria-disabled') === 'true').toBe(true)
    await user.click(previous)
    expect(showing()).toBe(1)
    expect(seen).toEqual([1, 2, 1])
  })

  it('turns with the arrow keys, but not from a field that wants them', async () => {
    const user = userEvent.setup()
    mount(<Swipe />)
    screen.getByRole('button', { name: 'Download' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(showing()).toBe(1)

    const field = screen.getByRole('textbox', { name: 'Home town' })
    await user.click(field)
    await user.keyboard('{ArrowRight}{ArrowLeft}')
    expect(showing()).toBe(1)

    screen.getByRole('button', { name: 'Next page' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(showing()).toBe(0)
    await user.keyboard('{ArrowLeft}')
    expect(showing()).toBe(0)
  })

  it('leaves arrow keys with a modifier alone', async () => {
    const user = userEvent.setup()
    mount(<Swipe />)
    screen.getByRole('button', { name: 'Next page' }).focus()
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')
    expect(showing()).toBe(0)
  })

  it('goes round the ends when it loops', async () => {
    const user = userEvent.setup()
    mount(<Swipe loop />)
    const previous = screen.getByRole('button', { name: 'Previous page' })
    expect(previous.hasAttribute('disabled')).toBe(false)
    await user.click(previous)
    expect(showing()).toBe(2)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(showing()).toBe(0)
  })

  it('starts on defaultIndex', () => {
    mount(<Swipe defaultIndex={2} />)
    expect(showing()).toBe(2)
  })

  it('follows a controlled index, and stays put when the caller keeps it', async () => {
    const Controlled = () => {
      const [index, setIndex] = useState(0)
      return (
        <>
          <button onClick={() => setIndex(2)} type="button">Skip</button>
          <Swipe index={index} onIndexChange={setIndex} />
        </>
      )
    }
    const user = userEvent.setup()
    mount(<Controlled />)
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(showing()).toBe(2)

    cleanup()
    const onIndexChange = vi.fn()
    mount(<Swipe index={0} onIndexChange={onIndexChange} />)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
    expect(showing()).toBe(0)
  })

  it('keeps a page that holds focus reachable, and hands focus to the page that comes in', async () => {
    const user = userEvent.setup()
    mount(<Swipe />, true)
    const download = screen.getByRole('button', { name: 'Download' })
    download.focus()
    await user.keyboard('{ArrowRight}')
    // The new page is the one to read; the old one still holds focus, so it is not inert yet.
    expect(isInert(slide(1))).toBe(false)
    expect(isInert(slide(0))).toBe(false)
    expect(document.activeElement).toBe(download)
    await waitFor(() => expect(document.activeElement).toBe(slide(1)), { timeout: 10_000 })
    expect(isInert(slide(0))).toBe(true)
  })

  it('leaves focus on the next button that turned the page', async () => {
    const user = userEvent.setup()
    mount(<Swipe />)
    const next = screen.getByRole('button', { name: 'Next page' })
    await user.click(next)
    expect(document.activeElement).toBe(next)
  })

  describe('swiping', () => {
    it('turns to the next page when dragged left past the threshold, and back when dragged right', () => {
      const seen: number[] = []
      mount(<Swipe onIndexChange={(index) => seen.push(index)} />)
      drag(slide(0), 900, 900 - WIDTH * 0.4, 600)
      expect(showing()).toBe(1)
      drag(slide(1), 100, 100 + WIDTH * 0.4, 600)
      expect(showing()).toBe(0)
      expect(seen).toEqual([1, 0])
    })

    it('springs back when let go short of the threshold', () => {
      const onIndexChange = vi.fn()
      mount(<Swipe onIndexChange={onIndexChange} />)
      drag(slide(0), 900, 900 - WIDTH * 0.15, 900)
      expect(showing()).toBe(0)
      expect(onIndexChange).not.toHaveBeenCalled()
    })

    it('turns on a flick however short', () => {
      mount(<Swipe />)
      drag(slide(0), 600, 540, 48)
      expect(showing()).toBe(1)
    })

    it('swipes with a mouse as well as a finger', () => {
      mount(<Swipe />)
      drag(slide(0), 900, 900 - WIDTH * 0.45, 600, { pointerType: 'mouse' })
      expect(showing()).toBe(1)
    })

    it('leaves a move that is mostly up or down to scrolling', () => {
      mount(<Swipe />)
      expect(carousel().style.touchAction).toBe('pan-y pinch-zoom')
      drag(slide(0), 600, 400, 300, { toY: 700 })
      expect(showing()).toBe(0)
    })

    it('does nothing toward a side with no page', () => {
      mount(<Swipe />)
      drag(slide(0), 100, 100 + WIDTH * 0.5, 600)
      expect(showing()).toBe(0)
    })

    it('does not start in a field, so its text can still be selected', () => {
      mount(<Swipe defaultIndex={1} />)
      drag(screen.getByRole('textbox', { name: 'Home town' }), 900, 900 - WIDTH * 0.5, 600)
      expect(showing()).toBe(1)
    })

    it('does not count the end of a swipe as a press on what it ended over', () => {
      const onClick = vi.fn()
      mount(
        <LiquidSwipe label="Getting started">
          <button onClick={onClick} type="button">First</button>
          <button type="button">Second</button>
        </LiquidSwipe>,
      )
      const first = screen.getByRole('button', { name: 'First' })
      drag(first, 900, 900 - WIDTH * 0.15, 900)
      fireEvent.click(first)
      expect(onClick).not.toHaveBeenCalled()
      fireEvent.click(first)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('draws the bulge at the finger’s height as it comes in', () => {
      mount(<Swipe />)
      const target = slide(0)
      pointer(target, 'pointerdown', 900, 300, 0)
      pointer(target, 'pointermove', 800, 220, 16)
      pointer(target, 'pointermove', 700, 200, 32)
      const clip = slide(1).style.clipPath
      expect(clip.startsWith('path(')).toBe(true)
      // The tip of the bulge sits at the finger's height.
      expect(clip).toMatch(/ 200\.00 C/)
      pointer(target, 'pointerup', 700, 200, 48)
    })
  })

  describe('drawing', () => {
    it('shows the neighbours’ handles as bulges on the edges, and the page showing whole', () => {
      mount(<Swipe defaultIndex={1} />)
      expect(slide(1).style.clipPath).toBe('none')
      expect(slide(1).style.zIndex).toBe('1')
      for (const index of [0, 2]) {
        expect(slide(index).style.clipPath.startsWith('path(')).toBe(true)
        expect(slide(index).style.visibility).toBe('visible')
      }
      // The previous page peeks in from the left edge, the next from the right.
      expect(slide(0).style.clipPath).toMatch(/^path\('M-1\.00/)
      expect(slide(2).style.clipPath).toMatch(new RegExp(`^path\\('M${WIDTH + 1}\\.00`))
    })

    it('shows one page on both sides when two pages loop', () => {
      mount(
        <LiquidSwipe label="Two" loop>
          <p>One</p>
          <p>Two</p>
        </LiquidSwipe>,
      )
      expect(slide(1).style.clipPath.match(/M/g)).toHaveLength(2)
    })

    it('hides the pages that are neither showing nor peeking', () => {
      mount(
        <LiquidSwipe label="Many">
          {['a', 'b', 'c', 'd', 'e'].map((name) => <p key={name}>{name}</p>)}
        </LiquidSwipe>,
      )
      expect(slide(2).style.visibility).toBe('hidden')
      expect(slide(4).style.visibility).toBe('hidden')
    })

    it('brings a page in on a wave and then lets it cover the room, with motion on', async () => {
      const user = userEvent.setup()
      mount(<Swipe />, true)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      // On its way the new page is cut out by its wave, over the old one.
      await waitFor(() => expect(Number(slide(1).style.zIndex)).toBeGreaterThan(1))
      expect(slide(1).style.clipPath.startsWith('path(')).toBe(true)
      await waitFor(() => expect(slide(1).style.clipPath).toBe('none'), { timeout: 10_000 })
      // The page it covered pops back in as the handle on the left.
      await waitFor(() => expect(slide(0).style.clipPath.startsWith('path(')).toBe(true))
      expect(slide(0).style.zIndex).toBe('2')
    })

    it('lands a page on its way at once when motion is switched off', async () => {
      const user = userEvent.setup()
      const view = mount(<Swipe />, true)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await waitFor(() => expect(Number(slide(1).style.zIndex)).toBeGreaterThan(1))
      view.rerender(<LiquefyProvider motion={false} theme="dark" webgl={false}><Swipe /></LiquefyProvider>)
      // A few frames on, nothing of the old motion is still drawing.
      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(slide(1).style.clipPath).toBe('none')
      expect(slide(1).style.zIndex).toBe('1')
      expect(slide(0).style.clipPath.startsWith('path(')).toBe(true)
    })

    it('has no handles and no buttons with one page', () => {
      mount(
        <LiquidSwipe label="Alone">
          <p>Only</p>
        </LiquidSwipe>,
      )
      expect(screen.queryByRole('button')).toBeNull()
      expect(slide(0).style.clipPath).toBe('none')
    })
  })
})
