import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as liquefy from '../packages/react/src/index.ts'

/**
 * The export surface is the version contract. Adding to it is a minor release,
 * removing or renaming anything in it is a breaking one, and both are easy to do
 * by accident while moving code around. This list is the reminder: if it fails,
 * the change was real, and it needs a changeset (or reverting).
 */

const RUNTIME_EXPORTS = [
  'DockItem',
  'GlassCard',
  'GlassDock',
  'LiquidAccordion',
  'LiquidAccordionItem',
  'LiquidAlert',
  'LiquidAvatar',
  'LiquidAvatarGroup',
  'LiquidBadge',
  'LiquidBreadcrumbs',
  'LiquidButton',
  'LiquidCheckbox',
  'LiquidChip',
  'LiquidDialog',
  'LiquidDivider',
  'LiquidDrawer',
  'LiquidIconButton',
  'LiquidList',
  'LiquidListItem',
  'LiquidListSubheader',
  'LiquidMenu',
  'LiquidPagination',
  'LiquidProgress',
  'LiquidRadio',
  'LiquidRadioGroup',
  'LiquidRating',
  'LiquidSegmented',
  'LiquidSelect',
  'LiquidSkeleton',
  'LiquidSlider',
  'LiquidSpinner',
  'LiquidSurface',
  'LiquidSwitch',
  'LiquidTab',
  'LiquidTabList',
  'LiquidTabPanel',
  'LiquidTable',
  'LiquidTableBody',
  'LiquidTableCell',
  'LiquidTableContainer',
  'LiquidTableHead',
  'LiquidTableHeaderCell',
  'LiquidTableRow',
  'LiquidTabs',
  'LiquidTextArea',
  'LiquidTextField',
  'LiquidToastProvider',
  'LiquidTooltip',
  'LiquefyProvider',
  'defaultBreakpoints',
  'getLiquefyStyleSheet',
  'useLiquidGlass',
  'useLiquidStyles',
  'useLiquidToast',
  'useLiquefyConfig',
]

/** Type-only exports, which do not exist at runtime and so are read from source. */
const TYPE_EXPORTS = [
  'DockItemProps',
  'GlassCardProps',
  'GlassDockProps',
  'LiquidAccordionItemProps',
  'LiquidAccordionProps',
  'LiquidAlertProps',
  'LiquidAlertSeverity',
  'LiquidAvatarGroupProps',
  'LiquidAvatarProps',
  'LiquidBadgeProps',
  'LiquidBreadcrumbItem',
  'LiquidBreadcrumbsProps',
  'LiquidButtonProps',
  'LiquidCheckboxProps',
  'LiquidChipProps',
  'LiquidCustomProperties',
  'LiquidDialogProps',
  'LiquidDividerProps',
  'LiquidDrawerProps',
  'LiquidGlassOptions',
  'LiquidIconButtonProps',
  'LiquidListItemProps',
  'LiquidListProps',
  'LiquidListSubheaderProps',
  'LiquidMenuItemDef',
  'LiquidMenuProps',
  'LiquidPaginationProps',
  'LiquidProgressProps',
  'LiquidRadioGroupProps',
  'LiquidRadioProps',
  'LiquidRatingProps',
  'LiquidResponsive',
  'LiquidSegmentedOption',
  'LiquidSegmentedProps',
  'LiquidSelectOption',
  'LiquidSelectProps',
  'LiquidSkeletonProps',
  'LiquidSliderProps',
  'LiquidSpinnerProps',
  'LiquidStyleProps',
  'LiquidStyleState',
  'LiquidStyles',
  'LiquidSurfaceProps',
  'LiquidSwitchProps',
  'LiquidTabListProps',
  'LiquidTabPanelProps',
  'LiquidTabProps',
  'LiquidTableCellProps',
  'LiquidTableContainerProps',
  'LiquidTableHeaderCellProps',
  'LiquidTableProps',
  'LiquidTableRowProps',
  'LiquidTabsProps',
  'LiquidTextAreaProps',
  'LiquidTextFieldProps',
  'LiquidToastOptions',
  'LiquidToastProviderProps',
  'LiquidTooltipProps',
  'LiquefyBreakpoint',
  'LiquefyBreakpoints',
  'LiquefyConfig',
  'LiquefyProviderProps',
  'LiquefyTheme',
]

const entry = readFileSync(new URL('../packages/react/src/index.ts', import.meta.url), 'utf8')
const exportedTypeNames = [...entry.matchAll(/\btype ([A-Za-z0-9_]+)\b/g)].map(([, name]) => name)

describe('public API', () => {
  it('exports exactly the runtime names this version promises', () => {
    expect(Object.keys(liquefy).sort()).toEqual([...RUNTIME_EXPORTS].sort())
  })

  it('exports exactly the type names this version promises', () => {
    expect([...new Set(exportedTypeNames)].sort()).toEqual([...TYPE_EXPORTS].sort())
  })

  it('gives every component a matching Props type', () => {
    const types = new Set(exportedTypeNames)
    const missing = Object.keys(liquefy)
      .filter((name) => /^[A-Z]/.test(name))
      .filter((name) => !types.has(`${name}Props`))
    // These two are pass-through wrappers over <thead> and <tbody> and take plain
    // HTML attributes, so there is nothing of their own to name.
    expect(missing).toEqual(['LiquidTableBody', 'LiquidTableHead'])
  })

  it('exports only components, hooks and named utilities', () => {
    const allowed = new Set(['defaultBreakpoints', 'getLiquefyStyleSheet'])
    const odd = Object.keys(liquefy)
      .filter((name) => !/^[A-Z]/.test(name) && !name.startsWith('use') && !allowed.has(name))
    expect(odd).toEqual([])
  })

  // Deep imports are not part of the contract: the package exposes the root, the
  // stylesheet and the Tailwind bridge, and nothing else.
  it('keeps the package entry points to the three that are documented', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../packages/react/package.json', import.meta.url), 'utf8'),
    )
    expect(Object.keys(manifest.exports).sort()).toEqual(['.', './styles.css', './tailwind.css'])
  })

  it('keeps React a peer dependency rather than bundling it', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../packages/react/package.json', import.meta.url), 'utf8'),
    )
    expect(manifest.peerDependencies.react).toBeTruthy()
    expect(Object.keys(manifest.dependencies)).not.toContain('react')
  })
})
