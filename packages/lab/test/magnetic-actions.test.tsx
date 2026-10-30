// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassMergeOptions, GlassMergeShape } from '@liquefy-ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MagneticActions, type MagneticAction } from '../src/magnetic-actions'

// Every frame's shapes, as the glass surface is handed them, and the options
// each surface was built with.
const glass = vi.hoisted(() => ({ frames: [] as GlassMergeShape[][], options: [] as (GlassMergeOptions | undefined)[] }))
vi.mock('@liquefy-ui/core', async (importOriginal) => {
  const core = await importOriginal<typeof import('@liquefy-ui/core')>()
  return {
    ...core,
    attachGlassMerge: (...args: Parameters<typeof core.attachGlassMerge>) => {
      glass.options.push(args[1])
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

const actions = (clicked: string[] = []): MagneticAction[] => [
  { icon: <Glyph />, label: 'Favourite', onClick: () => clicked.push('Favourite') },
  { icon: <Glyph />, label: 'Share', onClick: () => clicked.push('Share') },
  { icon: <Glyph />, label: 'Save', onClick: () => clicked.push('Save') },
]

const mount = (node: Parameters<typeof render>[0], motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const focused = () => document.activeElement

// jsdom lays nothing out, so the row's top-left is the page's origin and a
// pointer's client position is its position in the row. Three 46px buttons 14px
// apart rest with their centres at x = 23, 83 and 143, on y = 23.
const mouse = (clientX: number, clientY: number) => ({ clientX, clientY, isPrimary: true, pointerId: 1, pointerType: 'mouse' })

/** The middle button's glass, in the row's pixels: the surface starts left of and above it. */
const middle = () => {
  const frame = lastFrame()
  const [first, second] = frame
  return first && second ? { ...second, offset: second.x - first.x } : null
}

// The tests that wait for motion wait for real frames, which a loaded CI runner
// hands out slowly.
const MOTION_BUDGET = 15_000

afterEach(() => {
  // Unmounted, not only removed: a row left mounted still hears the window's
  // pointer and would draw into the next test's frames.
  cleanup()
  document.body.innerHTML = ''
  glass.frames = []
  glass.options = []
})

describe('MagneticActions', () => {
  it('renders a named toolbar of named buttons on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <MagneticActions actions={actions()} label="Photo" />
      </LiquefyProvider>,
    )
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Photo"')
    for (const label of ['Favourite', 'Share', 'Save']) expect(markup).toContain(`aria-label="${label}"`)
    expect(markup).toContain('class="lq-glass-merge__surface"')
    // At rest: no button is moved until a pointer comes near.
    expect(markup).not.toMatch(/<button[^>]*[;"]transform:/)
  })

  it('is a row of real buttons that click', async () => {
    const user = userEvent.setup()
    const clicked: string[] = []
    mount(<MagneticActions actions={actions(clicked)} label="Photo" />)

    const toolbar = screen.getByRole('toolbar', { name: 'Photo' })
    expect(toolbar.getAttribute('aria-orientation')).toBe('horizontal')
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((button) => button.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON'])
    expect(buttons.map((button) => button.getAttribute('title'))).toEqual(['Favourite', 'Share', 'Save'])

    await user.click(screen.getByRole('button', { name: 'Share' }))
    expect(clicked).toEqual(['Share'])
  })

  it('is one tab stop, walked with the arrow keys, and pressed with Enter or Space', async () => {
    const user = userEvent.setup()
    const clicked: string[] = []
    mount(
      <>
        <MagneticActions actions={actions(clicked)} label="Photo" />
        <button type="button">After</button>
      </>,
    )

    await user.tab()
    expect(focused()).toBe(screen.getByRole('button', { name: 'Favourite' }))
    await user.keyboard('{ArrowRight}')
    expect(focused()).toBe(screen.getByRole('button', { name: 'Share' }))
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowRight} ')
    expect(clicked).toEqual(['Share', 'Save'])
    // Round from the end to the start, as Base UI's toolbar loops.
    await user.keyboard('{ArrowRight}')
    expect(focused()).toBe(screen.getByRole('button', { name: 'Favourite' }))
    await user.keyboard('{ArrowLeft}')
    expect(focused()).toBe(screen.getByRole('button', { name: 'Save' }))

    await user.tab()
    expect(focused()).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('walks a column with up and down', async () => {
    const user = userEvent.setup()
    mount(<MagneticActions actions={actions()} label="Photo" orientation="vertical" />)
    expect(screen.getByRole('toolbar').getAttribute('aria-orientation')).toBe('vertical')

    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(focused()).toBe(screen.getByRole('button', { name: 'Share' }))
    await user.keyboard('{ArrowUp}')
    expect(focused()).toBe(screen.getByRole('button', { name: 'Favourite' }))
  })

  // A toolbar keeps a disabled item reachable, so a screen reader user learns
  // it exists; it just does nothing when pressed.
  it('reaches a disabled action but does not act on it', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    mount(
      <MagneticActions
        actions={[
          { icon: <Glyph />, label: 'Favourite' },
          { disabled: true, icon: <Glyph />, label: 'Share', onClick },
        ]}
        label="Photo"
      />,
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    const share = screen.getByRole('button', { name: 'Share' })
    expect(focused()).toBe(share)
    expect(share.getAttribute('aria-disabled')).toBe('true')
    await user.keyboard('{Enter}')
    await user.click(share)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('draws one surface, a circle under each button, apart at rest', () => {
    mount(<MagneticActions actions={actions()} label="Photo" />, true)
    const frame = lastFrame()
    expect(frame).toHaveLength(3)
    expect(frame.map((shape) => [shape.width, shape.height, shape.radius])).toEqual([[46, 46, 23], [46, 46, 23], [46, 46, 23]])
    expect(frame.map((shape) => shape.x - frame[0]!.x)).toEqual([0, 60, 120])
    expect(glass.options.at(-1)?.spacing).toBe(12)
  })

  it('lays the glass down a column when vertical, at the size asked for', () => {
    mount(<MagneticActions actions={actions()} gap={10} label="Photo" orientation="vertical" size="sm" />)
    const frame = lastFrame()
    expect(frame.map((shape) => shape.x - frame[0]!.x)).toEqual([0, 0, 0])
    expect(frame.map((shape) => shape.y - frame[0]!.y)).toEqual([0, 46, 92])
    expect(frame[0]!.width).toBe(36)
  })

  it('moves nothing when a button takes focus from the keyboard', async () => {
    const user = userEvent.setup()
    mount(<MagneticActions actions={actions()} label="Photo" />, true)
    const atRest = JSON.stringify(lastFrame())
    await user.tab()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(JSON.stringify(lastFrame())).toBe(atRest)
    for (const button of screen.getAllByRole('button')) expect(button.style.transform).toBe('')
  })

  describe('with motion', () => {
    it('draws the nearest button toward a pointer coming near, and lets it spring home', async () => {
      mount(<MagneticActions actions={actions()} label="Photo" />, true)
      const restY = middle()!.y

      fireEvent.pointerMove(window, mouse(83, -30))
      await waitFor(() => expect(middle()!.y).toBeLessThan(restY - 4), { timeout: MOTION_BUDGET })
      const share = screen.getByRole('button', { name: 'Share' })
      expect(share.style.transform).toMatch(/translate\(/)
      // Its neighbours lean in toward it, closing the gap.
      const [first, second, third] = lastFrame()
      expect(second!.x - first!.x).toBeLessThan(60)
      expect(third!.x - second!.x).toBeLessThan(60)

      fireEvent.pointerMove(window, mouse(83, -400))
      await waitFor(() => expect(middle()!.y).toBeCloseTo(restY, 1), { timeout: MOTION_BUDGET })
      await waitFor(() => expect(share.style.transform).toBe(''), { timeout: MOTION_BUDGET })
    })

    it('lets every button go when the cursor leaves the window', async () => {
      mount(<MagneticActions actions={actions()} label="Photo" />, true)
      const restY = middle()!.y
      fireEvent.pointerMove(window, mouse(83, -30))
      await waitFor(() => expect(middle()!.y).toBeLessThan(restY - 4), { timeout: MOTION_BUDGET })
      fireEvent.pointerOut(window, { relatedTarget: null })
      await waitFor(() => expect(middle()!.y).toBeCloseTo(restY, 1), { timeout: MOTION_BUDGET })
    })

    it('leaves a disabled action where it rests', async () => {
      mount(
        <MagneticActions
          actions={[
            { icon: <Glyph />, label: 'Favourite' },
            { disabled: true, icon: <Glyph />, label: 'Share' },
            { icon: <Glyph />, label: 'Save' },
          ]}
          label="Photo"
        />,
        true,
      )
      const atRest = middle()!
      fireEvent.pointerMove(window, mouse(83, -30))
      // The ends lean toward the pointer over the disabled middle; it stays put.
      await waitFor(() => expect(lastFrame()[0]!.y).toBeLessThan(atRest.y - 1), { timeout: MOTION_BUDGET })
      expect(middle()!.y).toBe(atRest.y)
      fireEvent.pointerMove(window, mouse(83, -400))
    })

    it('squashes a pressed button wider and flatter, and lets it back to round', async () => {
      mount(<MagneticActions actions={actions()} label="Photo" />, true)
      const save = screen.getByRole('button', { name: 'Save' })
      fireEvent.pointerDown(save, { ...mouse(143, 23), button: 0 })
      await waitFor(() => {
        const shape = lastFrame()[2]!
        expect(shape.width).toBeGreaterThan(47)
        expect(shape.height).toBeLessThan(45)
      }, { timeout: MOTION_BUDGET })
      expect(lastFrame()[0]!.width).toBe(46)

      fireEvent.pointerUp(window, mouse(143, 23))
      await waitFor(() => expect(lastFrame()[2]!).toMatchObject({ height: 46, width: 46 }), { timeout: MOTION_BUDGET })
    })
  })

  describe('with motion off', () => {
    it('is a plain row of buttons: nothing pulled, squashed or melted', async () => {
      const clicked: string[] = []
      mount(<MagneticActions actions={actions(clicked)} label="Photo" spacing={30} />)
      const atRest = JSON.stringify(lastFrame())
      // Asked to bridge more than the gap they rest at, the glass still keeps them apart.
      expect(glass.options.at(-1)?.spacing).toBeLessThan(14)

      fireEvent.pointerMove(window, mouse(83, -30))
      const save = screen.getByRole('button', { name: 'Save' })
      fireEvent.pointerDown(save, { ...mouse(143, 23), button: 0 })
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(JSON.stringify(lastFrame())).toBe(atRest)
      for (const button of screen.getAllByRole('button')) expect(button.style.transform).toBe('')
      fireEvent.pointerUp(window, mouse(143, 23))
      fireEvent.click(save)
      expect(clicked).toEqual(['Save'])
    })
  })
})
