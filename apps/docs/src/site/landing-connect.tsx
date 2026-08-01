import { useState, type ReactNode } from 'react'
import { LiquidSegmented, LiquidSurface } from '@liquefy-ui/react'
import { ArrowRightIcon, CheckIcon, CommandIcon, DownloadIcon, SparklesIcon } from '@liquefy-ui/icons'
import { CommandRow } from './chrome'

const PACKAGE_MANAGERS = [
  { command: 'pnpm add', label: 'pnpm', value: 'pnpm' },
  { command: 'npm i', label: 'npm', value: 'npm' },
  { command: 'yarn add', label: 'yarn', value: 'yarn' },
  { command: 'bun add', label: 'bun', value: 'bun' },
]

const PACKAGES = '@liquefy-ui/react @liquefy-ui/core @liquefy-ui/icons'

type StackCardProps = {
  body: ReactNode
  href?: string
  status: string
  title: string
}

const StackCard = ({ body, href, status, title }: StackCardProps) => (
  <article className="stack-card">
    <header>
      <h3>{title}</h3>
      <span className="stack-card__status"><CheckIcon size={12} />{status}</span>
    </header>
    <p>{body}</p>
    {href && <a className="text-link" href={href}>Read more<ArrowRightIcon size={14} /></a>}
  </article>
)

const MCP_TOOLS = [
  ['get_conventions', 'The rules that are easy to get wrong — the client boundary, the required provider, the props that do not exist.'],
  ['list_components', 'Everything in the library with one-line descriptions, filterable by kind.'],
  ['get_component', 'One component’s exported names and every exported type declaration, verbatim.'],
  ['search_components', 'Free text over names, descriptions and types: “which component has onValueChange?”'],
  ['get_component_source', 'The copy-paste source, with imports already rewritten to shadcn aliases.'],
  ['get_tokens', 'The --lq-* tokens and their real values, per theme.'],
]

export const Connect = () => {
  const [manager, setManager] = useState('pnpm')
  const prefix = PACKAGE_MANAGERS.find((entry) => entry.value === manager)?.command ?? 'pnpm add'

  return (
    <section className="section connect" id="install">
      <header className="section-heading">
        <span>Compatibility</span>
        <h2>Drops into the stack you already have.</h2>
        <p>
          One install, one stylesheet, one provider. React stays a peer dependency, the bundles ship
          ESM and CJS with types, and <code>@liquefy-ui/core</code> has no runtime dependencies at all.
        </p>
      </header>

      <div className="agent-layout">
        <LiquidSurface className="agent-card agent-card--mcp" radius={28} webgl={false}>
          <span className="agent-card__eyebrow"><CommandIcon size={14} />MCP server</span>
          <h3>Your agent reads the real API.</h3>
          <p>
            <code>@liquefy-ui/mcp</code> answers from the library&rsquo;s actual exports. The catalog is
            generated from source at build time, so it cannot drift from what the package ships — no
            dependencies, no network calls.
          </p>
          <CommandRow command="claude mcp add liquefy-ui -- npx -y @liquefy-ui/mcp" label="Copy the MCP install command" />
          <ul className="agent-tools">
            {MCP_TOOLS.map(([name, description]) => (
              <li key={name}>
                <code>{name}</code>
                <span>{description}</span>
              </li>
            ))}
          </ul>
          <a className="text-link" href="#/docs/ai-tooling">Full AI tooling guide<ArrowRightIcon size={14} /></a>
        </LiquidSurface>

        <div className="agent-column">
          <LiquidSurface className="agent-card" radius={24} webgl={false}>
            <span className="agent-card__eyebrow"><DownloadIcon size={14} />shadcn registry</span>
            <h3>Or own the source.</h3>
            <p>
              Every component is published as a registry item. The CLI copies the real source into your
              project with imports rewritten to the standard aliases, and pulls in whatever the
              component depends on.
            </p>
            <CommandRow
              command="npx shadcn@latest add @liquefy-ui/liquid-button"
              label="Copy the shadcn command"
            />
            <a className="text-link" href="/r/registry.json" rel="noreferrer" target="_blank">
              Browse the registry index<ArrowRightIcon size={14} />
            </a>
          </LiquidSurface>

          <LiquidSurface className="agent-card" radius={24} webgl={false}>
            <span className="agent-card__eyebrow"><SparklesIcon size={14} />llms.txt</span>
            <h3>For agents that read, not call.</h3>
            <p>
              The same material as plain text, generated from source by the docs build — install notes,
              the conventions, every component, every exported type, every token.
            </p>
            <div className="agent-links">
              <a href="/llms.txt" rel="noreferrer" target="_blank">/llms.txt</a>
              <a href="/llms-full.txt" rel="noreferrer" target="_blank">/llms-full.txt</a>
            </div>
          </LiquidSurface>
        </div>
      </div>

      <div className="install-block">
        <LiquidSegmented
          label="Package manager"
          onValueChange={setManager}
          options={PACKAGE_MANAGERS.map(({ label, value }) => ({ label, value }))}
          size="sm"
          value={manager}
        />
        <CommandRow command={`${prefix} ${PACKAGES}`} label="Copy the install command" />
      </div>

      <p className="install-note">
        Published on npm with provenance. Only <code>@liquefy-ui/react</code> is mandatory — the other two
        come along or stay optional.{' '}
        <a className="text-link" href="#/docs/installation">Installation<ArrowRightIcon size={14} /></a>
      </p>

      <div className="stack-grid">
        <StackCard
          body={<>Peer dependency on React 18.2 or newer, and everything is tested against React 19. No bundled copy of React, no duplicated context.</>}
          status="18.2+ / 19"
          title="React"
        />
        <StackCard
          body={<>The published bundles carry <code>&apos;use client&apos;</code> themselves, so a server component can import them directly — no wrapper file. A working App Router example builds in CI on every commit.</>}
          href="#/docs/frameworks"
          status="App Router · RSC"
          title="Next.js 16"
        />
        <StackCard
          body={<>Import <code>tailwind.css</code> before Tailwind and the cascade layer order is settled: utilities win over component styles, and the <code>--lq-*</code> tokens arrive as Tailwind theme values.</>}
          href="#/docs/tailwind"
          status="v4 layers + tokens"
          title="Tailwind CSS"
        />
        <StackCard
          body={<>This documentation site is a Vite app. Remix and React Router need nothing beyond the stylesheet import; the client directive is simply ignored where it has no meaning.</>}
          href="#/docs/frameworks"
          status="No config"
          title="Vite · Remix"
        />
        <StackCard
          body={<>Written in TypeScript with every prop and token typed. <code>.d.mts</code> and <code>.d.cts</code> both ship, so editor hints work under either module resolution.</>}
          status="Strict"
          title="TypeScript"
        />
        <StackCard
          body={<>Icons are individual exports, the styles engine only emits a class when a state or breakpoint needs one, and the spring engine is around 2 KB before gzip.</>}
          href="#/docs/performance"
          status="Tree-shakeable"
          title="Bundle"
        />
      </div>

    </section>
  )
}
