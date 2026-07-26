import type { ReactNode } from 'react'

export type PropRow = {
  defaultValue?: string
  description: string
  name: string
  required?: boolean
  type: string
}

export type DemoDef = {
  code: string
  description?: string
  render: () => ReactNode
  // Extra stage sizing for demos whose overlays (Select/Menu popovers) need room
  // to open within the preview area instead of spilling past it.
  stageAlign?: 'top' | 'center'
  stageMinHeight?: number
  title: string
}

export type ComponentDoc = {
  /** Set false for entries that document an options object rather than a component root. */
  acceptsStyles?: boolean
  description: string
  demos: DemoDef[]
  importLine: string
  name: string
  /**
   * Compact rendering for the components index. Only needed where the first demo
   * is too tall or too wide to read inside a gallery card; otherwise the index
   * falls back to that demo.
   */
  preview?: () => ReactNode
  props: PropRow[]
  propsTitle?: string
  slug: string
}

// Appended to every component prop table, so the shared style escape hatch is
// documented in one place instead of forty.
export const stylesProp: PropRow = {
  description:
    'Token-aware style overrides for the component root. Accepts every CSS property, the p / px / mt / w / h / size / bg / radius shorthands, $token references, responsive objects like { base: 1, md: 3 }, and states such as _hover, _focusVisible or _dark.',
  name: 'styles',
  type: 'LiquidStyles',
}

export type CatalogCategory = {
  icon: ReactNode
  items: ComponentDoc[]
  title: string
}

export type DocEntry = {
  description: string
  name: string
  render: () => ReactNode
  slug: string
  /** One-line summary for the index cards, when it should differ from `description`. */
  summary?: string
}

export type DocCategory = {
  icon: ReactNode
  items: DocEntry[]
  title: string
}
