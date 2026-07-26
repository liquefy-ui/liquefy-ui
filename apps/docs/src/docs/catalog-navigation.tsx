import { useState } from 'react'
import {
  DockItem,
  GlassDock,
  LiquidBreadcrumbs,
  LiquidButton,
  LiquidDrawer,
  LiquidIconButton,
  LiquidMenu,
  LiquidPagination,
  LiquidSwitch,
  LiquidTab,
  LiquidTabList,
  LiquidTabPanel,
  LiquidTabs,
  LiquidTextField,
} from '@liquefy-ui/react'
import {
  CommandIcon,
  ComponentsIcon,
  CopyIcon,
  DownloadIcon,
  FolderIcon,
  HomeIcon,
  MoreHorizontalIcon,
  SearchIcon,
  ShareIcon,
  SparklesIcon,
  TrashIcon,
} from '@liquefy-ui/icons'
import type { ComponentDoc } from './types'

const DockDemo = () => {
  const [active, setActive] = useState(0)

  return (
    <GlassDock>
      <DockItem active={active === 0} icon={<SparklesIcon />} label="Magic" onClick={() => setActive(0)} />
      <DockItem active={active === 1} icon={<ComponentsIcon />} label="Components" onClick={() => setActive(1)} />
      <DockItem active={active === 2} icon={<SearchIcon />} label="Search" onClick={() => setActive(2)} />
      <DockItem active={active === 3} icon={<CommandIcon />} label="Commands" onClick={() => setActive(3)} />
    </GlassDock>
  )
}

const DrawerDemo = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <LiquidButton onClick={() => setOpen(true)}>Open drawer</LiquidButton>
      <LiquidDrawer onOpenChange={setOpen} open={open} title="Filters">
        <div style={{ display: 'grid', gap: 20 }}>
          <LiquidTextField label="Keyword" placeholder="glass" startAdornment={<SearchIcon size={17} />} />
          <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>Only stable</span>
            <LiquidSwitch defaultChecked label="Only stable" />
          </div>
          <LiquidButton onClick={() => setOpen(false)}>Apply</LiquidButton>
        </div>
      </LiquidDrawer>
    </>
  )
}

const MenuDemo = () => (
  <LiquidMenu
    items={[
      { icon: <CopyIcon size={16} />, label: 'Duplicate', shortcut: '⌘D' },
      { icon: <ShareIcon size={16} />, label: 'Share…', shortcut: '⌘S' },
      { icon: <DownloadIcon size={16} />, label: 'Download' },
      { type: 'separator' },
      { danger: true, icon: <TrashIcon size={16} />, label: 'Delete', shortcut: '⌫' },
    ]}
    trigger={<LiquidIconButton label="More actions"><MoreHorizontalIcon /></LiquidIconButton>}
  />
)

export const navigationDocs: ComponentDoc[] = [
  {
    demos: [
      {
        code: `<LiquidTabs defaultValue="optics">
  <LiquidTabList label="Documentation">
    <LiquidTab value="optics">Optics</LiquidTab>
    <LiquidTab value="motion">Motion</LiquidTab>
    <LiquidTab value="a11y">Accessibility</LiquidTab>
  </LiquidTabList>
  <LiquidTabPanel value="optics">A WebGL lens bends the live backdrop…</LiquidTabPanel>
  <LiquidTabPanel value="motion">Underdamped springs drive every surface…</LiquidTabPanel>
  <LiquidTabPanel value="a11y">Focus, keyboard, and reduced-motion aware…</LiquidTabPanel>
</LiquidTabs>`,
        render: () => (
          <LiquidTabs defaultValue="optics" style={{ maxWidth: 460, width: '100%' }}>
            <LiquidTabList label="Documentation">
              <LiquidTab value="optics">Optics</LiquidTab>
              <LiquidTab value="motion">Motion</LiquidTab>
              <LiquidTab value="a11y">Accessibility</LiquidTab>
            </LiquidTabList>
            <LiquidTabPanel value="optics">
              <p style={{ lineHeight: 1.6, margin: 0, opacity: 0.75 }}>A WebGL shader bakes a rounded-rect lens displacement map, applied to the live backdrop at the bezel.</p>
            </LiquidTabPanel>
            <LiquidTabPanel value="motion">
              <p style={{ lineHeight: 1.6, margin: 0, opacity: 0.75 }}>Scale, skew, and tilt run on deliberately underdamped springs, so fast sweeps make surfaces sway.</p>
            </LiquidTabPanel>
            <LiquidTabPanel value="a11y">
              <p style={{ lineHeight: 1.6, margin: 0, opacity: 0.75 }}>Every primitive ships focus, disabled, and keyboard states; motion and transparency can be toned down per subtree.</p>
            </LiquidTabPanel>
          </LiquidTabs>
        ),
        title: 'Basic',
      },
    ],
    description: 'Composable tabs — LiquidTabs, LiquidTabList, LiquidTab, and LiquidTabPanel — with a glowing underline indicator. Base UI supplies the roving tabindex, arrow/Home/End keys, and the aria wiring between each tab and its panel.',
    importLine: "import { LiquidTabs, LiquidTabList, LiquidTab, LiquidTabPanel } from '@liquefy-ui/react'",
    name: 'Tabs',
    preview: () => (
      <LiquidTabs defaultValue="optics">
        <LiquidTabList label="Preview">
          <LiquidTab value="optics">Optics</LiquidTab>
          <LiquidTab value="motion">Motion</LiquidTab>
        </LiquidTabList>
        <LiquidTabPanel value="optics">A displacement map, applied at the bezel.</LiquidTabPanel>
        <LiquidTabPanel value="motion">Springs, not easing curves.</LiquidTabPanel>
      </LiquidTabs>
    ),
    props: [
      { description: 'Controlled active value (LiquidTabs).', name: 'value', type: 'string' },
      { description: 'Initial active value when uncontrolled.', name: 'defaultValue', type: 'string' },
      { description: 'Called with the newly active value.', name: 'onValueChange', type: '(value: string) => void' },
      { description: 'Identity of a tab/panel pair (LiquidTab, LiquidTabPanel).', name: 'value', required: true, type: 'string' },
      { description: 'Optional icon before the tab label (LiquidTab).', name: 'icon', type: 'ReactNode' },
    ],
    propsTitle: 'LiquidTabs family',
    slug: 'tabs',
  },
  {
    demos: [
      {
        code: `<LiquidBreadcrumbs
  items={[
    { href: '#', icon: <HomeIcon size={14} />, label: 'Home' },
    { href: '#', icon: <FolderIcon size={14} />, label: 'Library' },
    { label: 'Liquid Glass' },
  ]}
/>`,
        render: () => (
          <LiquidBreadcrumbs
            items={[
              { href: '#/components/breadcrumbs', icon: <HomeIcon size={14} />, label: 'Home' },
              { href: '#/components/breadcrumbs', icon: <FolderIcon size={14} />, label: 'Library' },
              { label: 'Liquid Glass' },
            ]}
          />
        ),
        title: 'Basic',
      },
    ],
    description: 'A trail of links to the current page, with icons, custom separators, and aria-current on the final crumb.',
    importLine: "import { LiquidBreadcrumbs } from '@liquefy-ui/react'",
    name: 'Breadcrumbs',
    props: [
      { description: 'Crumbs with label and optional href/onClick/icon.', name: 'items', required: true, type: 'LiquidBreadcrumbItem[]' },
      { defaultValue: 'chevron', description: 'Custom separator node.', name: 'separator', type: 'ReactNode' },
      { defaultValue: "'Breadcrumb'", description: 'Accessible name of the nav.', name: 'label', type: 'string' },
    ],
    propsTitle: 'LiquidBreadcrumbs',
    slug: 'breadcrumbs',
  },
  {
    demos: [
      {
        code: `<LiquidPagination count={12} defaultPage={4} />`,
        render: () => <LiquidPagination count={12} defaultPage={4} />,
        title: 'Basic',
      },
      {
        code: `<LiquidPagination count={30} defaultPage={15} siblingCount={2} />`,
        render: () => <LiquidPagination count={30} defaultPage={15} siblingCount={2} />,
        title: 'Wider siblings',
      },
    ],
    description: 'Page navigation with smart ellipsis, previous/next controls, and controlled or uncontrolled state.',
    importLine: "import { LiquidPagination } from '@liquefy-ui/react'",
    name: 'Pagination',
    props: [
      { description: 'Total number of pages.', name: 'count', required: true, type: 'number' },
      { description: 'Controlled current page.', name: 'page', type: 'number' },
      { defaultValue: '1', description: 'Initial page when uncontrolled.', name: 'defaultPage', type: 'number' },
      { defaultValue: '1', description: 'Pages shown on each side of the current page.', name: 'siblingCount', type: 'number' },
      { description: 'Called with the new page.', name: 'onPageChange', type: '(page: number) => void' },
    ],
    propsTitle: 'LiquidPagination',
    slug: 'pagination',
  },
  {
    demos: [
      {
        code: `<LiquidMenu
  items={[
    { icon: <CopyIcon size={16} />, label: 'Duplicate', shortcut: '⌘D' },
    { icon: <ShareIcon size={16} />, label: 'Share…', shortcut: '⌘S' },
    { icon: <DownloadIcon size={16} />, label: 'Download' },
    { type: 'separator' },
    { danger: true, icon: <TrashIcon size={16} />, label: 'Delete', shortcut: '⌫' },
  ]}
  trigger={<LiquidIconButton label="More actions"><MoreHorizontalIcon /></LiquidIconButton>}
/>`,
        render: () => <MenuDemo />,
        stageAlign: 'top',
        stageMinHeight: 300,
        title: 'Action menu',
      },
    ],
    description: 'A dropdown action menu on a glass popover: icons, shortcuts, separators and danger items. Base UI adds arrow-key navigation, typeahead, focus return to the trigger, and a popup that flips and caps its height to stay on screen.',
    importLine: "import { LiquidMenu } from '@liquefy-ui/react'",
    name: 'Menu',
    props: [
      { description: 'The element that toggles the menu.', name: 'trigger', required: true, type: 'ReactElement' },
      { description: 'Menu entries or separators.', name: 'items', required: true, type: 'LiquidMenuItemDef[]' },
      { defaultValue: "'start'", description: 'Popup alignment relative to the trigger.', name: 'align', type: "'start' | 'end'" },
    ],
    propsTitle: 'LiquidMenu',
    slug: 'menu',
  },
  {
    demos: [
      {
        code: `const [open, setOpen] = useState(false)

<LiquidButton onClick={() => setOpen(true)}>Open drawer</LiquidButton>
<LiquidDrawer onOpenChange={setOpen} open={open} title="Filters">
  …
</LiquidDrawer>`,
        render: () => <DrawerDemo />,
        title: 'Right side panel',
      },
    ],
    description: 'A sliding side panel built on Base UI, with a trapped focus ring, scroll lock and Escape handling. Slides from the left, right, or bottom edge.',
    importLine: "import { LiquidDrawer } from '@liquefy-ui/react'",
    name: 'Drawer',
    props: [
      { description: 'Whether the drawer is shown.', name: 'open', required: true, type: 'boolean' },
      { description: 'Called when the drawer wants to open or close.', name: 'onOpenChange', required: true, type: '(open: boolean) => void' },
      { defaultValue: "'right'", description: 'Edge the panel slides from.', name: 'side', type: "'left' | 'right' | 'bottom'" },
      { description: 'Heading of the drawer.', name: 'title', type: 'ReactNode' },
    ],
    propsTitle: 'LiquidDrawer',
    slug: 'drawer',
  },
  {
    demos: [
      {
        code: `<GlassDock>
  <DockItem active icon={<SparklesIcon />} label="Magic" />
  <DockItem icon={<ComponentsIcon />} label="Components" />
  <DockItem icon={<SearchIcon />} label="Search" />
  <DockItem icon={<CommandIcon />} label="Commands" />
</GlassDock>`,
        render: () => <DockDemo />,
        title: 'Basic',
      },
    ],
    description: 'A floating functional layer for primary navigation, with a sliding active indicator that glides between items.',
    importLine: "import { GlassDock, DockItem } from '@liquefy-ui/react'",
    name: 'Dock',
    props: [
      { description: 'Icon of the item (DockItem).', name: 'icon', required: true, type: 'ReactNode' },
      { description: 'Accessible label (DockItem).', name: 'label', required: true, type: 'string' },
      { defaultValue: 'false', description: 'Marks the item active and moves the indicator.', name: 'active', type: 'boolean' },
      { defaultValue: "'inline'", description: 'Inline flow or floating fixed position (GlassDock).', name: 'position', type: "'inline' | 'floating'" },
    ],
    propsTitle: 'GlassDock / DockItem',
    slug: 'dock',
  },
]
