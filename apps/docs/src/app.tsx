import { useEffect, useState } from 'react'
import { ComponentsSite } from './docs/components-site'
import { DocsSite } from './docs/docs-site'
import { Landing } from './site/landing'
import { PlaygroundPage } from './site/playground-page'
import { SiteProvider } from './site/site-config'

// Old links pointed at #/guides; everything there now lives under #/docs.
const REDIRECTS: [RegExp, string][] = [
  [/^#\/guides\/customization/, '#/docs/theming'],
  [/^#\/guides\/frameworks/, '#/docs/frameworks'],
  [/^#\/guides\/ai-tooling/, '#/docs/ai-tooling'],
  [/^#\/guides/, '#/docs'],
]

const redirectFor = (hash: string): string | undefined =>
  REDIRECTS.find(([pattern]) => pattern.test(hash))?.[1]

const Router = () => {
  const [route, setRoute] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const target = redirectFor(route)
    if (target) window.location.replace(target)
  }, [route])

  if (redirectFor(route)) return null
  if (route.startsWith('#/components')) return <ComponentsSite route={route} />
  if (route.startsWith('#/docs')) return <DocsSite route={route} />
  if (route.startsWith('#/playground')) return <PlaygroundPage route={route} />
  return <Landing />
}

export const App = () => (
  <SiteProvider>
    <Router />
  </SiteProvider>
)
