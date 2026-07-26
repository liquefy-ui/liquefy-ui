import { SparklesIcon } from '@liquefy-ui/icons'
import {
  GlassCard,
  LiquidAlert,
  LiquidBadge,
  LiquidButton,
  LiquidChip,
  LiquidDivider,
  LiquidProgress,
  LiquidSurface,
  LiquefyProvider,
} from '@liquefy-ui/react'
import { InteractiveIsland } from './interactive-island'

/**
 * A server component — note the absence of 'use client'. Every component below
 * comes straight out of the package, so this page fails to build the moment the
 * published bundle loses its client boundary. That is the whole point of this app.
 *
 * The class names are Tailwind v4, including the ones bridged from liquefy-ui's
 * own tokens by `@liquefy-ui/react/tailwind.css`: `text-liquid-muted`,
 * `rounded-liquid`, `shadow-liquid`, `ease-liquid`, `bg-liquid-glass-soft`.
 */
const Page = () => (
  <LiquefyProvider theme="dark" tint="#8eb9ff">
    <main className="mx-auto grid max-w-3xl gap-6 px-6 py-12">
      <h1 className="m-0 text-xl font-semibold">liquefy-ui on the Next.js App Router</h1>
      <p className="m-0 text-liquid-muted">
        This page is a React Server Component, styled with Tailwind v4 utilities that
        read liquefy-ui&apos;s design tokens.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <LiquidButton iconBefore={<SparklesIcon />}>Create magic</LiquidButton>
        {/* A utility overriding a component style — only works if the layer order is right. */}
        <LiquidButton className="rounded-full" size="sm">Rounded by Tailwind</LiquidButton>
        <LiquidBadge>3</LiquidBadge>
        <LiquidChip>Tag</LiquidChip>
      </div>

      <GlassCard description="Rendered on the server, hydrated on the client." title="Glass card">
        <LiquidProgress value={62} />
      </GlassCard>

      <LiquidAlert severity="success" title="Server render succeeded">
        If this text is visible, the RSC boundary is intact.
      </LiquidAlert>

      <div className="rounded-liquid bg-liquid-glass-soft p-4 shadow-liquid transition-colors duration-300 ease-liquid">
        Tokens bridged into Tailwind: radius, glass fill, shadow and easing.
      </div>

      <LiquidDivider>client island</LiquidDivider>

      <LiquidSurface>
        <InteractiveIsland />
      </LiquidSurface>
    </main>
  </LiquefyProvider>
)

export default Page
