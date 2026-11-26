import { ChevronLeftIcon, EyeIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton, LiquidTab, LiquidTabList, LiquidTabPanel, LiquidTabs } from '@liquefy-ui/react'
import { SiteHeader, useScrollReset } from '../site/chrome'
import { useSiteConfig } from '../site/site-config'
import { LANDSCAPE_GALLERY_ROUTE, TEMPLATES_ROUTE } from './routes'
import { paneGlass, TemplateTheme } from './template-theme'

const templates = [
  {
    name: 'Landscape Gallery',
    preview: LANDSCAPE_GALLERY_ROUTE,
    thumbnail: '/templates/landscape-gallery',
  },
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
          {templates.map(({ name, preview, thumbnail }) => (
            <li key={preview}>
              <GlassCard className="template-card" interactive={false} styles={paneGlass}>
                <img alt="" className="template-card__image" height={800} src={`${thumbnail}-${theme}.webp`} width={1120} />
                <div className="template-card__details">
                  <h2>{name}</h2>
                  <LiquidButton
                    aria-label={`View preview of ${name} (opens in a new tab)`}
                    className="template-card__action"
                    iconBefore={<EyeIcon size={16} />}
                    onClick={() => window.open(preview, '_blank', 'noopener,noreferrer')}
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

const landscapes = [
  { id: 'coast', label: 'Coast', alt: 'Sunlit cliffs above the sea', credit: 'Stefan Kunze' },
  { id: 'fjord', label: 'Fjord', alt: 'A deep blue fjord between rocky mountains', credit: 'Alexey Topolyanskiy' },
  { id: 'summit', label: 'Summit', alt: 'Yellow tents beneath snowy peaks', credit: 'Wolfgang Lutz' },
]

export const LandscapeGallery = () => {
  useScrollReset(LANDSCAPE_GALLERY_ROUTE)

  return (
    <TemplateTheme title="Landscape Gallery">
      <main className="template-container landscape-gallery">
        <a className="landscape-gallery__back" href={TEMPLATES_ROUTE}>
          <ChevronLeftIcon size={16} />
          Templates
        </a>
        <h1>Landscape Gallery</h1>
        <LiquidTabs defaultValue="coast">
          <LiquidTabList label="Landscapes">
            {landscapes.map(({ id, label }) => (
              <LiquidTab className="landscape-gallery__tab" key={id} value={id}>{label}</LiquidTab>
            ))}
          </LiquidTabList>
          {landscapes.map(({ id, alt, credit }) => (
            <LiquidTabPanel className="landscape-gallery__panel" key={id} value={id}>
              <figure>
                <img alt={alt} height={900} src={`/scenes/${id}.jpg`} width={1600} />
                <figcaption>Photo by {credit}</figcaption>
              </figure>
            </LiquidTabPanel>
          ))}
        </LiquidTabs>
      </main>
    </TemplateTheme>
  )
}
