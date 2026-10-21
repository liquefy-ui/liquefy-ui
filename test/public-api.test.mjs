import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as iconEffects from '../packages/icons/src/effects.ts'
import * as icons from '../packages/icons/src/index.tsx'
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
  'LiquidDatePicker',
  'LiquidDialog',
  'LiquidDivider',
  'LiquidDrawer',
  'LiquidGauge',
  'LiquidGlass',
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
  'useLiquefyPortalContainer',
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
  'LiquidDatePickerProps',
  'LiquidDialogProps',
  'LiquidDividerProps',
  'LiquidDrawerProps',
  'LiquidGaugeProps',
  'LiquidGlassOptions',
  'LiquidGlassProps',
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

/**
 * The icons promise two things the motion must not break: that the root is
 * nothing but icons, which render on a server and cost a bundle only the ones it
 * imports, and that motion lives behind its own entry, paid for only by an app
 * that imports it.
 */
describe('icons public API', () => {
  const manifest = JSON.parse(readFileSync(new URL('../packages/icons/package.json', import.meta.url), 'utf8'))
  const effectsEntry = readFileSync(new URL('../packages/icons/src/effects.ts', import.meta.url), 'utf8')

  it('exports only icons from the root', () => {
    const names = Object.keys(icons)
    expect(names.length).toBeGreaterThan(40)
    expect(names.filter((name) => !name.endsWith('Icon'))).toEqual([])
  })

  it('exports exactly the effects this version promises from icons/effects', () => {
    expect(Object.keys(iconEffects).sort()).toEqual(['IconEffect', 'MagicReplace'])
    const types = [...effectsEntry.matchAll(/\btype ([A-Za-z0-9_]+)\b/g)].map(([, name]) => name)
    expect([...new Set(types)].sort()).toEqual([
      'IconBounceDirection',
      'IconDrawOrder',
      'IconEffectName',
      'IconEffectProps',
      'IconRotateDirection',
      'IconWiggleDirection',
      'MagicReplaceFallback',
      'MagicReplaceProps',
      'MagicReplaceTransition',
    ])
  })

  it('keeps the entry points to the root and the effects', () => {
    expect(Object.keys(manifest.exports).sort()).toEqual(['.', './effects'])
  })

  // TypeScript's node10 resolution and older bundlers never read \`exports\`, so
  // \`@liquefy-ui/icons/effects\` is also a folder whose manifest points into dist.
  it('lets resolvers that ignore exports find icons/effects too', () => {
    const stub = JSON.parse(readFileSync(new URL('../packages/icons/effects/package.json', import.meta.url), 'utf8'))
    const entry = manifest.exports['./effects']
    expect(manifest.files).toContain('effects')
    expect(`./${stub.main.replace('../', '')}`).toBe(entry.require.default)
    expect(`./${stub.module.replace('../', '')}`).toBe(entry.import.default)
    expect(`./${stub.types.replace('../', '')}`).toBe(entry.require.types)
  })

  it('depends on nothing but React, as a peer', () => {
    expect(manifest.dependencies).toBeUndefined()
    expect(Object.keys(manifest.peerDependencies)).toEqual(['react'])
    expect(manifest.sideEffects).toBe(false)
  })
})
