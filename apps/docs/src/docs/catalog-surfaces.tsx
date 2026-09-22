import {
  GlassCard,
  LiquidAccordion,
  LiquidAccordionItem,
  LiquidButton,
  LiquidGlass,
  LiquidSurface,
} from '@liquefy-ui/react'
import type { ComponentDoc } from './types'

export const surfaceDocs: ComponentDoc[] = [
  {
    demos: [
      {
        code: `<LiquidSurface radius={22} style={{ padding: 24 }}>Clear (default)</LiquidSurface>
<LiquidSurface radius={22} style={{ padding: 24 }} variant="tinted">Tinted</LiquidSurface>`,
        description: 'Clear is the fully transparent default — no blur, no inner glow. Tinted adds a subtle accent wash on the same optics.',
        render: () => (
          <>
            <LiquidSurface radius={22} style={{ padding: 24 }}>Clear (default)</LiquidSurface>
            <LiquidSurface radius={22} style={{ padding: 24 }} variant="tinted">Tinted</LiquidSurface>
          </>
        ),
        title: 'Material variants',
      },
      {
        code: `<LiquidSurface radius={999} style={{ padding: '10px 22px' }} tint="#c594ff" variant="tinted">
  Pill surface
</LiquidSurface>
<LiquidSurface interactive={false} radius={22} style={{ padding: 24 }}>
  Static (no springs)
</LiquidSurface>`,
        render: () => (
          <>
            <LiquidSurface radius={999} style={{ padding: '10px 22px' }} tint="#c594ff" variant="tinted">Pill surface</LiquidSurface>
            <LiquidSurface interactive={false} radius={22} style={{ padding: 24 }}>Static (no springs)</LiquidSurface>
          </>
        ),
        title: 'Shape and interactivity',
      },
      {
        code: `<LiquidSurface
  styles={{
    color: 'accent',
    p: { base: 4, md: 7 },
    radius: 26,
    _hover: { bg: '$glass-soft' },
    '&:has(strong)': { fontVariantNumeric: 'tabular-nums' },
  }}
>
  <strong>styles</strong> — resize the window
</LiquidSurface>`,
        description: 'Every component takes styles: CSS properties plus p / mt / w / size shorthands on the --lq-space scale, $token references, { base, md } breakpoints, and _hover / _dark states. Static values ride the style attribute; conditional ones become a generated class that sits outside the liquefy-ui cascade layer, so it wins without !important.',
        render: () => (
          <LiquidSurface
            styles={{
              '&:has(strong)': { fontVariantNumeric: 'tabular-nums' },
              _hover: { bg: '$glass-soft' },
              color: 'accent',
              p: { base: 4, md: 7 },
              radius: 26,
            }}
          >
            <strong>styles</strong> — resize the window
          </LiquidSurface>
        ),
        title: 'Style overrides',
      },
    ],
    description: 'The base material every glass component is built on: WebGL rim light, edge refraction, and jelly springs on a single div.',
    importLine: "import { LiquidSurface } from '@liquefy-ui/react'",
    name: 'Surface',
    props: [
      { defaultValue: "'clear'", description: 'Material preset. Clear is fully transparent; tinted adds an accent wash.', name: 'variant', type: "'clear' | 'tinted'" },
      { defaultValue: '18', description: 'Corner radius (px or CSS value).', name: 'radius', type: 'number | string' },
      { defaultValue: 'true', description: 'Enables pointer springs and shader interaction.', name: 'interactive', type: 'boolean' },
      { description: 'Optical intensity override for this surface.', name: 'intensity', type: 'number' },
      { description: 'Accent color override.', name: 'tint', type: 'string' },
      { description: 'WebGL shader override.', name: 'webgl', type: 'boolean' },
      { description: 'Edge refraction override.', name: 'lens', type: 'boolean' },
      { description: 'How far the lens softens what it refracts, in pixels.', name: 'lensBlur', type: 'number' },
      { defaultValue: '0', description: "How much of the material's own dressing sits over the backdrop — fill, inner sheen, cast shadow and colour lift. 0 leaves only the lit rim and the refraction.", name: 'veil', type: 'number' },
    ],
    propsTitle: 'LiquidSurface',
    slug: 'surface',
  },
  {
    demos: [
      {
        code: `<LiquidGlass radius={22} refraction={0.4} style={{ padding: 24 }}>Gentle</LiquidGlass>
<LiquidGlass radius={22} style={{ padding: 24 }}>Default</LiquidGlass>
<LiquidGlass curve={3} radius={22} style={{ padding: 24 }}>Thick rim</LiquidGlass>`,
        description: 'refraction spends a fraction of the bend the material can take before the backdrop would fold back on itself, so the top of the range is the strongest the glass goes rather than the point it breaks. curve moves that bend around: low spreads it evenly across the bezel, high piles it against the rim.',
        render: () => (
          <>
            <LiquidGlass radius={22} refraction={0.4} style={{ padding: 24 }}>Gentle</LiquidGlass>
            <LiquidGlass radius={22} style={{ padding: 24 }}>Default</LiquidGlass>
            <LiquidGlass curve={3} radius={22} style={{ padding: 24 }}>Thick rim</LiquidGlass>
          </>
        ),
        title: 'Refraction and bezel shape',
      },
      {
        code: `<LiquidGlass radius={22} style={{ padding: 24 }} veil={1}>Full material</LiquidGlass>
<LiquidGlass radius={22} style={{ padding: 24 }} veil={0.4}>Thinner</LiquidGlass>
<LiquidGlass frost={0} radius={22} style={{ padding: 24 }} veil={0}>Nothing but an edge</LiquidGlass>`,
        description: 'veil takes away what the material puts between you and the backdrop — the fill, the inner sheen, the cast shadow and the lift it gives the colour behind it. It leaves the rim and the refraction alone on purpose, so veil={0} with frost={0} is a pane with nothing in it but a lit edge and the bend behind it, rather than a rectangle that has stopped being there. The dark theme raises it from underneath — a hairline on black is not a panel — so 0 there still leaves a little material; set --lq-veil-floor: 0 on a subtree to take that away too.',
        render: () => (
          <>
            <LiquidGlass radius={22} style={{ padding: 24 }} veil={1}>Full material</LiquidGlass>
            <LiquidGlass radius={22} style={{ padding: 24 }} veil={0.4}>Thinner</LiquidGlass>
            <LiquidGlass frost={0} radius={22} style={{ padding: 24 }} veil={0}>Nothing but an edge</LiquidGlass>
          </>
        ),
        title: 'Veil',
      },
      {
        code: `<LiquidGlass radius={999} style={{ padding: '12px 26px' }}>
  Move the pointer near me
</LiquidGlass>
<LiquidGlass glow={false} radius={999} shimmer={false} style={{ padding: '12px 26px' }}>
  Ornaments off
</LiquidGlass>`,
        description: 'The four ornaments — glow, ripple, shimmer and sparkle — come from the provider, so naming one here is how an instance opts out of the house material; with all four off no WebGL context is created at all.',
        render: () => (
          <>
            <LiquidGlass radius={999} style={{ padding: '12px 26px' }}>Move the pointer near me</LiquidGlass>
            <LiquidGlass glow={false} radius={999} shimmer={false} style={{ padding: '12px 26px' }}>Ornaments off</LiquidGlass>
          </>
        ),
        title: 'Ornaments',
      },
    ],
    description: 'The bare material with its optics as props. LiquidSurface is the one to reach for in a product; this is the one for when the glass is the design.',
    importLine: "import { LiquidGlass } from '@liquefy-ui/react'",
    name: 'Glass',
    props: [
      { defaultValue: '1', description: 'How much of the bend the material can take without folding to spend, 0 to 1.', name: 'refraction', type: 'number' },
      { defaultValue: '0', description: 'Backdrop blur in pixels. Set outright here, rather than added to the provider\'s.', name: 'frost', type: 'number' },
      { description: 'How far the lens softens what it refracts, in pixels. Not the backdrop blur.', name: 'softness', type: 'number' },
      { description: 'Width of the refracting band at the rim. Defaults to 22% of the short side.', name: 'bezel', type: 'number' },
      { defaultValue: '2', description: 'Exponent of the bezel cross-section: 1 is an even ramp, higher piles the bend against the rim.', name: 'curve', type: 'number' },
      { defaultValue: 'provider', description: 'Lit rim glow, click ripple, iridescent shimmer and drifting sparkle. Glow and shimmer are on by default, ripple and sparkle off.', name: 'glow / ripple / shimmer / sparkle', type: 'boolean' },
      { defaultValue: 'true', description: 'Enables pointer springs and shader interaction.', name: 'interactive', type: 'boolean' },
      { defaultValue: 'false', description: 'Dims the glass for a surface sitting on a bright backdrop.', name: 'overLight', type: 'boolean' },
      { description: 'Inner spacing as pixels or any CSS length.', name: 'padding', type: 'number | string' },
      { description: 'Corner radius (px or CSS value).', name: 'radius', type: 'number | string' },
      { description: 'How much the glass lifts the colour of what it refracts.', name: 'saturation', type: 'number' },
      { defaultValue: 'provider', description: 'Accent colour for this glass.', name: 'tint', type: 'string' },
      { defaultValue: '0', description: "How much of the material's own dressing sits over the backdrop. Pair veil={0} with frost={0} for a sheet with nothing in it but an edge.", name: 'veil', type: 'number' },
      { defaultValue: 'provider', description: 'How loose the pointer and press springs feel.', name: 'wobbliness', type: 'number' },
    ],
    propsTitle: 'LiquidGlass',
    slug: 'glass',
  },
  {
    demos: [
      {
        code: `<GlassCard
  description="The background stays visible; only the optical edge defines the layer."
  eyebrow="Live material"
  footer={<LiquidButton size="sm">Continue</LiquidButton>}
  title="Clarity over blur."
>
  Cards compose header, body, and footer over any LiquidSurface variant.
</GlassCard>`,
        render: () => (
          <GlassCard
            description="The background stays visible; only the optical edge defines the layer."
            eyebrow="Live material"
            footer={<LiquidButton size="sm">Continue</LiquidButton>}
            style={{ maxWidth: 420 }}
            title="Clarity over blur."
          >
            <p style={{ lineHeight: 1.6, margin: 0, opacity: 0.75 }}>Cards compose header, body, and footer over any LiquidSurface variant.</p>
          </GlassCard>
        ),
        title: 'Full card',
      },
    ],
    description: 'A content card with eyebrow, title, description, body, and footer slots on top of the liquid surface.',
    importLine: "import { GlassCard } from '@liquefy-ui/react'",
    name: 'Card',
    props: [
      { description: 'Small uppercase kicker above the title.', name: 'eyebrow', type: 'ReactNode' },
      { description: 'Card heading.', name: 'title', type: 'ReactNode' },
      { description: 'Muted text under the title.', name: 'description', type: 'ReactNode' },
      { description: 'Trailing action slot, right-aligned.', name: 'footer', type: 'ReactNode' },
      { description: 'All LiquidSurface props (variant, radius, tint…).', name: '…LiquidSurfaceProps', type: 'LiquidSurfaceProps' },
    ],
    propsTitle: 'GlassCard',
    slug: 'card',
  },
  {
    demos: [
      {
        code: `<LiquidAccordion defaultValue={['optics']}>
  <LiquidAccordionItem subtitle="WebGL displacement" title="How does refraction work?" value="optics">
    A shader bakes a rounded-rect lens displacement map, applied to the live
    backdrop through an SVG filter inside backdrop-filter.
  </LiquidAccordionItem>
  <LiquidAccordionItem title="Does it work without WebGL?" value="fallback">
    Yes — components automatically fall back to the transparent CSS material.
  </LiquidAccordionItem>
  <LiquidAccordionItem title="Is it accessible?" value="a11y">
    Triggers are buttons with aria-expanded, and motion can be disabled per subtree.
  </LiquidAccordionItem>
</LiquidAccordion>`,
        render: () => (
          <LiquidAccordion defaultValue={['optics']} style={{ maxWidth: 520, width: '100%' }}>
            <LiquidAccordionItem subtitle="WebGL displacement" title="How does refraction work?" value="optics">
              A shader bakes a rounded-rect lens displacement map, applied to the live backdrop through an SVG filter inside backdrop-filter.
            </LiquidAccordionItem>
            <LiquidAccordionItem title="Does it work without WebGL?" value="fallback">
              Yes — components automatically fall back to the transparent CSS material.
            </LiquidAccordionItem>
            <LiquidAccordionItem title="Is it accessible?" value="a11y">
              Triggers are buttons with aria-expanded, and motion can be disabled per subtree.
            </LiquidAccordionItem>
          </LiquidAccordion>
        ),
        title: 'Single open',
      },
    ],
    description: 'Vertically stacked disclosure panels built on Base UI: each header is a real heading, arrow keys move between them, and the panel animates both open and shut off its measured height. Single or multiple panels open at once.',
    importLine: "import { LiquidAccordion, LiquidAccordionItem } from '@liquefy-ui/react'",
    name: 'Accordion',
    props: [
      { description: 'Controlled open values (LiquidAccordion).', name: 'value', type: 'string[]' },
      { defaultValue: '[]', description: 'Initially open values.', name: 'defaultValue', type: 'string[]' },
      { defaultValue: 'false', description: 'Allows several panels open at once.', name: 'multiple', type: 'boolean' },
      { description: 'Called with the next open values.', name: 'onValueChange', type: '(value: string[]) => void' },
      { description: 'Identity of the item (LiquidAccordionItem).', name: 'value', required: true, type: 'string' },
      { description: 'Heading of the item.', name: 'title', required: true, type: 'ReactNode' },
      { description: 'Muted line under the heading.', name: 'subtitle', type: 'ReactNode' },
    ],
    propsTitle: 'LiquidAccordion family',
    slug: 'accordion',
  },
]
