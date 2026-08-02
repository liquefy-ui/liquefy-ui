import { useState } from 'react'
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidIconButton,
  LiquidRadio,
  LiquidRadioGroup,
  LiquidRating,
  LiquidSegmented,
  LiquidSelect,
  LiquidSlider,
  LiquidSwitch,
  LiquidTextArea,
  LiquidTextField,
} from '@liquefy-ui/react'
import {
  BellIcon,
  HeartIcon,
  LockIcon,
  MailIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  TrashIcon,
} from '@liquefy-ui/icons'
import type { ComponentDoc } from './types'

const ButtonLoadingDemo = () => {
  const [loading, setLoading] = useState(false)

  return (
    <LiquidButton
      isLoading={loading}
      onClick={() => {
        setLoading(true)
        window.setTimeout(() => setLoading(false), 1800)
      }}
    >
      Save changes
    </LiquidButton>
  )
}

const SelectDemo = () => {
  const [value, setValue] = useState('aurora')

  return (
    <LiquidSelect
      label="Theme preset"
      onValueChange={setValue}
      options={[
        { label: 'Aurora', value: 'aurora' },
        { label: 'Midnight', value: 'midnight' },
        { label: 'Prism', value: 'prism' },
        { label: 'Tide (soon)', disabled: true, value: 'tide' },
      ]}
      value={value}
    />
  )
}

const RatingDemo = () => {
  const [value, setValue] = useState(4)

  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: 16 }}>
      <LiquidRating onValueChange={setValue} value={value} />
      <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{value} / 5</span>
    </div>
  )
}

export const inputDocs: ComponentDoc[] = [
  {
    demos: [
      {
        code: `<LiquidButton>Default</LiquidButton>
<LiquidButton disabled>Disabled</LiquidButton>`,
        description: 'One restrained outline style — no fill, just a faint tinted edge that warms on hover. For a filled emphasis, wrap content in a tinted LiquidSurface.',
        render: () => (
          <>
            <LiquidButton>Default</LiquidButton>
            <LiquidButton disabled>Disabled</LiquidButton>
          </>
        ),
        title: 'Default',
      },
      {
        code: `<LiquidButton size="sm">Small</LiquidButton>
<LiquidButton size="md">Medium</LiquidButton>
<LiquidButton size="lg">Large</LiquidButton>`,
        render: () => (
          <>
            <LiquidButton size="sm">Small</LiquidButton>
            <LiquidButton size="md">Medium</LiquidButton>
            <LiquidButton size="lg">Large</LiquidButton>
          </>
        ),
        title: 'Sizes',
      },
      {
        code: `<LiquidButton iconBefore={<SparklesIcon />}>Create magic</LiquidButton>
<LiquidButton iconAfter={<PlusIcon />}>Add widget</LiquidButton>`,
        render: () => (
          <>
            <LiquidButton iconBefore={<SparklesIcon />}>Create magic</LiquidButton>
            <LiquidButton iconAfter={<PlusIcon />}>Add widget</LiquidButton>
          </>
        ),
        title: 'With icons',
      },
      {
        code: `<LiquidButton tint="#c594ff">Violet</LiquidButton>
<LiquidButton tint="#69dfc4">Mint</LiquidButton>
<LiquidButton tint="#ff9fb5">Rose</LiquidButton>`,
        description: 'Every button accepts a per-instance tint that colors the edge and hover wash, overriding the provider accent.',
        render: () => (
          <>
            <LiquidButton tint="#c594ff">Violet</LiquidButton>
            <LiquidButton tint="#69dfc4">Mint</LiquidButton>
            <LiquidButton tint="#ff9fb5">Rose</LiquidButton>
          </>
        ),
        title: 'Tinting',
      },
      {
        code: `<LiquidButton isLoading>Saving…</LiquidButton>
// Toggle it yourself:
<LiquidButton isLoading={loading} onClick={startSave}>Save changes</LiquidButton>`,
        description: 'Set isLoading to swap the label for a centered spinner while preserving the button width. Clicks are blocked and aria-busy is announced.',
        render: () => (
          <>
            <LiquidButton isLoading>Saving…</LiquidButton>
            <ButtonLoadingDemo />
          </>
        ),
        title: 'Loading',
      },
    ],
    description: 'A restrained, transparent outline button — no fill, just a faint tinted edge. Spring-driven press, squash, and rebound with WebGL rim light, in three sizes.',
    importLine: "import { LiquidButton } from '@liquefy-ui/react'",
    name: 'Button',
    props: [
      { defaultValue: "'md'", description: 'Control height and typography scale.', name: 'size', type: "'sm' | 'md' | 'lg'" },
      { defaultValue: 'false', description: 'Shows a centered spinner, blocks interaction, and sets aria-busy.', name: 'isLoading', type: 'boolean' },
      { description: 'Accent color for this button only. Falls back to the provider tint.', name: 'tint', type: 'string' },
      { description: 'Icon rendered before the label.', name: 'iconBefore', type: 'ReactNode' },
      { description: 'Icon rendered after the label.', name: 'iconAfter', type: 'ReactNode' },
      { description: 'Overrides the provider WebGL setting for this button.', name: 'webgl', type: 'boolean' },
      { defaultValue: 'false', description: 'Opts this button into edge refraction. Off by default — on control-sized elements the lens reads as a mirrored fill.', name: 'lens', type: 'boolean' },
      { description: 'Disables interaction and dims the surface.', name: 'disabled', type: 'boolean' },
    ],
    propsTitle: 'LiquidButton',
    slug: 'button',
  },
  {
    demos: [
      {
        code: `<LiquidIconButton label="Favorite"><HeartIcon /></LiquidIconButton>
<LiquidIconButton label="Notifications"><BellIcon /></LiquidIconButton>
<LiquidIconButton label="Settings"><SettingsIcon /></LiquidIconButton>`,
        render: () => (
          <>
            <LiquidIconButton label="Favorite"><HeartIcon /></LiquidIconButton>
            <LiquidIconButton label="Notifications"><BellIcon /></LiquidIconButton>
            <LiquidIconButton label="Settings"><SettingsIcon /></LiquidIconButton>
          </>
        ),
        title: 'Default',
      },
      {
        code: `<LiquidIconButton label="Add" shape="circle" size="sm"><PlusIcon size={16} /></LiquidIconButton>
<LiquidIconButton label="Add" shape="circle"><PlusIcon /></LiquidIconButton>
<LiquidIconButton label="Add" shape="circle" size="lg"><PlusIcon size={24} /></LiquidIconButton>`,
        render: () => (
          <>
            <LiquidIconButton label="Add" shape="circle" size="sm"><PlusIcon size={16} /></LiquidIconButton>
            <LiquidIconButton label="Add" shape="circle"><PlusIcon /></LiquidIconButton>
            <LiquidIconButton label="Add" shape="circle" size="lg"><PlusIcon size={24} /></LiquidIconButton>
          </>
        ),
        title: 'Circular',
      },
    ],
    description: 'A square or circular outline button for a single icon action. Requires an accessible label, which doubles as its tooltip title.',
    importLine: "import { LiquidIconButton } from '@liquefy-ui/react'",
    name: 'Icon Button',
    props: [
      { description: 'Accessible name announced by screen readers.', name: 'label', required: true, type: 'string' },
      { defaultValue: "'rounded'", description: 'Rounded square or full circle.', name: 'shape', type: "'circle' | 'rounded'" },
      { defaultValue: "'md'", description: 'Outer dimensions of the control.', name: 'size', type: "'sm' | 'md' | 'lg'" },
      { description: 'Accent color for this button only.', name: 'tint', type: 'string' },
    ],
    propsTitle: 'LiquidIconButton',
    slug: 'icon-button',
  },
  {
    demos: [
      {
        code: `<LiquidCheckbox defaultChecked label="Enable refraction" />
<LiquidCheckbox label="Send usage reports" hint="Anonymous, aggregated weekly." />
<LiquidCheckbox indeterminate label="Select all layers" />
<LiquidCheckbox disabled label="Locked option" />`,
        render: () => (
          <div style={{ display: 'grid', gap: 14 }}>
            <LiquidCheckbox defaultChecked label="Enable refraction" />
            <LiquidCheckbox hint="Anonymous, aggregated weekly." label="Send usage reports" />
            <LiquidCheckbox indeterminate label="Select all layers" />
            <LiquidCheckbox disabled label="Locked option" />
          </div>
        ),
        title: 'States',
      },
    ],
    description: 'A tri-state checkbox rendered on a glass tile, with label and hint slots. Supports controlled and uncontrolled usage.',
    importLine: "import { LiquidCheckbox } from '@liquefy-ui/react'",
    name: 'Checkbox',
    props: [
      { description: 'Controlled checked state.', name: 'checked', type: 'boolean' },
      { defaultValue: 'false', description: 'Initial state when uncontrolled.', name: 'defaultChecked', type: 'boolean' },
      { defaultValue: 'false', description: 'Renders the mixed (dash) state.', name: 'indeterminate', type: 'boolean' },
      { description: 'Label rendered next to the box.', name: 'label', type: 'ReactNode' },
      { description: 'Secondary helper text under the label.', name: 'hint', type: 'string' },
      { description: 'Called with the next checked state.', name: 'onCheckedChange', type: '(checked: boolean) => void' },
    ],
    propsTitle: 'LiquidCheckbox',
    slug: 'checkbox',
  },
  {
    demos: [
      {
        code: `<LiquidRadioGroup defaultValue="balanced" label="Render quality">
  <LiquidRadio label="Performance" hint="Skip the shader pass." value="performance" />
  <LiquidRadio label="Balanced" hint="Adaptive, the default." value="balanced" />
  <LiquidRadio label="Fidelity" hint="Full optics everywhere." value="fidelity" />
</LiquidRadioGroup>`,
        render: () => (
          <LiquidRadioGroup defaultValue="balanced" label="Render quality">
            <LiquidRadio hint="Skip the shader pass." label="Performance" value="performance" />
            <LiquidRadio hint="Adaptive, the default." label="Balanced" value="balanced" />
            <LiquidRadio hint="Full optics everywhere." label="Fidelity" value="fidelity" />
          </LiquidRadioGroup>
        ),
        title: 'Vertical group',
      },
      {
        code: `<LiquidRadioGroup defaultValue="md" label="Density" orientation="horizontal">
  <LiquidRadio label="Compact" value="sm" />
  <LiquidRadio label="Regular" value="md" />
  <LiquidRadio label="Relaxed" value="lg" />
</LiquidRadioGroup>`,
        render: () => (
          <LiquidRadioGroup defaultValue="md" label="Density" orientation="horizontal">
            <LiquidRadio label="Compact" value="sm" />
            <LiquidRadio label="Regular" value="md" />
            <LiquidRadio label="Relaxed" value="lg" />
          </LiquidRadioGroup>
        ),
        title: 'Horizontal group',
      },
    ],
    description: 'Radio buttons grouped under role="radiogroup", with springy dot transitions and per-option hints.',
    importLine: "import { LiquidRadioGroup, LiquidRadio } from '@liquefy-ui/react'",
    name: 'Radio Group',
    props: [
      { description: 'Controlled selected value.', name: 'value', type: 'string' },
      { description: 'Initial value when uncontrolled.', name: 'defaultValue', type: 'string' },
      { defaultValue: "'vertical'", description: 'Stacking direction of the options.', name: 'orientation', type: "'horizontal' | 'vertical'" },
      { description: 'Disables every radio in the group.', name: 'disabled', type: 'boolean' },
      { description: 'Called with the newly selected value.', name: 'onValueChange', type: '(value: string) => void' },
    ],
    propsTitle: 'LiquidRadioGroup',
    slug: 'radio-group',
  },
  {
    demos: [
      {
        code: `<LiquidSwitch defaultChecked label="Refraction" />
<LiquidSwitch label="Ambient motion" />
<LiquidSwitch disabled label="Locked" />`,
        render: () => (
          <>
            <LiquidSwitch defaultChecked label="Refraction" />
            <LiquidSwitch label="Ambient motion" />
            <LiquidSwitch disabled label="Locked" />
          </>
        ),
        title: 'Basic',
      },
    ],
    description: 'A toggle built on role="switch" with a jelly thumb animation. Supports controlled and uncontrolled state.',
    importLine: "import { LiquidSwitch } from '@liquefy-ui/react'",
    name: 'Switch',
    props: [
      { description: 'Accessible name for the switch.', name: 'label', required: true, type: 'string' },
      { description: 'Controlled checked state.', name: 'checked', type: 'boolean' },
      { defaultValue: 'false', description: 'Initial state when uncontrolled.', name: 'defaultChecked', type: 'boolean' },
      { description: 'Called with the next checked state.', name: 'onCheckedChange', type: '(checked: boolean) => void' },
    ],
    propsTitle: 'LiquidSwitch',
    slug: 'switch',
  },
  {
    demos: [
      {
        code: `<LiquidSlider defaultValue={64} label="Spatial depth" max={100} min={0} />`,
        render: () => (
          <div style={{ maxWidth: 380, width: '100%' }}>
            <LiquidSlider defaultValue={64} label="Spatial depth" max={100} min={0} />
          </div>
        ),
        title: 'Basic',
      },
      {
        code: `<LiquidSlider
  defaultValue={40}
  endAdornment={<SunIcon size={18} />}
  label="Brightness"
  startAdornment={<MoonIcon size={18} />}
/>`,
        render: () => (
          <div style={{ maxWidth: 380, width: '100%' }}>
            <LiquidSlider defaultValue={40} endAdornment={<SunIcon size={18} />} label="Brightness" startAdornment={<MoonIcon size={18} />} />
          </div>
        ),
        title: 'Adornments',
      },
    ],
    description: 'A native range input with a luminous track and a dimensional thumb. Fully keyboard accessible out of the box.',
    importLine: "import { LiquidSlider } from '@liquefy-ui/react'",
    name: 'Slider',
    props: [
      { description: 'Visible label above the track.', name: 'label', type: 'string' },
      { description: 'Element rendered before the track.', name: 'startAdornment', type: 'ReactNode' },
      { description: 'Element rendered after the track.', name: 'endAdornment', type: 'ReactNode' },
      { description: 'All native range-input attributes (min, max, step, value, onChange…).', name: '…InputHTMLAttributes', type: 'InputHTMLAttributes' },
    ],
    propsTitle: 'LiquidSlider',
    slug: 'slider',
  },
  {
    demos: [
      {
        code: `<LiquidTextField label="Search components" placeholder="Try “button”"
  startAdornment={<SearchIcon size={18} />} />`,
        render: () => (
          <div style={{ maxWidth: 380, width: '100%' }}>
            <LiquidTextField label="Search components" placeholder="Try “button”" startAdornment={<SearchIcon size={18} />} />
          </div>
        ),
        title: 'With adornment',
      },
      {
        code: `<LiquidTextField hint="We never share your address." label="Email"
  placeholder="you@example.com" startAdornment={<MailIcon size={18} />} type="email" />
<LiquidTextField label="Password" placeholder="••••••••"
  startAdornment={<LockIcon size={18} />} type="password" />`,
        render: () => (
          <div style={{ display: 'grid', gap: 18, maxWidth: 380, width: '100%' }}>
            <LiquidTextField hint="We never share your address." label="Email" placeholder="you@example.com" startAdornment={<MailIcon size={18} />} type="email" />
            <LiquidTextField label="Password" placeholder="••••••••" startAdornment={<LockIcon size={18} />} type="password" />
          </div>
        ),
        title: 'Form fields',
      },
    ],
    description: 'A single-line input on a glass control with label, hint, and adornment slots. Focus stays legible over any backdrop.',
    importLine: "import { LiquidTextField } from '@liquefy-ui/react'",
    name: 'Text Field',
    props: [
      { description: 'Visible label above the control.', name: 'label', type: 'string' },
      { description: 'Helper text below the control, linked via aria-describedby.', name: 'hint', type: 'string' },
      { description: 'Element rendered at the start of the control.', name: 'startAdornment', type: 'ReactNode' },
      { description: 'Element rendered at the end of the control.', name: 'endAdornment', type: 'ReactNode' },
      { description: 'All native input attributes (type, value, onChange…).', name: '…InputHTMLAttributes', type: 'InputHTMLAttributes' },
    ],
    propsTitle: 'LiquidTextField',
    slug: 'text-field',
  },
  {
    demos: [
      {
        code: `<LiquidTextArea hint="Markdown is supported." label="Release notes"
  placeholder="What changed in this version?" rows={5} />`,
        render: () => (
          <div style={{ maxWidth: 440, width: '100%' }}>
            <LiquidTextArea hint="Markdown is supported." label="Release notes" placeholder="What changed in this version?" rows={5} />
          </div>
        ),
        title: 'Basic',
      },
    ],
    description: 'A multi-line sibling of the text field with the same label, hint, and glass treatment. Resizable vertically by default.',
    importLine: "import { LiquidTextArea } from '@liquefy-ui/react'",
    name: 'Text Area',
    preview: () => (
      <div style={{ maxWidth: 260, width: '100%' }}>
        <LiquidTextArea label="Release notes" placeholder="What changed?" rows={2} />
      </div>
    ),
    props: [
      { description: 'Visible label above the control.', name: 'label', type: 'string' },
      { description: 'Helper text below the control.', name: 'hint', type: 'string' },
      { defaultValue: '4', description: 'Initial number of text rows.', name: 'rows', type: 'number' },
      { description: 'All native textarea attributes.', name: '…TextareaHTMLAttributes', type: 'TextareaHTMLAttributes' },
    ],
    propsTitle: 'LiquidTextArea',
    slug: 'text-area',
  },
  {
    demos: [
      {
        code: `const [value, setValue] = useState('aurora')

<LiquidSelect
  label="Theme preset"
  onValueChange={setValue}
  options={[
    { label: 'Aurora', value: 'aurora' },
    { label: 'Midnight', value: 'midnight' },
    { label: 'Prism', value: 'prism' },
    { label: 'Tide (soon)', disabled: true, value: 'tide' },
  ]}
  value={value}
/>`,
        render: () => <SelectDemo />,
        stageAlign: 'top',
        stageMinHeight: 320,
        title: 'Controlled',
      },
    ],
    description: 'A listbox dropdown built on Base UI: typeahead, Home/End and PageUp/PageDown, focus that returns to the trigger, and a popover that flips to stay on screen. Glass all the way, with none of the native select styling quirks.',
    importLine: "import { LiquidSelect } from '@liquefy-ui/react'",
    name: 'Select',
    props: [
      { description: 'The options to render.', name: 'options', required: true, type: 'LiquidSelectOption[]' },
      { description: 'Controlled selected value.', name: 'value', type: 'string' },
      { description: 'Initial value when uncontrolled.', name: 'defaultValue', type: 'string' },
      { defaultValue: "'Select…'", description: 'Text shown when nothing is selected.', name: 'placeholder', type: 'string' },
      { description: 'Visible label above the trigger.', name: 'label', type: 'string' },
      { description: 'Helper text below the trigger.', name: 'hint', type: 'string' },
      { description: 'Called with the newly selected value.', name: 'onValueChange', type: '(value: string) => void' },
      { description: 'Called when the popup opens or closes — a sheet holding the select needs to know.', name: 'onOpenChange', type: '(open: boolean) => void' },
    ],
    propsTitle: 'LiquidSelect',
    slug: 'select',
  },
  {
    demos: [
      {
        code: `<LiquidSegmented
  defaultValue="week"
  label="Range"
  options={[
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
  ]}
/>`,
        render: () => (
          <LiquidSegmented
            defaultValue="week"
            label="Range"
            options={[
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
              { label: 'Year', value: 'year' },
            ]}
          />
        ),
        title: 'Basic',
      },
      {
        code: `<LiquidSegmented
  defaultValue="grid"
  label="Layout"
  size="sm"
  options={[
    { icon: <SunIcon size={14} />, label: 'Light', value: 'light' },
    { icon: <MoonIcon size={14} />, label: 'Dark', value: 'dark' },
  ]}
/>`,
        render: () => (
          <LiquidSegmented
            defaultValue="dark"
            label="Appearance"
            options={[
              { icon: <SunIcon size={14} />, label: 'Light', value: 'light' },
              { icon: <MoonIcon size={14} />, label: 'Dark', value: 'dark' },
            ]}
            size="sm"
          />
        ),
        title: 'Small, with icons',
      },
    ],
    description: 'An exclusive choice control with a sliding glass indicator — the liquid answer to a toggle-button group.',
    importLine: "import { LiquidSegmented } from '@liquefy-ui/react'",
    name: 'Segmented Control',
    preview: () => (
      <LiquidSegmented
        defaultValue="md"
        label="Size"
        options={[
          { label: 'S', value: 'sm' },
          { label: 'M', value: 'md' },
          { label: 'L', value: 'lg' },
        ]}
      />
    ),
    props: [
      { description: 'Options with value, label, and optional icon.', name: 'options', required: true, type: 'LiquidSegmentedOption[]' },
      { description: 'Controlled selected value.', name: 'value', type: 'string' },
      { defaultValue: 'first option', description: 'Initial value when uncontrolled.', name: 'defaultValue', type: 'string' },
      { defaultValue: "'md'", description: 'Control density.', name: 'size', type: "'sm' | 'md'" },
      { description: 'Called with the newly selected value.', name: 'onValueChange', type: '(value: string) => void' },
    ],
    propsTitle: 'LiquidSegmented',
    slug: 'segmented-control',
  },
  {
    demos: [
      {
        code: `const [value, setValue] = useState(4)

<LiquidRating onValueChange={setValue} value={value} />`,
        render: () => <RatingDemo />,
        title: 'Interactive',
      },
      {
        code: `<LiquidRating readOnly size="sm" value={3} />
<LiquidRating readOnly value={4} />
<LiquidRating max={10} readOnly size="lg" value={7} />`,
        render: () => (
          <div style={{ alignItems: 'flex-start', display: 'grid', gap: 12 }}>
            <LiquidRating readOnly size="sm" value={3} />
            <LiquidRating readOnly value={4} />
            <LiquidRating max={10} readOnly size="lg" value={7} />
          </div>
        ),
        title: 'Read-only and sizes',
      },
    ],
    description: 'Star ratings with hover preview, keyboard focus per star, and a read-only display mode.',
    importLine: "import { LiquidRating } from '@liquefy-ui/react'",
    name: 'Rating',
    props: [
      { description: 'Controlled rating value.', name: 'value', type: 'number' },
      { defaultValue: '0', description: 'Initial value when uncontrolled.', name: 'defaultValue', type: 'number' },
      { defaultValue: '5', description: 'Number of stars.', name: 'max', type: 'number' },
      { defaultValue: 'false', description: 'Renders a static, non-interactive display.', name: 'readOnly', type: 'boolean' },
      { defaultValue: "'md'", description: 'Star dimensions.', name: 'size', type: "'sm' | 'md' | 'lg'" },
      { description: 'Called with the new value; clicking the current value clears to 0.', name: 'onValueChange', type: '(value: number) => void' },
    ],
    propsTitle: 'LiquidRating',
    slug: 'rating',
  },
]

export const inputDemoIcons = { BellIcon, HeartIcon, LockIcon, MailIcon, MoonIcon, PlusIcon, SearchIcon, SettingsIcon, SparklesIcon, SunIcon, TrashIcon }
