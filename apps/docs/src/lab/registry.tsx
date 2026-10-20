import type { ReactNode } from 'react'
import {
  ComponentsIcon,
  GridIcon,
  ImageIcon,
  SparklesIcon,
  StarIcon,
  TrendingUpIcon,
} from '@liquefy-ui/icons'
import type { LabCategoryKey, LabExperiment } from './types'

export type LabCategory = {
  icon: ReactNode
  items: LabExperiment[]
  key: LabCategoryKey
  title: string
}

/** Shelf order and names. An experiment picks one of these keys. */
export const LAB_CATEGORIES: readonly { icon: ReactNode; key: LabCategoryKey; title: string }[] = [
  { icon: <ComponentsIcon size={15} />, key: 'menus', title: 'Menus' },
  { icon: <GridIcon size={15} />, key: 'surfaces', title: 'Surfaces' },
  { icon: <TrendingUpIcon size={15} />, key: 'meters', title: 'Meters' },
  { icon: <SparklesIcon size={15} />, key: 'effects', title: 'Effects' },
  { icon: <ImageIcon size={15} />, key: 'backdrops', title: 'Backdrops' },
  { icon: <StarIcon size={15} />, key: 'icons', title: 'Icon motion' },
]

export const labInstallCommand = 'pnpm add @liquefy-ui/lab @liquefy-ui/react @liquefy-ui/core'

/**
 * Every file in `./experiments/` that exports `experiment`. Vite resolves the
 * glob at build time (and Vitest does the same), so a new experiment is one new
 * file — no list to edit, which is what lets several be built at once.
 */
const modules = import.meta.glob<LabExperiment>('./experiments/*.tsx', { eager: true, import: 'experiment' })

const byOrder = (a: LabExperiment, b: LabExperiment): number =>
  (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name)

export const labExperiments: LabExperiment[] = Object.values(modules).sort(byOrder)

export const labCategories: LabCategory[] = LAB_CATEGORIES
  .map((category) => ({
    ...category,
    items: labExperiments.filter((experiment) => experiment.category === category.key),
  }))
  .filter((category) => category.items.length > 0)

/** Reading order across shelves, for the previous/next links at the foot of each page. */
export const labOrder: LabExperiment[] = labCategories.flatMap((category) => category.items)

export const findExperiment = (slug: string): LabExperiment | undefined =>
  labExperiments.find((experiment) => experiment.slug === slug)
