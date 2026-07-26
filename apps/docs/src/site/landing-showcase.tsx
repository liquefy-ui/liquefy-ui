import { useState, type ReactNode } from 'react'
import {
  DockItem,
  GlassDock,
  LiquidAccordion,
  LiquidAccordionItem,
  LiquidAlert,
  LiquidAvatar,
  LiquidAvatarGroup,
  LiquidBadge,
  LiquidButton,
  LiquidCheckbox,
  LiquidChip,
  LiquidDialog,
  LiquidIconButton,
  LiquidProgress,
  LiquidRadio,
  LiquidRadioGroup,
  LiquidRating,
  LiquidSelect,
  LiquidSlider,
  LiquidSpinner,
  LiquidSwitch,
  LiquidTab,
  LiquidTabList,
  LiquidTabPanel,
  LiquidTabs,
  LiquidTextField,
  LiquidTooltip,
} from '@liquefy-ui/react'
import {
  ArrowRightIcon,
  BellIcon,
  ComponentsIcon,
  HeartIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
} from '@liquefy-ui/icons'
import { componentCount } from '../docs/catalog'

type ShowcaseTileProps = {
  children: ReactNode
  hint: string
  slug: string
  title: string
  wide?: boolean
}

const ShowcaseTile = ({ children, hint, slug, title, wide = false }: ShowcaseTileProps) => (
  <article className="showcase-tile" data-wide={wide}>
    <header>
      <div>
        <h3>{title}</h3>
        <p>{hint}</p>
      </div>
      <a aria-label={`${title} documentation`} href={`#/components/${slug}`}>
        Docs
        <ArrowRightIcon size={14} />
      </a>
    </header>
    <div className="showcase-tile__stage">{children}</div>
  </article>
)

const SELECT_OPTIONS = [
  { label: 'Clear', value: 'clear' },
  { label: 'Tinted', value: 'tinted' },
  { label: 'Solid', value: 'solid' },
]

export const Showcase = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dock, setDock] = useState(0)
  const [material, setMaterial] = useState('clear')
  const [tab, setTab] = useState('overview')

  return (
    <section className="section showcase" id="components">
      <header className="section-heading">
        <span>Components</span>
        <h2>{componentCount} primitives, all of them real.</h2>
        <p>
          Every one ships focus, keyboard, and disabled states, an accessible name, and a CSS-only
          fallback for when WebGL is unavailable. Touch anything below, then open its page for the
          full API.
        </p>
      </header>

      <div className="showcase-grid">
        <ShowcaseTile hint="Spring-driven press, squash, and rebound at three sizes." slug="liquid-button" title="Button" wide>
          <div className="stage-row">
            <LiquidButton iconBefore={<SparklesIcon />} size="lg">Create</LiquidButton>
            <LiquidButton iconAfter={<ArrowRightIcon />}>Continue</LiquidButton>
            <LiquidButton size="sm">Small</LiquidButton>
            <LiquidButton isLoading>Saving</LiquidButton>
            <LiquidIconButton label="Settings"><SettingsIcon /></LiquidIconButton>
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="role=switch, checkbox and radio group — controlled or not." slug="liquid-switch" title="Toggles">
          <div className="stage-stack">
            <div className="stage-line"><span>Refraction</span><LiquidSwitch defaultChecked label="Refraction" /></div>
            <LiquidCheckbox defaultChecked label="Follow system appearance" />
            <LiquidRadioGroup defaultValue="jelly" label="Motion" name="showcase-motion">
              <LiquidRadio label="Jelly" value="jelly" />
              <LiquidRadio label="Instant" value="instant" />
            </LiquidRadioGroup>
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="Native range input with a luminous track and a dimensional thumb." slug="liquid-slider" title="Slider & rating">
          <div className="stage-stack">
            <LiquidSlider defaultValue={62} label="Spatial depth" max={100} min={0} />
            <LiquidRating defaultValue={4} label="Feel" />
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="Labels, adornments and popovers that stay legible over glass." slug="liquid-text-field" title="Fields">
          <div className="stage-stack">
            <LiquidTextField label="Search" placeholder="Try “button”" startAdornment={<SearchIcon size={18} />} />
            <LiquidSelect
              label="Material"
              onValueChange={setMaterial}
              options={SELECT_OPTIONS}
              value={material}
            />
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="An animated indicator that measures the active tab, not a fixed width." slug="liquid-tabs" title="Tabs" wide>
          <LiquidTabs onValueChange={setTab} value={tab}>
            <LiquidTabList label="Showcase sections">
              <LiquidTab value="overview">Overview</LiquidTab>
              <LiquidTab value="optics">Optics</LiquidTab>
              <LiquidTab value="motion">Motion</LiquidTab>
            </LiquidTabList>
            <LiquidTabPanel value="overview">Arrow keys move between tabs; Home and End jump to the ends.</LiquidTabPanel>
            <LiquidTabPanel value="optics">A displacement shader bends the backdrop at the bezel of each surface.</LiquidTabPanel>
            <LiquidTabPanel value="motion">Presses run through a critically tuned spring rather than a CSS curve.</LiquidTabPanel>
          </LiquidTabs>
        </ShowcaseTile>

        <ShowcaseTile hint="Native dialog semantics: Escape, focus trap, and backdrop click." slug="liquid-dialog" title="Dialog">
          <LiquidButton onClick={() => setDialogOpen(true)}>Open dialog</LiquidButton>
        </ShowcaseTile>

        <ShowcaseTile hint="A functional layer that floats above content and glides between items." slug="glass-dock" title="Dock">
          <GlassDock>
            <DockItem active={dock === 0} icon={<SparklesIcon />} label="Magic" onClick={() => setDock(0)} />
            <DockItem active={dock === 1} icon={<ComponentsIcon />} label="Components" onClick={() => setDock(1)} />
            <DockItem active={dock === 2} icon={<SearchIcon />} label="Search" onClick={() => setDock(2)} />
            <DockItem active={dock === 3} icon={<BellIcon />} label="Alerts" onClick={() => setDock(3)} />
          </GlassDock>
        </ShowcaseTile>

        <ShowcaseTile hint="Severity colouring that survives a transparent background." slug="liquid-alert" title="Alert">
          <div className="stage-stack">
            <LiquidAlert severity="success" title="Deployed">Production is live on the new material.</LiquidAlert>
            <LiquidAlert severity="warning" title="Reduced motion">Springs are disabled for this visitor.</LiquidAlert>
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="Identity, counts, and status in one visual language." slug="liquid-avatar" title="Avatars & badges">
          <div className="stage-stack">
            <LiquidAvatarGroup max={4}>
              <LiquidAvatar name="Ada Lovelace" />
              <LiquidAvatar name="Grace Hopper" />
              <LiquidAvatar name="Alan Turing" />
              <LiquidAvatar name="Radia Perlman" />
              <LiquidAvatar name="Barbara Liskov" />
            </LiquidAvatarGroup>
            <div className="stage-row">
              <LiquidBadge count={12} />
              <LiquidChip>Glass</LiquidChip>
              <LiquidChip>Springs</LiquidChip>
              <LiquidTooltip content="Anchored, dismissible, keyboard reachable">
                <LiquidIconButton label="Profile"><UserIcon /></LiquidIconButton>
              </LiquidTooltip>
            </div>
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="Determinate, indeterminate, and a spinner that respects motion settings." slug="liquid-progress" title="Progress">
          <div className="stage-stack">
            <LiquidProgress label="Uploading" value={68} />
            <div className="stage-row"><LiquidSpinner /><span className="stage-note">Working…</span></div>
          </div>
        </ShowcaseTile>

        <ShowcaseTile hint="Disclosure with height that animates from the measured content." slug="liquid-accordion" title="Accordion" wide>
          <LiquidAccordion defaultValue={['optics']}>
            <LiquidAccordionItem title="What makes it liquid?" value="optics">
              A WebGL displacement pass samples the backdrop and offsets it near the bezel, so the edge
              refracts instead of only blurring.
            </LiquidAccordionItem>
            <LiquidAccordionItem title="Does it work without a GPU?" value="fallback">
              Yes. Pass <code>webgl={'{false}'}</code> and every surface falls back to a CSS-only
              treatment with the same tokens and layout.
            </LiquidAccordionItem>
            <LiquidAccordionItem title="Is the motion accessible?" value="motion">
              The springs are a provider-level switch: <code>motion={'{false}'}</code> turns them off for a
              whole subtree, so your app decides how to answer <code>prefers-reduced-motion</code> rather
              than the library deciding for it.
            </LiquidAccordionItem>
          </LiquidAccordion>
        </ShowcaseTile>
      </div>

      <div className="showcase-cta">
        <LiquidButton iconAfter={<ArrowRightIcon />} onClick={() => { window.location.hash = '#/components' }} size="lg">
          Browse all {componentCount} components
        </LiquidButton>
        <a className="text-link" href="#/components/icons">
          <HeartIcon size={15} />
          …and the icon set
        </a>
      </div>

      <LiquidDialog
        description="Native dialog semantics with a responsive Liquid Glass surface."
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        title="It behaves as well as it looks."
      >
        <p>
          Escape, backdrop clicks, and focus management stay browser-native. liquefy-ui only adds the
          material and the motion.
        </p>
        <div className="stage-row">
          <LiquidButton onClick={() => setDialogOpen(false)}>Got it</LiquidButton>
        </div>
      </LiquidDialog>
    </section>
  )
}
