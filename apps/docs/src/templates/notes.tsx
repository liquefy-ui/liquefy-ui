import { FileTextIcon, PlusIcon, SearchIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton, LiquidTextArea, LiquidTextField } from '@liquefy-ui/react'
import { useState } from 'react'
import { usePreviewState } from './preview-state'
import { PreviewStatus } from './preview-status'
import { paneGlass } from './template-theme'

type Note = { id: string; title: string; text: string }
const initialNotes: Note[] = [
  { id: 'handoff', title: 'Friday handoff', text: 'Decisions\n• Keep the first release to the core booking flow.\n• Share the prototype in Friday’s review.\n\nNext steps\n• Run a checkout on a narrow screen.\n• Hand over the copy draft by Thursday.\n• Capture open questions for the next sprint.' },
  { id: 'interview', title: 'Interview questions', text: 'What happened the last time you tried to book?\nWhere did you pause or ask for help?\nWhat would you expect to see in the confirmation email?' },
  { id: 'desk', title: 'Studio checklist', text: 'Charge the recorder. Test the spare microphone. Put the signed release forms next to the door.' },
]

export const Notes = () => {
  const { value: notes, update, hasUnsavedChanges } = usePreviewState('notes', initialNotes)
  const [selection, setSelection] = useState('handoff')
  const [query, setQuery] = useState('')
  const filter = query.trim().toLowerCase()
  const selected = notes.find(({ id }) => id === selection) ?? notes[0]
  const visible = notes.filter(({ title, text }) => `${title}\n${text}`.toLowerCase().includes(filter))

  const add = () => {
    const note = { id: crypto.randomUUID(), title: '', text: '' }
    update((current) => [note, ...current])
    setSelection(note.id)
    setQuery('')
  }
  const edit = (id: string, field: 'title' | 'text', value: string) =>
    update((current) => current.map((note) => note.id === id ? { ...note, [field]: value } : note))

  return (
    <div className="demo-stack">
      <PreviewStatus hasUnsavedChanges={hasUnsavedChanges} />
      <div className="demo-workspace">
        <GlassCard className="demo-pane" interactive={false} styles={paneGlass}>
          <div className="demo-stack">
            <LiquidButton iconBefore={<PlusIcon size={16} />} onClick={add}>New note</LiquidButton>
            <LiquidTextField aria-label="Search notes" onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search notes" startAdornment={<SearchIcon size={16} />} type="search" value={query} />
            <ul aria-label="Notes" className="demo-list demo-picker">
              {visible.map(({ id, title, text }) => (
                <li key={id}>
                  <LiquidButton
                    aria-pressed={selected?.id === id}
                    iconBefore={<FileTextIcon size={17} />}
                    onClick={() => setSelection(id)}
                  >
                    <span className="demo-picker__label">
                      <strong>{title.trim() || 'Untitled note'}</strong>
                      <small>{text.trim() || 'Empty note'}</small>
                    </span>
                  </LiquidButton>
                </li>
              ))}
            </ul>
            {visible.length === 0 && <p className="demo-empty">No matching notes.</p>}
          </div>
        </GlassCard>
        <GlassCard className="demo-pane" interactive={false} styles={paneGlass}>
          {selected ? (
            <div aria-label="Note editor" className="demo-stack">
              <LiquidTextField label="Title" maxLength={100} onChange={(event) => edit(selected.id, 'title', event.currentTarget.value)} placeholder="Untitled note" value={selected.title} />
              <LiquidTextArea label="Note" maxLength={20000} onChange={(event) => edit(selected.id, 'text', event.currentTarget.value)} placeholder="Write a note" rows={13} value={selected.text} />
            </div>
          ) : <p className="demo-empty">No notes yet.</p>}
        </GlassCard>
      </div>
    </div>
  )
}
