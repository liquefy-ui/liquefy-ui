import { useMemo, useState, type ComponentType } from 'react'
import { LiquidSegmented, LiquidSlider } from '@liquefy-ui/react'
import * as iconExports from '@liquefy-ui/icons'
import { ChevronRightIcon, type IconProps } from '@liquefy-ui/icons'
import { CopyButton } from './docs-chrome'

/**
 * Every icon the package exports, read off the module itself so a new icon in
 * `packages/icons/src/index.tsx` shows up here without touching the docs.
 */
export const iconEntries: [string, ComponentType<IconProps>][] = Object.entries(
  iconExports as unknown as Record<string, ComponentType<IconProps>>,
)
  .filter(([name]) => name.endsWith('Icon'))
  .sort(([a], [b]) => a.localeCompare(b))

export const iconCount = iconEntries.length

export const iconsImportLine = "import { BellIcon, HeartIcon } from '@liquefy-ui/icons'"

const SIZE_OPTIONS = [
  { label: '16', value: '16' },
  { label: '20', value: '20' },
  { label: '24', value: '24' },
  { label: '32', value: '32' },
]

const propRows: [string, string, string, string][] = [
  ['size', 'number | string', '20', 'Width and height of the SVG. The 24×24 viewBox scales with it.'],
  ['strokeWidth', 'number', '1.8', 'Stroke weight of every path in the icon.'],
  [
    'aria-label',
    'string',
    '—',
    'Names the icon for assistive tech. Omit it and the icon is marked aria-hidden, which is what you want inside a labelled button.',
  ],
]

const IconTile = ({
  Icon,
  name,
  size,
  strokeWidth,
}: {
  Icon: ComponentType<IconProps>
  name: string
  size: number
  strokeWidth: number
}) => {
  const [copied, setCopied] = useState(false)
  const snippet = `<${name} />`

  return (
    <button
      className="docs-icons__tile"
      data-copied={copied}
      onClick={async () => {
        await navigator.clipboard.writeText(snippet)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      }}
      title={`Copy ${snippet}`}
      type="button"
    >
      <span className="docs-icons__glyph">
        <Icon size={size} strokeWidth={strokeWidth} />
      </span>
      <span className="docs-icons__name">{name.replace(/Icon$/, '')}</span>
      <span aria-live="polite" className="docs-icons__hint">{copied ? 'Copied' : 'Click to copy'}</span>
    </button>
  )
}

/**
 * The icon gallery. `query` comes from the shared header search so one input
 * filters components on the catalog pages and icons here.
 */
export const IconsPage = ({ query }: { query: string }) => {
  const [size, setSize] = useState('24')
  const [strokeWidth, setStrokeWidth] = useState(1.8)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return iconEntries
    return iconEntries.filter(([name]) => name.toLowerCase().includes(needle))
  }, [query])

  return (
    <article className="docs-page">
      <nav aria-label="Breadcrumb" className="docs-page__breadcrumbs">
        <a href="#/">Home</a>
        <ChevronRightIcon size={12} />
        <a href="#/components">Components</a>
        <ChevronRightIcon size={12} />
        <span aria-current="page">Icons</span>
      </nav>
      <h1>Icons</h1>
      <p className="docs-page__lede">
        {iconCount} hand-drawn React icons on a 24×24 grid, all rounded caps and joins so they sit evenly next to
        Liquid Glass surfaces. They stroke in <code>currentColor</code>, take no dependencies beyond React, and
        tree-shake per import.
      </p>
      <div className="docs-import">
        <code>{iconsImportLine}</code>
        <CopyButton label="Copy import" text={iconsImportLine} />
      </div>

      <section className="docs-icons">
        <div className="docs-icons__controls">
          <LiquidSegmented
            label="Size"
            onValueChange={setSize}
            options={SIZE_OPTIONS}
            size="sm"
            value={size}
          />
          <LiquidSlider
            endAdornment={strokeWidth.toFixed(1)}
            label="Stroke width"
            max={3}
            min={1}
            onChange={(event) => setStrokeWidth(Number(event.currentTarget.value))}
            step={0.1}
            styles={{ flex: 1, maxWidth: 250, minWidth: 170 }}
            value={strokeWidth}
          />
        </div>

        {filtered.length === 0
          ? <p className="docs-icons__empty">No icon matches “{query}”.</p>
          : (
            <div className="docs-icons__grid">
              {filtered.map(([name, Icon]) => (
                <IconTile Icon={Icon} key={name} name={name} size={Number(size)} strokeWidth={strokeWidth} />
              ))}
            </div>
          )}
      </section>

      <section className="docs-props">
        <h2 id="api">API</h2>
        <p className="docs-props__intro">
          Props shared by every icon. They also forward every <code>svg</code> attribute, so{' '}
          <code>className</code>, <code>style</code> and <code>onClick</code> land on the element.
        </p>
        <div className="docs-props__scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {propRows.map(([name, type, defaultValue, description]) => (
                <tr key={name}>
                  <td><code>{name}</code></td>
                  <td><code className="docs-props__type">{type}</code></td>
                  <td>
                    {defaultValue === '—'
                      ? <span className="docs-props__dash">—</span>
                      : <code>{defaultValue}</code>}
                  </td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  )
}
