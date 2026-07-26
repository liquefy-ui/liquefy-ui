import { ComponentsIcon, InfoIcon, SparklesIcon, CommandIcon, FolderIcon } from '@liquefy-ui/icons'
import { displayDocs } from './catalog-display'
import { feedbackDocs } from './catalog-feedback'
import { inputDocs } from './catalog-inputs'
import { navigationDocs } from './catalog-navigation'
import { surfaceDocs } from './catalog-surfaces'
import type { CatalogCategory, ComponentDoc } from './types'

export const catalog: CatalogCategory[] = [
  { icon: <CommandIcon size={15} />, items: inputDocs, title: 'Inputs' },
  { icon: <ComponentsIcon size={15} />, items: displayDocs, title: 'Data Display' },
  { icon: <InfoIcon size={15} />, items: feedbackDocs, title: 'Feedback' },
  { icon: <SparklesIcon size={15} />, items: surfaceDocs, title: 'Surfaces' },
  { icon: <FolderIcon size={15} />, items: navigationDocs, title: 'Navigation' },
]

export const findDoc = (slug: string): { category: CatalogCategory; doc: ComponentDoc } | undefined => {
  for (const category of catalog) {
    const doc = category.items.find((item) => item.slug === slug)
    if (doc) return { category, doc }
  }
  return undefined
}

export const componentCount = catalog.reduce((total, category) => total + category.items.length, 0)
