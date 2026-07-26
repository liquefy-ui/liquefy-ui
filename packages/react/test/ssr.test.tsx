import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import * as liquefy from '../src/index'
import { LiquefyProvider } from '../src/provider'

const {
  DockItem,
  GlassCard,
  GlassDock,
  LiquidAccordion,
  LiquidAccordionItem,
  LiquidAlert,
  LiquidAvatar,
  LiquidAvatarGroup,
  LiquidBadge,
  LiquidBreadcrumbs,
  LiquidButton,
  LiquidCheckbox,
  LiquidChip,
  LiquidDialog,
  LiquidDivider,
  LiquidDrawer,
  LiquidIconButton,
  LiquidList,
  LiquidListItem,
  LiquidListSubheader,
  LiquidMenu,
  LiquidPagination,
  LiquidProgress,
  LiquidRadio,
  LiquidRadioGroup,
  LiquidRating,
  LiquidSegmented,
  LiquidSelect,
  LiquidSkeleton,
  LiquidSlider,
  LiquidSpinner,
  LiquidSurface,
  LiquidSwitch,
  LiquidTab,
  LiquidTabList,
  LiquidTabPanel,
  LiquidTable,
  LiquidTableBody,
  LiquidTableCell,
  LiquidTableContainer,
  LiquidTableHead,
  LiquidTableHeaderCell,
  LiquidTableRow,
  LiquidTabs,
  LiquidTextArea,
  LiquidTextField,
  LiquidToastProvider,
  LiquidTooltip,
} = liquefy

const options = [{ label: 'One', value: 'one' }, { label: 'Two', value: 'two' }]

/**
 * One entry per exported component. The point is not to assert markup, it is to
 * prove the module can be evaluated and rendered where there is no `window` —
 * which is exactly what a Next.js server render does before hydration.
 */
const cases: Array<[string, ReactElement]> = [
  ['GlassCard', <GlassCard description="desc" eyebrow="new" footer="foot" title="Card">body</GlassCard>],
  ['GlassDock', <GlassDock><DockItem icon={<span />} label="Home" /></GlassDock>],
  [
    'LiquidAccordion',
    <LiquidAccordion defaultValue={['a']}>
      <LiquidAccordionItem title="A" value="a">body</LiquidAccordionItem>
      <LiquidAccordionItem subtitle="sub" title="B" value="b">body</LiquidAccordionItem>
    </LiquidAccordion>,
  ],
  ['LiquidAlert', <LiquidAlert severity="success" title="Saved">Done</LiquidAlert>],
  ['LiquidAvatarGroup', <LiquidAvatarGroup max={2}><LiquidAvatar>YS</LiquidAvatar><LiquidAvatar>AB</LiquidAvatar></LiquidAvatarGroup>],
  ['LiquidBadge', <LiquidBadge>3</LiquidBadge>],
  ['LiquidBreadcrumbs', <LiquidBreadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Now' }]} />],
  ['LiquidButton', <LiquidButton iconAfter={<span />} size="lg">Go</LiquidButton>],
  ['LiquidCheckbox', <LiquidCheckbox defaultChecked label="Check" />],
  ['LiquidChip', <LiquidChip onDelete={() => {}} variant="tinted">Tag</LiquidChip>],
  ['LiquidDialog (closed)', <LiquidDialog onOpenChange={() => {}} open={false} title="Hi">body</LiquidDialog>],
  ['LiquidDialog (open)', <LiquidDialog description="desc" onOpenChange={() => {}} open title="Hi">body</LiquidDialog>],
  ['LiquidDivider', <LiquidDivider>or</LiquidDivider>],
  ['LiquidDrawer (closed)', <LiquidDrawer onOpenChange={() => {}} open={false} title="Menu">body</LiquidDrawer>],
  ['LiquidDrawer (open)', <LiquidDrawer onOpenChange={() => {}} open side="left" title="Menu">body</LiquidDrawer>],
  ['LiquidIconButton', <LiquidIconButton label="Close"><span /></LiquidIconButton>],
  [
    'LiquidList',
    <LiquidList>
      <LiquidListSubheader>Group</LiquidListSubheader>
      <LiquidListItem chevron description="sub">Item</LiquidListItem>
    </LiquidList>,
  ],
  [
    'LiquidMenu',
    <LiquidMenu
      items={[{ label: 'Edit' }, { type: 'separator' }, { danger: true, label: 'Delete' }]}
      trigger={<LiquidButton>Open</LiquidButton>}
    />,
  ],
  ['LiquidPagination', <LiquidPagination count={5} page={2} />],
  ['LiquidProgress', <LiquidProgress value={40} />],
  ['LiquidRadioGroup', <LiquidRadioGroup defaultValue="one"><LiquidRadio value="one">One</LiquidRadio></LiquidRadioGroup>],
  ['LiquidRating', <LiquidRating defaultValue={3} />],
  ['LiquidSegmented', <LiquidSegmented defaultValue="one" options={options} />],
  ['LiquidSelect', <LiquidSelect hint="hint" label="Pick" options={options} />],
  ['LiquidSkeleton', <LiquidSkeleton />],
  ['LiquidSlider', <LiquidSlider defaultValue={30} />],
  ['LiquidSpinner', <LiquidSpinner />],
  ['LiquidSurface', <LiquidSurface>surface</LiquidSurface>],
  ['LiquidSwitch', <LiquidSwitch defaultChecked label="On" />],
  [
    'LiquidTable',
    <LiquidTableContainer>
      <LiquidTable>
        <LiquidTableHead><LiquidTableRow><LiquidTableHeaderCell>H</LiquidTableHeaderCell></LiquidTableRow></LiquidTableHead>
        <LiquidTableBody><LiquidTableRow><LiquidTableCell>C</LiquidTableCell></LiquidTableRow></LiquidTableBody>
      </LiquidTable>
    </LiquidTableContainer>,
  ],
  [
    'LiquidTabs',
    <LiquidTabs defaultValue="one">
      <LiquidTabList label="Tabs"><LiquidTab value="one">One</LiquidTab><LiquidTab value="two">Two</LiquidTab></LiquidTabList>
      <LiquidTabPanel value="one">First</LiquidTabPanel>
      <LiquidTabPanel value="two">Second</LiquidTabPanel>
    </LiquidTabs>,
  ],
  ['LiquidTextArea', <LiquidTextArea label="Notes" />],
  ['LiquidTextField', <LiquidTextField hint="hint" label="Name" />],
  ['LiquidToastProvider', <LiquidToastProvider>app</LiquidToastProvider>],
  ['LiquidTooltip', <LiquidTooltip content="Tip"><LiquidButton>Hover</LiquidButton></LiquidTooltip>],
]

/** Every component that appears somewhere in `cases` above. */
const covered = new Set([
  'DockItem', 'GlassCard', 'GlassDock', 'LiquidAccordion', 'LiquidAccordionItem',
  'LiquidAlert', 'LiquidAvatar', 'LiquidAvatarGroup', 'LiquidBadge', 'LiquidBreadcrumbs',
  'LiquidButton', 'LiquidCheckbox', 'LiquidChip', 'LiquidDialog', 'LiquidDivider', 'LiquidDrawer',
  'LiquidIconButton', 'LiquidList', 'LiquidListItem', 'LiquidListSubheader', 'LiquidMenu',
  'LiquidPagination', 'LiquidProgress', 'LiquidRadio', 'LiquidRadioGroup', 'LiquidRating',
  'LiquidSegmented', 'LiquidSelect', 'LiquidSkeleton', 'LiquidSlider', 'LiquidSpinner',
  'LiquidSurface', 'LiquidSwitch', 'LiquidTab', 'LiquidTabList', 'LiquidTabPanel', 'LiquidTable',
  'LiquidTableBody', 'LiquidTableCell', 'LiquidTableContainer', 'LiquidTableHead',
  'LiquidTableHeaderCell', 'LiquidTableRow', 'LiquidTabs', 'LiquidTextArea', 'LiquidTextField',
  'LiquidToastProvider', 'LiquidTooltip', 'LiquefyProvider',
])

describe('server rendering', () => {
  it.each(cases)('renders %s without a DOM', (_name, element) => {
    expect(() => renderToStaticMarkup(<LiquefyProvider theme="dark">{element}</LiquefyProvider>)).not.toThrow()
  })

  it('covers every component exported from the package', () => {
    // Every capitalised export is a component. Listing them keeps a new component
    // from shipping without ever being rendered where there is no `window`.
    const missing = Object.keys(liquefy).filter((name) => /^[A-Z]/.test(name) && !covered.has(name))
    expect(missing).toEqual([])
  })
})
