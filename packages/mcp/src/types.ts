export type McpComponentKind = 'hook' | 'lib' | 'ui'

export type McpComponent = {
  /** npm packages the copied source still needs, as `name@range`. */
  dependencies: string[]
  description: string
  docsUrl: string
  /** Values the package entry point re-exports, e.g. `['LiquidTabs', 'LiquidTab']`. */
  exports: string[]
  /** False for internal modules that ship inside other components. */
  importable: boolean
  /** Exported by the file but not by the package; only reachable as copied source. */
  internalExports: string[]
  kind: McpComponentKind
  /** File slug, e.g. `liquid-button`. */
  name: string
  /** Other registry items that must be installed alongside this one. */
  registryDependencies: string[]
  registryUrl: string
  /** The source with sibling imports rewritten to shadcn aliases. */
  source: string
  /** A plain-text page that any fetcher can read. */
  textUrl: string
  /** Exported type declarations, verbatim. */
  types: string[]
}

export type McpTokenScope = {
  label: string
  tokens: Array<{ name: string; value: string }>
}

/** The public surface of @liquefy-ui/core, which is a separate package. */
export type McpCoreApi = {
  types: string[]
  values: string[]
}

/** @liquefy-ui/icons: one named export per icon. */
export type McpIcons = {
  names: string[]
  propsDeclaration?: string
}

export type McpCatalog = {
  components: McpComponent[]
  conventions: string[]
  core: McpCoreApi
  homepage: string
  icons: McpIcons
  registryUrl: string
  tokens: McpTokenScope[]
}
