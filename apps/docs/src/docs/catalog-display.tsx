import { useState } from 'react'
import {
  LiquidAvatar,
  LiquidAvatarGroup,
  LiquidBadge,
  LiquidButton,
  LiquidChip,
  LiquidDivider,
  LiquidIconButton,
  LiquidList,
  LiquidListItem,
  LiquidListSubheader,
  LiquidTable,
  LiquidTableBody,
  LiquidTableCell,
  LiquidTableContainer,
  LiquidTableHead,
  LiquidTableHeaderCell,
  LiquidTableRow,
  LiquidTooltip,
} from '@liquefy-ui/react'
import {
  BellIcon,
  FolderIcon,
  HeartIcon,
  ImageIcon,
  InfoIcon,
  MailIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
} from '@liquefy-ui/icons'
import type { ComponentDoc } from './types'

const ChipFilterDemo = () => {
  const [selected, setSelected] = useState('glass')
  const filters: Array<{ label: string; value: string }> = [
    { label: 'Glass', value: 'glass' },
    { label: 'Motion', value: 'motion' },
    { label: 'Optics', value: 'optics' },
  ]

  return (
    <>
      {filters.map((filter) => (
        <LiquidChip key={filter.value} onClick={() => setSelected(filter.value)} selected={selected === filter.value}>
          {filter.label}
        </LiquidChip>
      ))}
    </>
  )
}

const ChipDeleteDemo = () => {
  const [chips, setChips] = useState(['WebGL', 'Springs', 'A11y', 'TypeScript'])

  return (
    <>
      {chips.map((chip) => (
        <LiquidChip key={chip} onDelete={() => setChips((current) => current.filter((item) => item !== chip))} variant="tinted">
          {chip}
        </LiquidChip>
      ))}
      {chips.length === 0 && (
        <LiquidButton onClick={() => setChips(['WebGL', 'Springs', 'A11y', 'TypeScript'])} size="sm">
          Reset
        </LiquidButton>
      )}
    </>
  )
}

const tableRows = [
  { component: 'LiquidButton', downloads: '48.2k', size: '2.1 kB', status: 'Stable' },
  { component: 'LiquidDialog', downloads: '31.9k', size: '3.4 kB', status: 'Stable' },
  { component: 'GlassDock', downloads: '18.4k', size: '2.8 kB', status: 'Stable' },
  { component: 'LiquidSelect', downloads: '12.7k', size: '4.0 kB', status: 'New' },
]

export const displayDocs: ComponentDoc[] = [
  {
    demos: [
      {
        code: `<LiquidAvatar name="Ada Lovelace" />
<LiquidAvatar name="Grace Hopper" tint="#c594ff" />
<LiquidAvatar name="Alan Turing" tint="#69dfc4" />
<LiquidAvatar fallback={<UserIcon size={18} />} />`,
        render: () => (
          <>
            <LiquidAvatar name="Ada Lovelace" />
            <LiquidAvatar name="Grace Hopper" tint="#c594ff" />
            <LiquidAvatar name="Alan Turing" tint="#69dfc4" />
            <LiquidAvatar fallback={<UserIcon size={18} />} />
          </>
        ),
        title: 'Initials and fallbacks',
      },
      {
        code: `<LiquidAvatar name="Ada Lovelace" size="sm" />
<LiquidAvatar name="Ada Lovelace" size="md" />
<LiquidAvatar name="Ada Lovelace" size="lg" />
<LiquidAvatar name="Ada Lovelace" size="xl" />`,
        render: () => (
          <>
            <LiquidAvatar name="Ada Lovelace" size="sm" />
            <LiquidAvatar name="Ada Lovelace" size="md" />
            <LiquidAvatar name="Ada Lovelace" size="lg" />
            <LiquidAvatar name="Ada Lovelace" size="xl" />
          </>
        ),
        title: 'Sizes',
      },
      {
        code: `<LiquidAvatarGroup max={3} total={12}>
  <LiquidAvatar name="Ada Lovelace" />
  <LiquidAvatar name="Grace Hopper" tint="#c594ff" />
  <LiquidAvatar name="Alan Turing" tint="#69dfc4" />
  <LiquidAvatar name="Katherine Johnson" tint="#ff9fb5" />
</LiquidAvatarGroup>`,
        render: () => (
          <LiquidAvatarGroup max={3} total={12}>
            <LiquidAvatar name="Ada Lovelace" />
            <LiquidAvatar name="Grace Hopper" tint="#c594ff" />
            <LiquidAvatar name="Alan Turing" tint="#69dfc4" />
            <LiquidAvatar name="Katherine Johnson" tint="#ff9fb5" />
          </LiquidAvatarGroup>
        ),
        title: 'Group with overflow',
      },
    ],
    description: 'Identity discs with image, initials, and custom fallbacks, plus a stacked group that summarizes overflow.',
    importLine: "import { LiquidAvatar, LiquidAvatarGroup } from '@liquefy-ui/react'",
    name: 'Avatar',
    props: [
      { description: 'Image source; falls back to initials on error.', name: 'src', type: 'string' },
      { description: 'Full name used for initials and the title tooltip.', name: 'name', type: 'string' },
      { description: 'Custom fallback node (e.g. an icon).', name: 'fallback', type: 'ReactNode' },
      { defaultValue: "'md'", description: 'Disc dimensions.', name: 'size', type: "'sm' | 'md' | 'lg' | 'xl'" },
      { description: 'Accent color of the disc.', name: 'tint', type: 'string' },
    ],
    propsTitle: 'LiquidAvatar',
    slug: 'avatar',
  },
  {
    demos: [
      {
        code: `<LiquidBadge count={4}>
  <LiquidIconButton label="Notifications"><BellIcon /></LiquidIconButton>
</LiquidBadge>
<LiquidBadge count={128} max={99}>
  <LiquidIconButton label="Inbox"><MailIcon /></LiquidIconButton>
</LiquidBadge>
<LiquidBadge dot tint="#4fd8a4">
  <LiquidIconButton label="Settings"><SettingsIcon /></LiquidIconButton>
</LiquidBadge>`,
        render: () => (
          <>
            <LiquidBadge count={4}>
              <LiquidIconButton label="Notifications"><BellIcon /></LiquidIconButton>
            </LiquidBadge>
            <LiquidBadge count={128} max={99}>
              <LiquidIconButton label="Inbox"><MailIcon /></LiquidIconButton>
            </LiquidBadge>
            <LiquidBadge dot tint="#4fd8a4">
              <LiquidIconButton label="Settings"><SettingsIcon /></LiquidIconButton>
            </LiquidBadge>
          </>
        ),
        title: 'Counts and dots',
      },
    ],
    description: 'Wraps any element with a count bubble or presence dot. Counts clamp at a configurable maximum.',
    importLine: "import { LiquidBadge } from '@liquefy-ui/react'",
    name: 'Badge',
    props: [
      { description: 'Number rendered in the bubble.', name: 'count', type: 'number' },
      { defaultValue: '99', description: 'Counts above this render as “max+”.', name: 'max', type: 'number' },
      { defaultValue: 'false', description: 'Renders a small presence dot instead of a count.', name: 'dot', type: 'boolean' },
      { defaultValue: 'false', description: 'Keeps the bubble visible when count is 0.', name: 'showZero', type: 'boolean' },
      { defaultValue: "'#ff5d73'", description: 'Bubble color.', name: 'tint', type: 'string' },
    ],
    propsTitle: 'LiquidBadge',
    slug: 'badge',
  },
  {
    demos: [
      {
        code: `<LiquidChip>Default</LiquidChip>
<LiquidChip icon={<SparklesIcon size={14} />}>With icon</LiquidChip>
<LiquidChip size="sm" variant="tinted">Small tinted</LiquidChip>
<LiquidChip tint="#69dfc4" variant="tinted">Mint</LiquidChip>`,
        render: () => (
          <>
            <LiquidChip>Default</LiquidChip>
            <LiquidChip icon={<SparklesIcon size={14} />}>With icon</LiquidChip>
            <LiquidChip size="sm" variant="tinted">Small tinted</LiquidChip>
            <LiquidChip tint="#69dfc4" variant="tinted">Mint</LiquidChip>
          </>
        ),
        title: 'Variants',
      },
      {
        code: `const [selected, setSelected] = useState('glass')

<LiquidChip onClick={() => setSelected('glass')} selected={selected === 'glass'}>Glass</LiquidChip>
<LiquidChip onClick={() => setSelected('motion')} selected={selected === 'motion'}>Motion</LiquidChip>`,
        description: 'Chips with onClick become buttons; selected renders the active fill.',
        render: () => <ChipFilterDemo />,
        title: 'Filter chips',
      },
      {
        code: `<LiquidChip onDelete={() => remove(chip)} variant="tinted">{chip}</LiquidChip>`,
        render: () => <ChipDeleteDemo />,
        title: 'Deletable',
      },
    ],
    description: 'Compact glass pills for filters, selections, and tags — clickable, selectable, deletable, and tintable.',
    importLine: "import { LiquidChip } from '@liquefy-ui/react'",
    name: 'Chip',
    props: [
      { defaultValue: "'clear'", description: 'Fill treatment of the pill.', name: 'variant', type: "'clear' | 'tinted'" },
      { defaultValue: "'md'", description: 'Pill density.', name: 'size', type: "'sm' | 'md'" },
      { description: 'Icon rendered before the label.', name: 'icon', type: 'ReactNode' },
      { defaultValue: 'false', description: 'Highlights the chip as active.', name: 'selected', type: 'boolean' },
      { description: 'Makes the chip interactive (renders a button).', name: 'onClick', type: 'MouseEventHandler' },
      { description: 'Shows a delete affordance and is called on delete.', name: 'onDelete', type: '() => void' },
      { description: 'Accent color for this chip.', name: 'tint', type: 'string' },
    ],
    propsTitle: 'LiquidChip',
    slug: 'chip',
  },
  {
    demos: [
      {
        code: `<LiquidTooltip content="Refraction is GPU-accelerated">
  <LiquidButton>Hover me</LiquidButton>
</LiquidTooltip>
<LiquidTooltip content="Below" placement="bottom">
  <LiquidIconButton label="Info"><InfoIcon /></LiquidIconButton>
</LiquidTooltip>
<LiquidTooltip content="To the right" placement="right">
  <LiquidIconButton label="Favorite"><HeartIcon /></LiquidIconButton>
</LiquidTooltip>`,
        render: () => (
          <>
            <LiquidTooltip content="Refraction is GPU-accelerated">
              <LiquidButton>Hover me</LiquidButton>
            </LiquidTooltip>
            <LiquidTooltip content="Below" placement="bottom">
              <LiquidIconButton label="Info"><InfoIcon /></LiquidIconButton>
            </LiquidTooltip>
            <LiquidTooltip content="To the right" placement="right">
              <LiquidIconButton label="Favorite"><HeartIcon /></LiquidIconButton>
            </LiquidTooltip>
          </>
        ),
        title: 'Placements',
      },
    ],
    description: 'A glass bubble on hover and keyboard focus, wired to aria-describedby. Built on Base UI, so it flips and shifts to stay on screen and Escape dismisses it. Four placements, configurable delay.',
    importLine: "import { LiquidTooltip } from '@liquefy-ui/react'",
    name: 'Tooltip',
    props: [
      { description: 'Tooltip content.', name: 'content', required: true, type: 'ReactNode' },
      { description: 'The single element that triggers the tooltip.', name: 'children', required: true, type: 'ReactElement' },
      { defaultValue: "'top'", description: 'Bubble position relative to the trigger.', name: 'placement', type: "'top' | 'bottom' | 'left' | 'right'" },
      { defaultValue: '120', description: 'Show delay in milliseconds.', name: 'delay', type: 'number' },
    ],
    propsTitle: 'LiquidTooltip',
    slug: 'tooltip',
  },
  {
    demos: [
      {
        code: `<LiquidTableContainer>
  <LiquidTable>
    <LiquidTableHead>
      <LiquidTableRow>
        <LiquidTableHeaderCell>Component</LiquidTableHeaderCell>
        <LiquidTableHeaderCell>Status</LiquidTableHeaderCell>
        <LiquidTableHeaderCell align="right">Size</LiquidTableHeaderCell>
        <LiquidTableHeaderCell align="right">Downloads</LiquidTableHeaderCell>
      </LiquidTableRow>
    </LiquidTableHead>
    <LiquidTableBody>
      {rows.map((row) => (
        <LiquidTableRow key={row.component}>
          <LiquidTableCell>{row.component}</LiquidTableCell>
          <LiquidTableCell>{row.status}</LiquidTableCell>
          <LiquidTableCell align="right">{row.size}</LiquidTableCell>
          <LiquidTableCell align="right">{row.downloads}</LiquidTableCell>
        </LiquidTableRow>
      ))}
    </LiquidTableBody>
  </LiquidTable>
</LiquidTableContainer>`,
        render: () => (
          <LiquidTableContainer style={{ width: '100%' }}>
            <LiquidTable>
              <LiquidTableHead>
                <LiquidTableRow>
                  <LiquidTableHeaderCell>Component</LiquidTableHeaderCell>
                  <LiquidTableHeaderCell>Status</LiquidTableHeaderCell>
                  <LiquidTableHeaderCell align="right">Size</LiquidTableHeaderCell>
                  <LiquidTableHeaderCell align="right">Downloads</LiquidTableHeaderCell>
                </LiquidTableRow>
              </LiquidTableHead>
              <LiquidTableBody>
                {tableRows.map((row) => (
                  <LiquidTableRow key={row.component}>
                    <LiquidTableCell>{row.component}</LiquidTableCell>
                    <LiquidTableCell>
                      <LiquidChip size="sm" tint={row.status === 'New' ? '#69dfc4' : undefined} variant="tinted">{row.status}</LiquidChip>
                    </LiquidTableCell>
                    <LiquidTableCell align="right">{row.size}</LiquidTableCell>
                    <LiquidTableCell align="right">{row.downloads}</LiquidTableCell>
                  </LiquidTableRow>
                ))}
              </LiquidTableBody>
            </LiquidTable>
          </LiquidTableContainer>
        ),
        title: 'Basic table',
      },
    ],
    description: 'Semantic table primitives on a glass container: container, table, head, body, rows, and aligned cells with hover states.',
    importLine: "import { LiquidTableContainer, LiquidTable, LiquidTableHead, LiquidTableBody, LiquidTableRow, LiquidTableCell, LiquidTableHeaderCell } from '@liquefy-ui/react'",
    name: 'Table',
    props: [
      { defaultValue: 'true', description: 'Row hover highlight (LiquidTable).', name: 'hover', type: 'boolean' },
      { defaultValue: "'md'", description: 'Cell padding density (LiquidTable).', name: 'size', type: "'sm' | 'md'" },
      { defaultValue: "'left'", description: 'Text alignment (cells).', name: 'align', type: "'left' | 'center' | 'right'" },
      { defaultValue: 'false', description: 'Marks a row as selected (LiquidTableRow).', name: 'selected', type: 'boolean' },
    ],
    propsTitle: 'LiquidTable family',
    slug: 'table',
  },
  {
    demos: [
      {
        code: `<LiquidList>
  <LiquidListSubheader>Library</LiquidListSubheader>
  <LiquidListItem chevron icon={<FolderIcon size={17} />} onActivate={() => {}}
    description="128 items">Projects</LiquidListItem>
  <LiquidListItem chevron icon={<ImageIcon size={17} />} onActivate={() => {}}
    description="2.4 GB used">Media</LiquidListItem>
  <LiquidListItem end="v0.1.0" icon={<SparklesIcon size={17} />}>liquefy-ui</LiquidListItem>
</LiquidList>`,
        render: () => (
          <LiquidList style={{ maxWidth: 420, width: '100%' }}>
            <LiquidListSubheader>Library</LiquidListSubheader>
            <LiquidListItem chevron description="128 items" icon={<FolderIcon size={17} />} onActivate={() => {}}>Projects</LiquidListItem>
            <LiquidListItem chevron description="2.4 GB used" icon={<ImageIcon size={17} />} onActivate={() => {}}>Media</LiquidListItem>
            <LiquidListItem end="v0.1.0" icon={<SparklesIcon size={17} />}>liquefy-ui</LiquidListItem>
          </LiquidList>
        ),
        title: 'Navigation list',
      },
    ],
    description: 'A grouped list surface with icon tiles, two-line items, trailing metadata, chevrons, and subheaders.',
    importLine: "import { LiquidList, LiquidListItem, LiquidListSubheader } from '@liquefy-ui/react'",
    name: 'List',
    props: [
      { description: 'Leading icon tile (LiquidListItem).', name: 'icon', type: 'ReactNode' },
      { description: 'Secondary line under the title.', name: 'description', type: 'ReactNode' },
      { description: 'Trailing metadata (text, chip, switch…).', name: 'end', type: 'ReactNode' },
      { defaultValue: 'false', description: 'Shows a trailing chevron.', name: 'chevron', type: 'boolean' },
      { description: 'Makes the row an interactive button.', name: 'onActivate', type: '() => void' },
    ],
    propsTitle: 'LiquidListItem',
    slug: 'list',
  },
  {
    demos: [
      {
        code: `<p>Above the fold</p>
<LiquidDivider />
<p>Below the fold</p>
<LiquidDivider>Section</LiquidDivider>
<p>Labeled sections read like chapters.</p>`,
        render: () => (
          <div style={{ maxWidth: 420, width: '100%' }}>
            <p style={{ margin: '0 0 4px', opacity: 0.75 }}>Above the fold</p>
            <LiquidDivider />
            <p style={{ margin: '4px 0', opacity: 0.75 }}>Below the fold</p>
            <LiquidDivider>Section</LiquidDivider>
            <p style={{ margin: '4px 0 0', opacity: 0.75 }}>Labeled sections read like chapters.</p>
          </div>
        ),
        title: 'Horizontal, with label',
      },
    ],
    description: 'A gradient hairline separator, horizontal or vertical, with an optional centered label.',
    importLine: "import { LiquidDivider } from '@liquefy-ui/react'",
    name: 'Divider',
    props: [
      { defaultValue: "'horizontal'", description: 'Divider direction.', name: 'orientation', type: "'horizontal' | 'vertical'" },
      { description: 'Optional label rendered mid-line.', name: 'children', type: 'ReactNode' },
    ],
    propsTitle: 'LiquidDivider',
    slug: 'divider',
  },
]
