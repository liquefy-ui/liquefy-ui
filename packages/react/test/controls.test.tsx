// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiquidCheckbox } from '../src/liquid-checkbox'
import { LiquidChip } from '../src/liquid-chip'
import { LiquidIconButton } from '../src/liquid-icon-button'
import { LiquidPagination } from '../src/liquid-pagination'
import { LiquidProgress, LiquidSpinner } from '../src/liquid-progress'
import { LiquidRadio, LiquidRadioGroup } from '../src/liquid-radio'
import { LiquidRating } from '../src/liquid-rating'
import { LiquidSegmented } from '../src/liquid-segmented'
import { LiquidSlider } from '../src/liquid-slider'
import { LiquidSwitch } from '../src/liquid-switch'
import { LiquidTextField } from '../src/liquid-text-field'
import { LiquidToastProvider, useLiquidToast } from '../src/liquid-toast'
import { LiquidTooltip } from '../src/liquid-tooltip'
import { LiquefyProvider } from '../src/provider'

/**
 * The behaviour a consumer is entitled to rely on, for the controls the keyboard
 * suite does not already cover: the role and the state an assistive technology
 * reads, the accessible name, controlled versus uncontrolled state, and a
 * disabled control staying inert. All of it is documented, so all of it is a
 * contract rather than an implementation detail.
 */

const ui = (node: React.ReactNode) => render(
  <LiquefyProvider motion={false} theme="light" webgl={false}>{node}</LiquefyProvider>,
)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('switch', () => {
  it('is a switch with a name and a state', () => {
    ui(<LiquidSwitch defaultChecked label="Refraction" />)
    const control = screen.getByRole('switch', { name: 'Refraction' })
    expect(control.getAttribute('aria-checked')).toBe('true')
  })

  it('toggles itself when uncontrolled', async () => {
    ui(<LiquidSwitch label="Refraction" />)
    const control = screen.getByRole('switch')
    await userEvent.click(control)
    expect(control.getAttribute('aria-checked')).toBe('true')
  })

  it('waits for the owner when controlled', async () => {
    const onCheckedChange = vi.fn()
    ui(<LiquidSwitch checked={false} label="Refraction" onCheckedChange={onCheckedChange} />)
    const control = screen.getByRole('switch')
    await userEvent.click(control)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(control.getAttribute('aria-checked')).toBe('false')
  })

  it('stays inert when disabled', async () => {
    const onCheckedChange = vi.fn()
    ui(<LiquidSwitch disabled label="Refraction" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})

describe('checkbox', () => {
  it('reports an indeterminate state as mixed', () => {
    ui(<LiquidCheckbox indeterminate label="Select all layers" />)
    expect(screen.getByRole('checkbox', { name: /Select all layers/ }).getAttribute('aria-checked'))
      .toBe('mixed')
  })

  // The control sits inside its <label>, so the hint reaches assistive technology
  // as part of the accessible name. Fields wire theirs with aria-describedby
  // instead; both are documented, and this is the one that is easy to break.
  it('folds its hint into the accessible name', () => {
    ui(<LiquidCheckbox hint="Anonymous, aggregated weekly." label="Send usage reports" />)
    const control = screen.getByRole('checkbox', {
      name: /Send usage reports.*Anonymous, aggregated weekly/s,
    })
    expect(control).toBeTruthy()
  })

  it('calls back with the next state', async () => {
    const onCheckedChange = vi.fn()
    ui(<LiquidCheckbox label="Follow the system" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})

describe('radio group', () => {
  it('is one group of radios with one selected', async () => {
    ui(
      <LiquidRadioGroup defaultValue="jelly" label="Motion" name="motion">
        <LiquidRadio label="Jelly" value="jelly" />
        <LiquidRadio label="Instant" value="instant" />
      </LiquidRadioGroup>,
    )
    const group = screen.getByRole('radiogroup', { name: 'Motion' })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios[0]?.getAttribute('aria-checked')).toBe('true')

    await userEvent.click(radios[1]!)
    expect(radios[1]?.getAttribute('aria-checked')).toBe('true')
    expect(radios[0]?.getAttribute('aria-checked')).toBe('false')
  })

  it('reports the value the owner set when controlled', async () => {
    const onValueChange = vi.fn()
    ui(
      <LiquidRadioGroup label="Motion" onValueChange={onValueChange} value="jelly">
        <LiquidRadio label="Jelly" value="jelly" />
        <LiquidRadio label="Instant" value="instant" />
      </LiquidRadioGroup>,
    )
    await userEvent.click(screen.getAllByRole('radio')[1]!)
    expect(onValueChange).toHaveBeenCalledWith('instant')
  })
})

describe('slider', () => {
  it('is a labelled range input', () => {
    ui(<LiquidSlider defaultValue={64} label="Spatial depth" max={100} min={0} />)
    const input = screen.getByLabelText<HTMLInputElement>('Spatial depth')
    expect(input.type).toBe('range')
    expect(input.value).toBe('64')
    expect(input.min).toBe('0')
    expect(input.max).toBe('100')
  })

  it('reports movement through the native change event', async () => {
    const Controlled = () => {
      const [value, setValue] = useState(20)
      return (
        <>
          <LiquidSlider
            label="Depth"
            max={100}
            min={0}
            onChange={(event) => setValue(Number(event.currentTarget.value))}
            value={value}
          />
          <output data-testid="value">{value}</output>
        </>
      )
    }
    ui(<Controlled />)
    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: '73' } })
    expect(screen.getByTestId('value').textContent).toBe('73')
    expect(screen.getByLabelText<HTMLInputElement>('Depth').value).toBe('73')
  })
})

describe('rating', () => {
  it('offers one named button per star and marks the current one', () => {
    ui(<LiquidRating defaultValue={3} label="Feel" max={5} />)
    const stars = screen.getAllByRole('button')
    expect(stars).toHaveLength(5)
    expect(stars[2]?.getAttribute('aria-label')).toBe('Feel: 3 of 5')
    expect(stars[2]?.getAttribute('aria-pressed')).toBe('true')
    expect(stars[0]?.getAttribute('aria-pressed')).toBe('false')
  })

  it('sets the value from a star and calls back', async () => {
    const onValueChange = vi.fn()
    ui(<LiquidRating label="Feel" max={5} onValueChange={onValueChange} />)
    await userEvent.click(screen.getAllByRole('button')[3]!)
    expect(onValueChange).toHaveBeenCalledWith(4)
  })

  it('offers nothing to press when read only', () => {
    ui(<LiquidRating label="Feel" readOnly value={4} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('img', { name: 'Feel: 4 of 5' })).toBeTruthy()
  })
})

describe('segmented control', () => {
  it('is an exclusive choice with one selected tab', async () => {
    const onValueChange = vi.fn()
    ui(
      <LiquidSegmented
        label="Size"
        onValueChange={onValueChange}
        options={[
          { label: 'S', value: 'sm' },
          { label: 'M', value: 'md' },
        ]}
        value="sm"
      />,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    await userEvent.click(tabs[1]!)
    expect(onValueChange).toHaveBeenCalledWith('md')
  })
})

describe('pagination', () => {
  it('marks the current page and walks with the arrows', async () => {
    const onPageChange = vi.fn()
    ui(<LiquidPagination count={5} onPageChange={onPageChange} page={3} />)
    expect(screen.getByRole('button', { name: 'Page 3' }).getAttribute('aria-current')).toBe('page')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })
})

describe('progress', () => {
  it('is a progressbar with its value', () => {
    ui(<LiquidProgress label="Uploading" value={68} />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading' })
    expect(bar.getAttribute('aria-valuenow')).toBe('68')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('omits the value when it is indeterminate', () => {
    ui(<LiquidProgress label="Working" />)
    expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false)
  })

  it('names the spinner so it is not a mystery to a screen reader', () => {
    ui(<LiquidSpinner label="Loading" />)
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeTruthy()
  })
})

describe('names for icon-only controls', () => {
  it('takes the accessible name of an icon button from its required label', () => {
    ui(<LiquidIconButton label="Open settings"><svg /></LiquidIconButton>)
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy()
  })

  it('names a chip’s delete affordance and calls back', async () => {
    const onDelete = vi.fn()
    ui(<LiquidChip deleteLabel="Remove glass" onDelete={onDelete}>Glass</LiquidChip>)
    await userEvent.click(screen.getByRole('button', { name: 'Remove glass' }))
    expect(onDelete).toHaveBeenCalled()
  })
})

describe('text field', () => {
  it('labels the input through htmlFor and links the hint by id', () => {
    ui(<LiquidTextField hint="We never share it." label="Email" />)
    // The <label> wraps both, so its text — and the accessible name — carries the
    // hint as well; the description is what aria-describedby points at.
    const input = screen.getByRole('textbox', { name: /Email/ })
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe('We never share it.')
  })

  it('labels the input on its own when there is no hint', () => {
    ui(<LiquidTextField label="Email" />)
    expect(screen.getByLabelText('Email')).toBeTruthy()
  })

  // There is no `invalid` prop: native attributes are forwarded, which is what the
  // styles prop's _invalid state matches on.
  it('forwards aria-invalid to the input', () => {
    ui(<LiquidTextField aria-invalid label="Email" />)
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
  })
})

describe('tooltip', () => {
  it('appears on focus, not only on hover', async () => {
    ui(
      <LiquidTooltip content="Anchored and dismissible">
        <button type="button">Hover me</button>
      </LiquidTooltip>,
    )
    await userEvent.tab()
    expect(await screen.findByText('Anchored and dismissible')).toBeTruthy()
  })
})

describe('toast', () => {
  const Trigger = () => {
    const { toast } = useLiquidToast()
    return (
      <button onClick={() => toast({ severity: 'success', title: 'Saved' })} type="button">
        Save
      </button>
    )
  }

  it('announces in a live region and can be dismissed', async () => {
    ui(<LiquidToastProvider><Trigger /></LiquidToastProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const toast = await screen.findByRole('status')
    expect(toast.textContent).toContain('Saved')
    expect(toast.closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite')

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByText('Saved')).toBeNull())
  })

  it('refuses to be used outside its provider, loudly', () => {
    const Orphan = () => {
      useLiquidToast()
      return null
    }
    expect(() => render(<Orphan />)).toThrow(/LiquidToastProvider/)
  })
})
