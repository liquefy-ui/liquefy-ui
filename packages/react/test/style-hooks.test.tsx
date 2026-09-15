// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LiquidButton } from '../src/liquid-button'
import { LiquidCheckbox } from '../src/liquid-checkbox'
import { LiquidDivider } from '../src/liquid-divider'
import { LiquidProgress } from '../src/liquid-progress'
import { LiquidRadio, LiquidRadioGroup } from '../src/liquid-radio'
import { LiquidSegmented } from '../src/liquid-segmented'
import { LiquidSlider } from '../src/liquid-slider'
import { LiquidSwitch } from '../src/liquid-switch'
import { LiquefyProvider } from '../src/provider'

/**
 * The stylesheet paints these components off data attributes that Base UI —
 * not this library — decides to emit. Nothing fails loudly when one of those
 * names changes upstream: the component still renders, still works, and simply
 * loses its fill, its tick or its motion. Each case below pins one attribute a
 * rule in `styles.css` selects on, so a rename lands here rather than in a
 * screenshot somebody takes three releases later. The other half of each pair —
 * that the rule is still in the stylesheet at all — is in `stylesheet.test.mjs`.
 */

const ui = (node: Parameters<typeof render>[0]) =>
  render(<LiquefyProvider motion={false} webgl={false}>{node}</LiquefyProvider>)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('the attributes the stylesheet paints on', () => {
  it('marks a checked switch', () => {
    ui(<LiquidSwitch defaultChecked label="Reduce motion" />)
    expect(screen.getByRole('switch').hasAttribute('data-checked')).toBe(true)
  })

  it('marks an unchecked switch, which drives the thumb sliding back', () => {
    ui(<LiquidSwitch label="Reduce motion" />)
    expect(screen.getByRole('switch').hasAttribute('data-unchecked')).toBe(true)
  })

  it('marks an indeterminate checkbox separately from a checked one', () => {
    ui(<LiquidCheckbox indeterminate label="Select all" />)

    const box = screen.getByRole('checkbox')
    expect(box.hasAttribute('data-indeterminate')).toBe(true)
    expect(box.hasAttribute('data-checked')).toBe(false)
  })

  it('marks the selected radio, which is what tints its ring and grows its dot', () => {
    ui(
      <LiquidRadioGroup defaultValue="jelly" label="Motion">
        <LiquidRadio label="Jelly" value="jelly" />
        <LiquidRadio label="Instant" value="instant" />
      </LiquidRadioGroup>,
    )
    expect(screen.getAllByRole('radio')[0]?.hasAttribute('data-checked')).toBe(true)
  })

  it('marks the pressed segment', () => {
    ui(<LiquidSegmented label="Size" options={[{ label: 'S', value: 'sm' }]} value="sm" />)
    expect(screen.getAllByRole('button')[0]?.hasAttribute('data-pressed')).toBe(true)
  })

  // The indeterminate bar is a fixed-width slug that slides; the determinate one
  // is sized inline from the value. Losing the attribute leaves a bar that sits
  // at zero width forever, which reads as "nothing is happening".
  it('marks an indeterminate progress fill', () => {
    const { container } = ui(<LiquidProgress label="Preparing shaders" />)
    expect(container.querySelector('.lq-progress__fill')?.hasAttribute('data-indeterminate')).toBe(true)
  })

  it('sizes a determinate progress fill inline, from the value', () => {
    const { container } = ui(<LiquidProgress label="Uploading" value={40} />)
    const fill = container.querySelector<HTMLElement>('.lq-progress__fill')
    expect(fill?.style.width).toBe('40%')
    expect(fill?.hasAttribute('data-indeterminate')).toBe(false)
  })

  it('marks a disabled slider, which is the only thing that dims its track', () => {
    const { container } = ui(<LiquidSlider defaultValue={30} disabled label="Depth" />)
    expect(container.querySelector('.lq-slider__control')?.hasAttribute('data-disabled')).toBe(true)
  })

  it('marks a divider that carries a label, which suppresses the second rule', () => {
    const { container } = ui(<LiquidDivider>Or</LiquidDivider>)
    expect(container.querySelector('.lq-divider')?.hasAttribute('data-with-label')).toBe(true)
  })

  it('leaves the attribute off a divider with no label', () => {
    const { container } = ui(<LiquidDivider />)
    expect(container.querySelector('.lq-divider')?.hasAttribute('data-with-label')).toBe(false)
  })

  // A loading button stays focusable, so it is disabled by attribute rather than
  // by the `disabled` property, and `:disabled` no longer matches it.
  it('marks a disabled button, whether or not it is still focusable', () => {
    ui(<LiquidButton disabled>Save</LiquidButton>)
    expect(screen.getByRole('button').hasAttribute('data-disabled')).toBe(true)
  })

  it('keeps a loading button focusable and still marked disabled', () => {
    ui(<LiquidButton isLoading>Save</LiquidButton>)

    const button = screen.getByRole('button')
    expect(button.hasAttribute('data-disabled')).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    // The point of the whole arrangement: the keyboard is not thrown back to the
    // top of the document at the moment the user is waiting to hear what happened.
    button.focus()
    expect(document.activeElement).toBe(button)
  })
})
