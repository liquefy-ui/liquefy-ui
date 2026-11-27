import { PlusIcon } from '@liquefy-ui/icons'
import {
  GlassCard, LiquidButton, LiquidDialog, LiquidSelect, LiquidTable,
  LiquidTableBody, LiquidTableCell, LiquidTableContainer, LiquidTableHead,
  LiquidTableHeaderCell, LiquidTableRow, LiquidTextField,
} from '@liquefy-ui/react'
import { useState, type FormEvent } from 'react'
import { paneGlass } from './template-theme'

type Expense = { id: string; name: string; cents: number; category: string; date: string }
const categories = ['Food', 'Transport', 'Supplies', 'Subscriptions'].map((value) => ({ label: value, value }))
const initialExpenses: Expense[] = [
  { id: 'groceries', name: 'Weekly groceries', cents: 6835, category: 'Food', date: '2026-11-24' },
  { id: 'rail', name: 'Train tickets', cents: 2240, category: 'Transport', date: '2026-11-23' },
  { id: 'notebook', name: 'Notebook and pens', cents: 1850, category: 'Supplies', date: '2026-11-22' },
  { id: 'music', name: 'Music subscription', cents: 1099, category: 'Subscriptions', date: '2026-11-20' },
  { id: 'lunch', name: 'Lunch at the market', cents: 1460, category: 'Food', date: '2026-11-19' },
]

const usd = new Intl.NumberFormat('en-US', { currency: 'USD', style: 'currency' })
const money = (cents: number) => usd.format(cents / 100)
const chartMoney = new Intl.NumberFormat('en-US', { currency: 'USD', notation: 'compact', style: 'currency' })
const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const ExpenseForm = ({ onAdd, onClose }: { onAdd: (expense: Expense) => void; onClose: () => void }) => {
  const [category, setCategory] = useState('Food')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const cents = Math.round(Number(data.get('amount')) * 100)
    const date = String(data.get('date') ?? '')
    if (!name || !date || !Number.isSafeInteger(cents) || cents <= 0) return
    onAdd({ id: crypto.randomUUID(), name, cents, category, date })
  }

  return (
    <form className="demo-stack" onSubmit={submit}>
      <LiquidTextField label="Expense" maxLength={100} name="name" pattern=".*\S.*" required />
      <div className="expense-fields">
        <LiquidTextField inputMode="decimal" label="Amount (USD)" max="999999.99" min="0.01" name="amount" required step="0.01" type="number" />
        <LiquidTextField defaultValue={today()} label="Date" name="date" required type="date" />
      </div>
      <LiquidSelect label="Category" onValueChange={setCategory} options={categories} value={category} />
      <div className="demo-actions demo-actions--end">
        <LiquidButton onClick={onClose}>Cancel</LiquidButton>
        <LiquidButton type="submit">Add expense</LiquidButton>
      </div>
    </form>
  )
}

export const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [open, setOpen] = useState(false)
  const total = expenses.reduce((sum, { cents }) => sum + cents, 0)
  const latest = [...expenses].sort((a, b) => b.date.localeCompare(a.date))
  const spending = categories.map(({ label, value }) => ({
    label,
    cents: expenses.filter(({ category }) => category === value).reduce((sum, { cents }) => sum + cents, 0),
  }))
  const chartMax = Math.max(1, ...spending.map(({ cents }) => cents))

  return (
    <div className="demo-stack">
      <GlassCard className="expense-overview" interactive={false} styles={paneGlass}>
        <div className="expense-insight">
          <h2>Total spent</h2>
          <strong className="expense-total" aria-live="polite">{money(total)}</strong>
          <span className="demo-muted">{expenses.length} transactions</span>
          <LiquidButton iconBefore={<PlusIcon size={16} />} onClick={() => setOpen(true)}>Add expense</LiquidButton>
        </div>
        <figure className="expense-chart">
          <figcaption>Spending by category</figcaption>
          <ul className="expense-bars demo-list">
            {spending.map(({ label, cents }) => (
              <li aria-label={`${label}: ${money(cents)}`} className="expense-bar" key={label}>
                <div aria-hidden="true" className="expense-bar__track">
                  <div className="expense-bar__fill" style={{ height: `${cents / chartMax * 100}%` }}>
                    <span>{cents < 100_000 ? money(cents) : chartMoney.format(cents / 100)}</span>
                  </div>
                </div>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </figure>
      </GlassCard>
      <section className="demo-stack expense-transactions" aria-labelledby="expense-transactions">
        <h2 id="expense-transactions">Transactions</h2>
        <LiquidTableContainer styles={paneGlass}>
          <LiquidTable aria-label="Transactions" size="sm">
            <LiquidTableHead>
              <LiquidTableRow>
                <LiquidTableHeaderCell>Expense</LiquidTableHeaderCell>
                <LiquidTableHeaderCell className="expense-desktop">Date</LiquidTableHeaderCell>
                <LiquidTableHeaderCell align="right">Amount</LiquidTableHeaderCell>
              </LiquidTableRow>
            </LiquidTableHead>
            <LiquidTableBody>
              {latest.map(({ id, name, cents, category, date }) => (
                <LiquidTableRow key={id}>
                  <LiquidTableCell>
                    <strong>{name}</strong>
                    <span className="expense-category demo-muted">{category}<span className="expense-mobile"> · {date}</span></span>
                  </LiquidTableCell>
                  <LiquidTableCell className="expense-desktop"><time dateTime={date}>{date}</time></LiquidTableCell>
                  <LiquidTableCell align="right">{money(cents)}</LiquidTableCell>
                </LiquidTableRow>
              ))}
            </LiquidTableBody>
          </LiquidTable>
        </LiquidTableContainer>
      </section>
      <LiquidDialog open={open} onOpenChange={setOpen} title="Add expense">
        <ExpenseForm
          onAdd={(expense) => {
            setExpenses((current) => [expense, ...current])
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      </LiquidDialog>
    </div>
  )
}
