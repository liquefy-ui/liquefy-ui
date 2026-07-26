import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const aiToolingDoc: DocEntry = {
  description: 'An MCP server, llms.txt, and a shadcn registry — so a coding agent writes against the real API instead of inventing one.',
  name: 'AI tooling',
  render: () => (
    <>
      <Section id="why" title="Why this exists">
        <p>
          Most code that will ever use this library is going to be written by a coding agent, and
          liquefy-ui&rsquo;s API is unusual enough to trip one up. There is no{' '}
          <code>variant=&quot;primary&quot;</code> on <code>LiquidButton</code>. Overrides go through a{' '}
          <code>styles</code> prop rather than utility classes. Everything is named <code>LiquidX</code>. An
          agent pattern-matching against other libraries will confidently write props that do not exist.
        </p>
        <p>The three things below all serve the same purpose: hand the agent the real signatures.</p>
        <GuideTable
          headers={['Your agent', 'Use']}
          rows={[
            ['Calls tools (Claude Code, Cursor, Windsurf, Zed)', <>The <strong>MCP server</strong> — it answers from the real exports.</>],
            ['Fetches URLs', <>The <strong>llms.txt</strong> files, plus one plain-Markdown page per component.</>],
            ['Should own the code, not import it', <>The <strong>shadcn registry</strong>.</>],
          ]}
        />
      </Section>

      <Section id="mcp" title="MCP server">
        <p>
          <code>@liquefy-ui/mcp</code> is a Model Context Protocol server that answers from the
          library&rsquo;s actual exports — only the ones the package entry point re-exports, so an agent is
          never told to import something that does not resolve. The catalog is generated from source at
          build time, so it cannot drift from what the package ships. It has no dependencies, needs no
          network, and speaks the 2025-11-25 revision of the protocol while still accepting older ones.
        </p>
        <CodeBlock code={`claude mcp add liquefy-ui -- npx -y @liquefy-ui/mcp`} title="Claude Code" />
        <CodeBlock
          code={`{
  "mcpServers": {
    "liquefy-ui": {
      "command": "npx",
      "args": ["-y", "@liquefy-ui/mcp"]
    }
  }
}`}
          title="Editors that read a JSON config"
        />
        <GuideTable
          headers={['Tool', 'What it answers']}
          rows={[
            [<code>get_conventions</code>, 'The rules that are easy to get wrong: the client boundary, the required provider, which props do not exist. Worth calling first.'],
            [<code>list_components</code>, <>Everything in the library, with one-line descriptions. Filterable by <code>ui</code>, <code>hook</code> or <code>lib</code>.</>],
            [<code>get_component</code>, <>One component&rsquo;s exported names and every exported type declaration, verbatim. Accepts <code>LiquidButton</code> or <code>liquid-button</code>, and suggests near matches on a typo.</>],
            [<code>search_components</code>, <>Free text over names, descriptions and type declarations — so &ldquo;which component has <code>onValueChange</code>&rdquo; is answerable.</>],
            [<code>get_component_source</code>, 'The copy-paste source, with imports already rewritten to shadcn aliases.'],
            [<code>get_tokens</code>, <>The <code>--lq-*</code> tokens and their real values, per theme scope.</>],
            [<code>list_icons</code>, <>Every icon in <code>@liquefy-ui/icons</code> by name, filterable — so an agent stops inventing icon names or importing a second icon library.</>],
            [<code>get_core_api</code>, <>The public surface of <code>@liquefy-ui/core</code>: the renderer, the lens, the spring engine.</>],
          ]}
        />
        <Callout title="Point the agent at get_conventions first">
          A one-line instruction in your <code>CLAUDE.md</code> or editor rules saves a lot of invented
          props: <em>&ldquo;Before writing liquefy-ui code, call get_conventions, then get_component for
          each component you plan to use.&rdquo;</em>
        </Callout>
      </Section>

      <Section id="llms-txt" title="llms.txt">
        <p>
          For agents that fetch documentation rather than call tools, the site serves the same material as
          plain text.
        </p>
        <GuideTable
          headers={['File', 'Contents']}
          rows={[
            [<a className="text-link" href="/llms.txt" rel="noreferrer" target="_blank">/llms.txt</a>, 'The conventions, an install snippet, and a link per component — laid out the way llmstxt.org asks: prose first, then sections that are nothing but links.'],
            [<a className="text-link" href="/llms-full.txt" rel="noreferrer" target="_blank">/llms-full.txt</a>, 'All of that plus every exported type declaration, the icon set, the core API and every design token.'],
            [<a className="text-link" href="/llms/liquid-button.md" rel="noreferrer" target="_blank">/llms/&lt;component&gt;.md</a>, 'One page per component, plus icons.md, core.md and mcp.md. These are what llms.txt links to, because this site is a hash-routed SPA and a fetcher without JavaScript cannot read #/components/liquid-button.'],
          ]}
        />
        <p>All of them are generated from source by the docs build, for the same anti-drift reason.</p>
      </Section>

      <Section id="registry" title="shadcn registry">
        <p>
          npm is the intended distribution and will be the simplest way to use the library — but it is not
          live yet, and the registry is. Every component is published as a shadcn registry item: 37 of
          them, including the provider, the styles engine and the icon glyphs.
        </p>
        <CodeBlock code={`npx shadcn@latest add https://liquefy-ui.com/r/liquid-button.json`} />
        <p>
          That copies the real component source into your project — not a re-export of the package.
          Imports are rewritten to the standard aliases (<code>@/components/ui</code>, <code>@/lib</code>,{' '}
          <code>@/hooks</code>), and the CLI pulls in whatever else the component needs: the surface it
          builds on, the <code>styles</code> prop engine, the provider, and the base item that carries the
          stylesheet.
        </p>
        <p>
          The copied tree deliberately does not depend on <code>@liquefy-ui/react</code>. It keeps{' '}
          <code>@liquefy-ui/core</code> for the optics engine and <code>@base-ui/react</code> for the
          accessibility primitives, and brings its own stylesheet — otherwise a project would end up with
          a copied <code>LiquefyProvider</code> and the packaged one fighting over the same React context.
        </p>
        <Callout title="No follow-up edit needed">
          Every file the registry copies is written with its own <code>&apos;use client&apos;</code>{' '}
          directive, and each item carries a <code>docs</code> note reminding you to import the copied
          stylesheet and wrap the tree in a provider. Hand-copying source out of GitHub is the one case
          where you add the directive yourself.{' '}
          <a className="text-link" href="#/docs/frameworks">Frameworks<ArrowRightIcon size={14} /></a>
        </Callout>
        <CodeBlock
          code={`# The whole index, if you want to browse it
https://liquefy-ui.com/r/registry.json`}
        />
      </Section>

      <Section id="gotchas" title="What agents get wrong, and the correction">
        <GuideTable
          headers={['The guess', 'The reality']}
          rows={[
            [<code>&lt;LiquidButton variant=&quot;primary&quot;&gt;</code>, <>No such prop. Hierarchy comes from <code>size</code>, <code>tint</code> and placement.</>],
            [<><code>className=&quot;bg-white/10&quot;</code> as the override path</>, <>Works only once the Tailwind layer order is set up; the general answer is <code>styles</code>.</>],
            [<>Importing from <code>@liquefy-ui/react/button</code></>, 'Everything is exported from the package root.'],
            [<>Rendering a component with no provider</>, <>Tokens come from <code>LiquefyProvider</code>; without it there is no tint and no spacing scale.</>],
            [<>Adding <code>&apos;use client&apos;</code> to a page just to render a card</>, 'Not needed — the published bundles carry the directive. It is only needed where your own handlers live.'],
            [<>Reaching for <code>styled()</code> or a <code>sx</code> prop</>, <>Neither exists. It is <code>styles</code>, with <code>$token</code> references.</>],
          ]}
        />
      </Section>
    </>
  ),
  slug: 'ai-tooling',
  summary: 'The MCP server and its six tools, llms.txt, the shadcn registry, and common agent mistakes.',
}
