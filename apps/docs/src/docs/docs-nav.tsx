import { CommandIcon, ComponentsIcon, InfoIcon, SparklesIcon } from '@liquefy-ui/icons'
import { accessibilityDoc } from './pages/accessibility'
import { aiToolingDoc } from './pages/ai-tooling'
import { frameworksDoc } from './pages/frameworks'
import { installationDoc } from './pages/installation'
import { introductionDoc } from './pages/introduction'
import { motionDoc } from './pages/motion'
import { performanceDoc } from './pages/performance'
import { providerDoc } from './pages/provider'
import { stylesPropDoc } from './pages/styles-prop'
import { themingDoc } from './pages/theming'
import { tailwindDoc } from './pages/tailwind'
import { troubleshootingDoc } from './pages/troubleshooting'
import type { DocCategory, DocEntry } from './types'

// Adding a page: write a `DocEntry` in its own file under `pages/` and list it
// here. Sidebar groups come from the `title` of each category.
export const docCategories: DocCategory[] = [
  {
    icon: <SparklesIcon size={15} />,
    items: [introductionDoc, installationDoc],
    title: 'Getting started',
  },
  {
    icon: <CommandIcon size={15} />,
    items: [providerDoc, themingDoc, stylesPropDoc, motionDoc],
    title: 'Core',
  },
  {
    icon: <ComponentsIcon size={15} />,
    items: [frameworksDoc, tailwindDoc, aiToolingDoc],
    title: 'Integration',
  },
  {
    icon: <InfoIcon size={15} />,
    items: [accessibilityDoc, performanceDoc, troubleshootingDoc],
    title: 'Practices',
  },
]

export const docCount = docCategories.reduce((total, category) => total + category.items.length, 0)

/** Flat reading order, for the previous/next links at the foot of each page. */
export const docOrder: DocEntry[] = docCategories.flatMap((category) => category.items)

export const findDocPage = (slug: string): { category: DocCategory; doc: DocEntry } | undefined => {
  for (const category of docCategories) {
    const doc = category.items.find((item) => item.slug === slug)
    if (doc) return { category, doc }
  }
  return undefined
}
