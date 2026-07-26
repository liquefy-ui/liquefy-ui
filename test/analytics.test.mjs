import { describe, expect, it } from 'vitest'
import { analyticsRoute } from '../apps/docs/src/site/analytics.tsx'

// The whole point of reporting the route ourselves is that a hash router hides
// every page behind `/`. If this mapping goes wrong the site keeps working and
// the numbers quietly describe a different site, so it is checked here rather
// than noticed a month later in the dashboard.
describe('the page a visit is filed under', () => {
  it.each([
    ['', '/'],
    ['#', '/'],
    ['#/', '/'],
    ['#/docs', '/docs'],
    ['#/components', '/components'],
    ['#/components/', '/components'],
    ['#/playground', '/playground'],
    ['#/docs/theming', '/docs/theming'],
    ['#/components/liquid-button', '/components/liquid-button'],
  ])('%j is the page %j', (hash, path) => {
    expect(analyticsRoute(hash).path).toBe(path)
  })

  it('drops the heading a deep link opens the page at', () => {
    expect(analyticsRoute('#/docs/theming#tokens').path).toBe('/docs/theming')
    expect(analyticsRoute('#/components/liquid-button#props').route).toBe('/components/[component]')
  })

  it.each([
    ['#/', '/'],
    ['#/docs', '/docs'],
    ['#/docs/theming', '/docs/[page]'],
    ['#/docs/frameworks', '/docs/[page]'],
    ['#/components', '/components'],
    ['#/components/liquid-button', '/components/[component]'],
    // A gallery of every icon, not a page about one component.
    ['#/components/icons', '/components/icons'],
    ['#/playground', '/playground'],
  ])('%j is grouped under %j', (hash, route) => {
    expect(analyticsRoute(hash).route).toBe(route)
  })

  // A slug that matches no page still renders (as "Not found"), so it is still a
  // visit — and one that has to land in the same group as the pages that exist,
  // or a mistyped link becomes its own row forever.
  it('groups a page that does not exist with the ones that do', () => {
    expect(analyticsRoute('#/docs/nonsense')).toEqual({
      path: '/docs/nonsense',
      route: '/docs/[page]',
    })
  })
})
