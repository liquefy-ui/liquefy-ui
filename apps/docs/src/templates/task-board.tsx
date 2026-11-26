import { PlusIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton, LiquidProgress, LiquidSelect, LiquidTextField } from '@liquefy-ui/react'
import { useState, type FormEvent } from 'react'
import { usePreviewState } from './preview-state'
import { PreviewStatus } from './preview-status'
import { paneGlass } from './template-theme'

const statuses = [
  { label: 'To do', value: 'todo' },
  { label: 'In progress', value: 'doing' },
  { label: 'Done', value: 'done' },
]
type Task = { id: string; title: string; detail?: string; status: string }

const initialTasks: Task[] = [
  { id: 'og', title: 'Create the share image', detail: 'Design', status: 'todo' },
  { id: 'mobile', title: 'Review mobile checkout', detail: 'QA', status: 'todo' },
  { id: 'launch', title: 'Schedule the launch email', detail: 'Marketing', status: 'todo' },
  { id: 'contact', title: 'Connect the contact form', detail: 'Engineering', status: 'doing' },
  { id: 'copy', title: 'Edit the pricing page', detail: 'Content', status: 'doing' },
  { id: 'domain', title: 'Configure the domain', detail: 'Engineering', status: 'done' },
  { id: 'legal', title: 'Approve the privacy policy', detail: 'Legal', status: 'done' },
]

export const TaskBoard = () => {
  const { value: tasks, update, hasUnsavedChanges } = usePreviewState('task-board', initialTasks)
  const [draft, setDraft] = useState('')
  const completed = tasks.filter(({ status }) => status === 'done').length
  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    const task: Task = { id: crypto.randomUUID(), title, status: 'todo' }
    update((current) => [task, ...current])
    setDraft('')
  }

  return (
    <div className="demo-stack">
      <GlassCard className="demo-pane" interactive={false} styles={paneGlass}>
        <div className="board-toolbar">
          <div>
            <div className="demo-spread">
              <h2>Website launch</h2>
              <span className="demo-muted">{completed} of {tasks.length} done</span>
            </div>
            <LiquidProgress aria-label="Website launch progress" value={tasks.length ? (completed / tasks.length) * 100 : 0} />
          </div>
          <form className="demo-inline-form" onSubmit={addTask}>
            <LiquidTextField aria-label="New task" maxLength={100} onChange={(event) => setDraft(event.currentTarget.value)} placeholder="New task" value={draft} />
            <LiquidButton disabled={!draft.trim()} iconBefore={<PlusIcon size={16} />} type="submit">Add task</LiquidButton>
          </form>
        </div>
      </GlassCard>
      <PreviewStatus hasUnsavedChanges={hasUnsavedChanges} />
      <div className="board-columns">
        {statuses.map(({ label, value }) => {
          const items = tasks.filter(({ status }) => status === value)
          return (
            <section aria-label={label} key={value}>
              <GlassCard className="demo-pane" interactive={false} styles={paneGlass}>
                <div className="demo-spread">
                  <h2>{label}</h2>
                  <span className="demo-muted">{items.length}</span>
                </div>
                {items.length === 0 && <p className="demo-empty">No tasks</p>}
                <ul className="demo-list board-tasks">
                  {items.map((task) => (
                    <li key={task.id}>
                      <strong>{task.title}</strong>
                      {task.detail && <p className="demo-muted">{task.detail}</p>}
                      <LiquidSelect
                        aria-label={`Status for ${task.title}`}
                        onValueChange={(status) => update((current) => current.map((item) => item.id === task.id ? { ...item, status } : item))}
                        options={statuses}
                        value={task.status}
                      />
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </section>
          )
        })}
      </div>
    </div>
  )
}
