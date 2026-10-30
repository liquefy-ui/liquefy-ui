// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassMergeShape } from '@liquefy-ui/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidMorph, type LiquidMorphProps } from '../src/liquid-morph'

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

const Glyph = () => <svg aria-hidden="true" />

/** `motion={false}` lands every morph at once, so these read behaviour, not timing. */
const mount = (node: Parameters<typeof render>[0], motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

const focused = () => document.activeElement

// Waits on real frames, which a loaded CI runner hands out slowly; the morph
// counts at most 1/30 s a frame however long the frame took.
const RETURN_BUDGET = 15_000

/** A search button: a field first, then a field with results under it, sharing one input. */
const Search = (props: Partial<LiquidMorphProps>) => (
  <LiquidMorph
    label="Search"
    stages={{ field: { height: 48, width: 300 }, results: { height: 260, width: 300 } }}
    trigger={<Glyph />}
    {...props}
  >
    {({ setStage, stage }) => (
      <div>
        <input aria-label="Query" onChange={(event) => setStage(event.target.value ? 'results' : 'field')} />
        {stage === 'results' && <ul aria-label="Results"><li>Fjord trail maps</li></ul>}
      </div>
    )}
  </LiquidMorph>
)

afterEach(() => {
  document.body.innerHTML = ''
  glass.frames = []
})

describe('LiquidMorph', () => {
  it('renders only the trigger on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <Search />
      </LiquefyProvider>,
    )
    expect(markup).toContain('aria-label="Search"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toContain('Query')
  })

  it('grows out of the trigger into its first stage and moves focus inside', async () => {
    const user = userEvent.setup()
    mount(<Search />)
    const trigger = screen.getByRole('button', { name: 'Search' })
    expect(lastShape()).toMatchObject({ height: 46, radius: 23, width: 46 })

    await user.click(trigger)
    const panel = await screen.findByRole('dialog', { name: 'Search' })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await waitFor(() => expect(focused()).toBe(within(panel).getByRole('textbox', { name: 'Query' })))
    expect(lastShape()).toMatchObject({ height: 48, radius: 24, width: 300 })
  })

  it('moves between stages without losing the field or its focus', async () => {
    const user = userEvent.setup()
    const stages: string[] = []
    mount(<Search onStageChange={(stage) => stages.push(stage)} />)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    const field = await screen.findByRole('textbox', { name: 'Query' })
    await waitFor(() => expect(focused()).toBe(field))

    await user.keyboard('fj')
    expect(await screen.findByRole('list', { name: 'Results' })).toBeTruthy()
    // The same input, still focused, still holding what was typed.
    expect(screen.getByRole('textbox', { name: 'Query' })).toBe(field)
    expect(focused()).toBe(field)
    expect((field as HTMLInputElement).value).toBe('fj')
    expect(lastShape()).toMatchObject({ height: 260, width: 300 })
    expect(stages).toEqual(['field', 'results'])
  })

  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup()
    mount(<Search />)
    const trigger = screen.getByRole('button', { name: 'Search' })
    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(focused()).toBe(trigger)
    expect(lastShape()).toMatchObject({ height: 46, width: 46 })
  })

  it('closes on a press outside', async () => {
    const user = userEvent.setup()
    mount(
      <>
        <button type="button">Elsewhere</button>
        <Search />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes from inside, through the controls the content is handed', async () => {
    const user = userEvent.setup()
    mount(
      <LiquidMorph label="Compose" stages={{ form: { height: 200, width: 280 } }} trigger={<Glyph />}>
        {({ close }) => <button onClick={close} type="button">Cancel</button>}
      </LiquidMorph>,
    )
    const trigger = screen.getByRole('button', { name: 'Compose' })
    await user.click(trigger)
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(focused()).toBe(trigger)
  })

  it('crosses over to a stage with content of its own and takes focus into it', async () => {
    const user = userEvent.setup()
    mount(
      <LiquidMorph
        label="Play"
        stages={{
          mini: { content: ({ setStage }) => <button onClick={() => setStage('full')} type="button">Expand</button>, height: 56, width: 220 },
          full: { content: <button type="button">Shuffle</button>, height: 300, label: 'Player', width: 300 },
        }}
        trigger={<Glyph />}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Play' }))
    await user.click(await screen.findByRole('button', { name: 'Expand' }))

    const player = await screen.findByRole('dialog', { name: 'Player' })
    expect(focused()).toBe(within(player).getByRole('button', { name: 'Shuffle' }))
    // The stage it left is gone once the glass is at rest.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Expand', hidden: true })).toBeNull())
    expect(lastShape()).toMatchObject({ height: 300, width: 300 })
  })

  it('follows a controlled stage both ways without reporting it back', async () => {
    const changes: string[] = []
    const morph = (stage: string) => (
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <Search onStageChange={(next) => changes.push(next)} stage={stage} />
      </LiquefyProvider>
    )
    const { rerender } = render(morph('closed'))
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(morph('results'))
    await screen.findByRole('list', { name: 'Results' })
    expect(lastShape()).toMatchObject({ height: 260, width: 300 })
    rerender(morph('closed'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(changes).toEqual([])
  })

  it('asks a controlled caller before opening and closing', async () => {
    const user = userEvent.setup()
    const changes: string[] = []
    const Harness = () => {
      const [stage, setStage] = useState('closed')
      return (
        <Search
          onStageChange={(next) => {
            changes.push(next)
            setStage(next)
          }}
          stage={stage}
        />
      )
    }
    mount(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(changes).toEqual(['field', 'closed'])
  })

  it('stays shut when a controlled caller declines to open it', async () => {
    const user = userEvent.setup()
    mount(<Search stage="closed" />)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens to the stage it is told to', async () => {
    const user = userEvent.setup()
    mount(<Search openTo="results" />)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('list', { name: 'Results' })).toBeTruthy()
  })

  it('keeps the panel up until the glass is back in the trigger', async () => {
    const user = userEvent.setup()
    mount(<Search />, true)
    const trigger = screen.getByRole('button', { name: 'Search' })
    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    // Closed as far as assistive technology is concerned, still on screen
    // while the glass shrinks back.
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
    expect(focused()).toBe(trigger)
  }, RETURN_BUDGET + 5_000)

  // Content fading out with the glass is still the content it was: a list
  // that emptied itself for 'closed' would vanish before the glass got home.
  it('keeps the stage it was showing while the panel shrinks away', async () => {
    const user = userEvent.setup()
    mount(<Search />, true)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('dialog')
    await user.keyboard('fj')
    await screen.findByRole('list', { name: 'Results' })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('list', { hidden: true, name: 'Results' })).not.toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull(), { timeout: RETURN_BUDGET })
  }, RETURN_BUDGET + 5_000)

  it('lays the panel over the trigger, beside its glass', async () => {
    const user = userEvent.setup()
    const { container } = mount(<Search />)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    const panel = await screen.findByRole('dialog')
    const root = container.querySelector('.lq-liquid-morph')!
    expect(root.contains(panel)).toBe(true)
    expect(root.contains(root.querySelector('.lq-glass-merge__surface'))).toBe(true)
  })

  it('keeps the glass out from under anything that would hide the page from it', () => {
    const { container } = mount(<Search defaultStage="field" />)
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

  it('takes a box of its own for a trigger that is not an icon', () => {
    mount(<Search size={{ height: 64, radius: 16, width: 96 }} />)
    expect(lastShape()).toMatchObject({ height: 64, radius: 16, width: 96 })
    const trigger = screen.getByRole('button', { name: 'Search' })
    expect(trigger.style.width).toBe('96px')
  })
})
