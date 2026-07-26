import { Analytics } from '@vercel/analytics/react'

/**
 * Every page of this site is a hash route, and Vercel Web Analytics reads
 * `location.pathname` — which is `/` on all of them. Left alone it would report
 * one page with every visit on it.
 *
 * Handing it a `route` switches its own tracking off and reports what it is
 * given instead: `path` is the page the visitor opened, `route` is the pattern
 * that page matched. The dashboard keeps both, so the component reference reads
 * as one line when the question is which section people use, and as forty when
 * the question is which component.
 */
const ROUTES: [RegExp, string][] = [
  // A gallery of every icon rather than a page about one component, so it is
  // asked about on its own.
  [/^\/components\/icons$/, '/components/icons'],
  [/^\/components\/[^/]+$/, '/components/[component]'],
  [/^\/docs\/[^/]+$/, '/docs/[page]'],
]

export const analyticsRoute = (hash: string): { path: string; route: string } => {
  const path =
    `/${hash
      // `#/docs/theming#props` is that page, opened at one of its headings.
      .replace(/#[^#/]*$/, '')
      .replace(/^#\/?/, '')
      .replace(/\/+$/, '')}`
  return { path, route: ROUTES.find(([pattern]) => pattern.test(path))?.[1] ?? path }
}

export const SiteAnalytics = ({ hash }: { hash: string }) => {
  const { path, route } = analyticsRoute(hash)

  return (
    <Analytics
      // `auto` decides from `process.env.NODE_ENV`, which a browser does not
      // have. The reference is replaced during the build, but if that ever
      // stops being true the fallback is `production` — which would file a
      // maintainer's dev server under the site's real traffic. Vite knows the
      // answer for certain, so it answers.
      mode={import.meta.env.PROD ? 'production' : 'development'}
      path={path}
      route={route}
    />
  )
}
