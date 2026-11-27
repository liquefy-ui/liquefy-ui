import { PlusIcon } from '@liquefy-ui/icons'
import { LiquidButton, LiquidList, LiquidListItem, LiquidProgress, LiquidSegmented, LiquidSelect, LiquidTextField } from '@liquefy-ui/react'
import { useState, type FormEvent } from 'react'
import { paneGlass } from './template-theme'

const statuses = [
  { label: 'To do', value: 'todo' },
  { label: 'In progress', value: 'doing' },
  { label: 'Done', value: 'done' },
]

const filters = [
  { label: 'All tasks', value: 'all' },
  { label: 'In progress', value: 'doing' },
  { label: 'Done', value: 'done' },
]

const milestones = [
  { id: 'review', date: 'Nov 26', label: 'Review' },
  { id: 'handoff', date: 'Nov 27', label: 'Handoff' },
  { id: 'launch', date: 'Nov 28', label: 'Launch' },
]

type Task = { id: string; title: string; team?: string; status: string; milestone: string }
const initialTasks: Task[] = [
  { id: 'og', title: 'Create the share image', team: 'Design', status: 'done', milestone: 'review' },
  { id: 'checkout', title: 'Review mobile checkout', team: 'QA', status: 'doing', milestone: 'review' },
  { id: 'copy', title: 'Edit the pricing page', team: 'Content', status: 'doing', milestone: 'review' },
  { id: 'contact', title: 'Connect the contact form', team: 'Engineering', status: 'todo', milestone: 'handoff' },
  { id: 'legal', title: 'Approve the privacy policy', team: 'Legal', status: 'done', milestone: 'handoff' },
  { id: 'domain', title: 'Configure the domain', team: 'Engineering', status: 'todo', milestone: 'launch' },
  { id: 'email', title: 'Schedule the launch email', team: 'Marketing', status: 'todo', milestone: 'launch' },
]

export const TaskBoard = () => {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState('')
  const completed = tasks.filter(({ status }) => status === 'done').length
  const visibleTasks = filter === 'all' ? tasks : tasks.filter(({ status }) => status === filter)
  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    const task: Task = { id: crypto.randomUUID(), title, status: 'todo', milestone: 'review' }
    setTasks((current) => [task, ...current])
    setDraft('')
    setFilter('all')
  }

  return (
    <div className="roadmap">
      <div className="roadmap-overview">
        <div>
          <h2>Website launch</h2>
          <form className="demo-inline-form" onSubmit={addTask}>
            <LiquidTextField aria-label="New task" maxLength={100} onChange={(event) => setDraft(event.currentTarget.value)} placeholder="New task" value={draft} />
            <LiquidButton disabled={!draft.trim()} iconBefore={<PlusIcon size={16} />} type="submit">Add task</LiquidButton>
          </form>
        </div>
        <div className="roadmap-progress">
          <div className="demo-spread">
            <span>Progress</span>
            <strong>{completed} of {tasks.length} done</strong>
          </div>
          <LiquidProgress aria-label="Website launch progress" value={(completed / tasks.length) * 100} />
        </div>
      </div>
      <LiquidSegmented className="demo-switcher" label="Filter tasks" onValueChange={setFilter} options={filters} value={filter} />
      <ol className="roadmap-timeline">
        {milestones.map(({ date, id, label }) => {
          const items = visibleTasks.filter(({ milestone }) => milestone === id)
          return (
            <li className="roadmap-milestone" key={id}>
              <div className="roadmap-date">
                <h2>{label}</h2>
                <span className="demo-muted">{date}</span>
              </div>
              {items.length === 0 ? (
                <p className="demo-empty">No matching tasks.</p>
              ) : (
                <LiquidList aria-label={label} className="roadmap-list" styles={paneGlass}>
                  {items.map((task) => (
                    <LiquidListItem
                      description={task.team}
                      end={(
                        <LiquidSelect
                          aria-label={`Status for ${task.title}`}
                          data-status={task.status}
                          onValueChange={(status) => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item))}
                          options={statuses}
                          value={task.status}
                        />
                      )}
                      key={task.id}
                    >
                      {task.title}
                    </LiquidListItem>
                  ))}
                </LiquidList>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
