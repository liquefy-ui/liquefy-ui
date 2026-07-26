// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { LiquidAccordion, LiquidAccordionItem } from '../src/liquid-accordion'
import { LiquidButton } from '../src/liquid-button'
import { LiquidDialog } from '../src/liquid-dialog'
import { LiquidMenu } from '../src/liquid-menu'
import { LiquidSelect } from '../src/liquid-select'
import { LiquidTab, LiquidTabList, LiquidTabPanel, LiquidTabs } from '../src/liquid-tabs'
import { LiquefyProvider } from '../src/provider'

// These are the behaviours the hand-rolled versions did not have. They are worth
// asserting rather than trusting, because they are exactly what breaks silently.

const mount = (node: Parameters<typeof render>[0]) =>
  render(<LiquefyProvider theme="dark" webgl={false}>{node}</LiquefyProvider>)

const focused = () => document.activeElement

/** Resolves an aria-labelledby / aria-describedby chain to its text. */
const referencedText = (element: Element, attribute: string) =>
  (element.getAttribute(attribute) ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ')

afterEach(() => {
  document.body.innerHTML = ''
})

const options = [
  { label: 'Clear', value: 'clear' },
  { label: 'Regular', value: 'regular' },
  { label: 'Solid', value: 'solid' },
]

describe('keyboard access', () => {
  it('moves between tabs with the arrow keys and keeps one tab stop', async () => {
    const user = userEvent.setup()
    mount(
      <LiquidTabs defaultValue="one">
        <LiquidTabList label="Sections">
          <LiquidTab value="one">One</LiquidTab>
          <LiquidTab value="two">Two</LiquidTab>
        </LiquidTabList>
        <LiquidTabPanel value="one">First panel</LiquidTabPanel>
        <LiquidTabPanel value="two">Second panel</LiquidTabPanel>
      </LiquidTabs>,
    )

    // Roving tabindex: one Tab press reaches the list, not each tab in turn.
    await user.tab()
    expect(focused()).toBe(screen.getByRole('tab', { name: 'One' }))

    await user.keyboard('{ArrowRight}')
    expect(focused()).toBe(screen.getByRole('tab', { name: 'Two' }))
    expect(screen.getByRole('tabpanel').textContent).toContain('Second panel')

    // Wrapping back around, which the old implementation had no concept of.
    await user.keyboard('{ArrowRight}')
    expect(focused()).toBe(screen.getByRole('tab', { name: 'One' }))
  })

  it('ties each tab to its panel through aria', () => {
    mount(
      <LiquidTabs defaultValue="one">
        <LiquidTabList label="Sections"><LiquidTab value="one">One</LiquidTab></LiquidTabList>
        <LiquidTabPanel value="one">First panel</LiquidTabPanel>
      </LiquidTabs>,
    )

    const tab = screen.getByRole('tab', { name: 'One' })
    const panel = screen.getByRole('tabpanel')
    expect(tab.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id)
  })

  it('opens a menu from the keyboard and walks it with the arrow keys', async () => {
    const user = userEvent.setup()
    const chosen: string[] = []
    mount(
      <LiquidMenu
        items={[
          { label: 'Rename', onSelect: () => chosen.push('Rename') },
          { type: 'separator' },
          { label: 'Delete', onSelect: () => chosen.push('Delete') },
        ]}
        trigger={<LiquidButton>Actions</LiquidButton>}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.tab()
    expect(focused()).toBe(trigger)

    await user.keyboard('{ArrowDown}')
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Rename')).toBeTruthy()

    await user.keyboard('{ArrowDown}{Enter}')
    expect(chosen).toEqual(['Delete'])

    // Focus comes back to the trigger instead of being dropped on the body.
    expect(focused()).toBe(trigger)
  })

  it('closes a menu on Escape and returns focus', async () => {
    const user = userEvent.setup()
    mount(<LiquidMenu items={[{ label: 'Rename' }]} trigger={<LiquidButton>Actions</LiquidButton>} />)

    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.click(trigger)
    expect(await screen.findByRole('menu')).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(focused()).toBe(trigger)
  })

  it('selects an option in the select by typing its first letters', async () => {
    const user = userEvent.setup()
    const Controlled = () => {
      const [value, setValue] = useState('clear')
      return <LiquidSelect label="Material" onValueChange={setValue} options={options} value={value} />
    }
    mount(<Controlled />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    expect(await screen.findByRole('listbox')).toBeTruthy()

    // Typeahead — the old listbox ignored printable keys entirely.
    await user.keyboard('sol')
    await user.keyboard('{Enter}')
    expect(trigger.textContent).toContain('Solid')
  })

  it('labels the select through Select.Label rather than a loose htmlFor', () => {
    mount(<LiquidSelect label="Material" options={options} />)
    expect(screen.getByRole('combobox', { name: 'Material' })).toBeTruthy()
  })

  // Base UI deliberately leaves accordion headers in the normal tab order rather
  // than making them a roving-tabindex composite, which is what WAI-ARIA calls for.
  it('puts accordion headers in headings and in the tab order', async () => {
    const user = userEvent.setup()
    mount(
      <LiquidAccordion>
        <LiquidAccordionItem title="First" value="a">A body</LiquidAccordionItem>
        <LiquidAccordionItem title="Second" value="b">B body</LiquidAccordionItem>
      </LiquidAccordion>,
    )

    // Real headings, which the old markup did not produce at all.
    const headings = screen.getAllByRole('heading')
    expect(headings.map((heading) => heading.textContent)).toEqual(['First', 'Second'])

    await user.tab()
    expect(focused()).toBe(screen.getByRole('button', { name: 'First' }))
    await user.tab()
    expect(focused()).toBe(screen.getByRole('button', { name: 'Second' }))
  })

  it('reports accordion state and ties each header to its panel', async () => {
    const user = userEvent.setup()
    mount(
      <LiquidAccordion>
        <LiquidAccordionItem title="First" value="a">A body</LiquidAccordionItem>
      </LiquidAccordion>,
    )

    const trigger = screen.getByRole('button', { name: 'First' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    await user.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    const panel = screen.getByRole('region')
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id)
  })

  it('traps focus in a dialog, labels it, and hands focus back on close', async () => {
    const user = userEvent.setup()
    const Controlled = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <LiquidButton onClick={() => setOpen(true)}>Open</LiquidButton>
          <LiquidDialog
            description="This cannot be undone."
            onOpenChange={setOpen}
            open={open}
            title="Delete 3 items?"
          >
            <LiquidButton onClick={() => setOpen(false)}>Confirm</LiquidButton>
          </LiquidDialog>
        </>
      )
    }
    mount(<Controlled />)

    const opener = screen.getByRole('button', { name: 'Open' })
    await user.click(opener)

    const dialog = await screen.findByRole('dialog')
    expect(referencedText(dialog, 'aria-labelledby')).toBe('Delete 3 items?')
    expect(referencedText(dialog, 'aria-describedby')).toBe('This cannot be undone.')
    // Focus moved inside the panel rather than staying on the trigger.
    expect(dialog.contains(focused())).toBe(true)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(focused()).toBe(opener)
  })
})
