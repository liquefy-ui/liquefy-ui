import { ChevronLeftIcon, EyeIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton } from '@liquefy-ui/react'
import type { ComponentType } from 'react'
import { SiteHeader, useScrollReset } from '../site/chrome'
import { useSiteConfig } from '../site/site-config'
import { ExpenseTracker } from './expense-tracker'
import { FocusStudio } from './focus-studio'
import { Notes } from './notes'
import { PhotoFeed } from './photo-feed'
import { templateRoute, TEMPLATES_ROUTE } from './routes'
import { TaskBoard } from './task-board'
import { paneGlass, TemplateTheme } from './template-theme'

type Template = {
  id: string
  name: string
  category: string
  App: ComponentType
  tint?: string
  fullBleed?: boolean
}

const templates: Template[] = [
  { id: 'photo-feed', name: 'Photo Feed', category: 'Social', App: PhotoFeed },
  { id: 'task-board', name: 'Task Board', category: 'Project management', App: TaskBoard, tint: '#397edc' },
  { id: 'notes', name: 'Notes', category: 'Productivity', App: Notes },
  { id: 'expense-tracker', name: 'Expense Tracker', category: 'Personal finance', App: ExpenseTracker, tint: '#db8028' },
  { id: 'focus-studio', name: 'Focus Studio', category: 'Productivity', App: FocusStudio, tint: '#71dfc9', fullBleed: true },
]

export const TemplatesSite = () => {
  const { theme } = useSiteConfig()
  useScrollReset(TEMPLATES_ROUTE)

  return (
    <TemplateTheme title="Templates">
      <SiteHeader section="templates" />
      <main className="template-container">
        <h1>Templates</h1>
        <ul className="template-list">
          {templates.map(({ id, name, category }) => (
            <li key={id}>
              <GlassCard className="template-card" interactive={false} styles={paneGlass}>
                <img alt="" className="template-card__image" height={566} src={`/templates/${id}-${theme}.webp`} width={880} />
                <div className="template-card__details">
                  <div>
                    <h2>{name}</h2>
                    <p className="demo-muted">{category}</p>
                  </div>
                  <LiquidButton
                    aria-label={`View preview of ${name} (opens in a new tab)`}
                    className="template-card__action"
                    iconBefore={<EyeIcon size={16} />}
                    onClick={() => window.open(templateRoute(id), '_blank', 'noopener,noreferrer')}
                  >
                    View preview
                  </LiquidButton>
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      </main>
    </TemplateTheme>
  )
}

export const TemplatePreview = ({ route }: { route: string }) => {
  useScrollReset(route)
  const template = templates.find(({ id }) => templateRoute(id) === route)
  const title = template?.name ?? 'Template not found'
  const fullBleed = template?.fullBleed === true

  return (
    <TemplateTheme showBackdrop={!fullBleed} tint={template?.tint} title={title}>
      <main className={fullBleed ? 'demo-shell demo-shell--full-bleed' : 'template-container demo-shell'}>
        <header className="demo-heading">
          <a className="demo-back" href={TEMPLATES_ROUTE}>
            <ChevronLeftIcon size={16} />
            Templates
          </a>
          <h1>{title}</h1>
        </header>
        {template && <template.App />}
      </main>
    </TemplateTheme>
  )
}
