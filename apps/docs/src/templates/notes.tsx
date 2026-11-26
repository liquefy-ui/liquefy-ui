import { FileTextIcon, PlusIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton, LiquidTab, LiquidTabList, LiquidTabPanel, LiquidTabs, LiquidTextArea, LiquidTextField } from '@liquefy-ui/react'
import { useEffect, useRef, useState } from 'react'
import { paneGlass } from './template-theme'

type Note = { id: string; title: string; text: string }
const initialNotes: Note[] = [
  {
    id: 'handoff', title: 'Friday handoff',
    text: 'Decisions\n\nKeep the first release to the core booking flow. Share the prototype in Friday’s review so the team can try it before we commit to the next sprint.\n\nNext steps\n\nReview checkout on a narrow screen. Hand over the first copy draft by Thursday and bring the open questions to the design review.',
  },
  {
    id: 'interview', title: 'Interview questions',
    text: 'What happened the last time you tried to book?\n\nWhere did you pause or ask for help?\n\nWhat would you expect to see in the confirmation email?',
  },
  {
    id: 'desk', title: 'Studio checklist',
    text: 'Charge the recorder. Test the spare microphone. Put the signed release forms next to the door.',
  },
]

export const Notes = () => {
  const [notes, setNotes] = useState(initialNotes)
  const [selection, setSelection] = useState('handoff')
  const tabs = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tabs.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selection])

  const add = () => {
    const note = { id: crypto.randomUUID(), title: '', text: '' }
    setNotes((current) => [...current, note])
    setSelection(note.id)
  }
  const edit = (id: string, field: 'title' | 'text', value: string) =>
    setNotes((current) => current.map((note) => note.id === id ? { ...note, [field]: value } : note))

  return (
    <LiquidTabs className="notebook" onValueChange={setSelection} value={selection}>
      <div className="notebook-toolbar">
        <LiquidTabList className="notebook-tabs" label="Notes" ref={tabs}>
          {notes.map(({ id, title }) => (
            <LiquidTab icon={<FileTextIcon size={16} />} key={id} value={id}>{title.trim() || 'Untitled note'}</LiquidTab>
          ))}
        </LiquidTabList>
        <LiquidButton iconBefore={<PlusIcon size={16} />} onClick={add}>New note</LiquidButton>
      </div>
      {notes.map(({ id, title, text }) => (
        <LiquidTabPanel className="notebook-panel" key={id} value={id}>
          <GlassCard className="notebook-paper" interactive={false} styles={paneGlass}>
            <LiquidTextField aria-label="Title" className="notebook-title" maxLength={100} onChange={(event) => edit(id, 'title', event.currentTarget.value)} placeholder="Untitled note" value={title} />
            <LiquidTextArea aria-label="Note" className="notebook-content" maxLength={20000} onChange={(event) => edit(id, 'text', event.currentTarget.value)} placeholder="Write a note" rows={13} value={text} />
          </GlassCard>
        </LiquidTabPanel>
      ))}
    </LiquidTabs>
  )
}
