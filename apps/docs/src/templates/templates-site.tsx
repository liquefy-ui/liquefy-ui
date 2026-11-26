import { ChevronLeftIcon, EyeIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton } from '@liquefy-ui/react'
import { SiteHeader, useScrollReset } from '../site/chrome'
import { useSiteConfig } from '../site/site-config'
import { ExpenseTracker } from './expense-tracker'
import { Notes } from './notes'
import { PhotoFeed } from './photo-feed'
import { RecipeBox } from './recipe-box'
import { templateRoute, TEMPLATES_ROUTE } from './routes'
import { TaskBoard } from './task-board'
import { paneGlass, TemplateTheme } from './template-theme'

const templates = [
  { id: 'photo-feed', name: 'Photo Feed', category: 'Social', App: PhotoFeed },
  { id: 'task-board', name: 'Task Board', category: 'Project management', App: TaskBoard },
  { id: 'notes', name: 'Notes', category: 'Productivity', App: Notes },
  { id: 'expense-tracker', name: 'Expense Tracker', category: 'Personal finance', App: ExpenseTracker },
  { id: 'recipe-box', name: 'Recipe Box', category: 'Food', App: RecipeBox },
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

  return (
    <TemplateTheme title={title}>
      <main className="template-container demo-shell">
        <a className="demo-back" href={TEMPLATES_ROUTE}>
          <ChevronLeftIcon size={16} />
          Templates
        </a>
        <h1>{title}</h1>
        {template && <template.App />}
      </main>
    </TemplateTheme>
  )
}
