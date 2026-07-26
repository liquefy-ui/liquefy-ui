import { LiquidButton, LiquidSurface } from '@liquefy-ui/react'
import { ArrowRightIcon, ComponentsIcon, GithubIcon, SparklesIcon } from '@liquefy-ui/icons'
import { Ambience, SiteFooter, SiteHeader, repositoryUrl, version } from './chrome'
import { Connect } from './landing-connect'
import { Showcase } from './landing-showcase'
import { Playground } from './playground'

const Cta = () => (
  <section className="section cta">
    <LiquidSurface className="cta-card" radius={34}>
      <div>
        <span className="cta-card__eyebrow">Get started</span>
        <h2>Install it, then keep tuning.</h2>
        <p>
          The documentation covers the provider, the token system, the <code>styles</code> prop, the
          framework boundaries, and the tooling that lets a coding agent write against the real API.
        </p>
      </div>
      <div className="cta-card__actions">
        <LiquidButton
          iconAfter={<ArrowRightIcon />}
          onClick={() => { window.location.hash = '#/docs/installation' }}
          size="lg"
        >
          Start with installation
        </LiquidButton>
        <a className="text-link" href="#/docs">Read every guide<ArrowRightIcon size={14} /></a>
      </div>
    </LiquidSurface>
  </section>
)

export const Landing = () => (
  <div className="site-shell">
    <Ambience />
    <SiteHeader section="home" />

    <main>
      <section className="hero" id="playground">
        <div className="hero__copy">
          <LiquidSurface className="hero-pill" radius={999} variant="clear" webgl={false}>
            <SparklesIcon size={15} />
            <span>Liquid Glass for the open web</span>
            <em>v{version}</em>
          </LiquidSurface>
          <h1>Interfaces with<span> surface tension.</span></h1>
          <p className="hero__lede">
            Transparent, tactile, and genuinely usable — WebGL optics and spring physics behind
            accessible React components. Start by playing with the material itself: every control here
            retints the whole site as you move it.
          </p>
          <div className="hero__actions">
            <LiquidButton
              iconAfter={<ArrowRightIcon />}
              onClick={() => { window.location.hash = '#/docs' }}
              size="lg"
            >
              Read the docs
            </LiquidButton>
            <LiquidButton
              iconBefore={<ComponentsIcon />}
              onClick={() => { window.location.hash = '#/components' }}
              size="lg"
            >
              Components
            </LiquidButton>
            <a aria-label="GitHub repository" className="hero__github" href={repositoryUrl} rel="noreferrer" target="_blank">
              <GithubIcon size={18} />
            </a>
          </div>
        </div>

        <Playground />
      </section>

      <Connect />
      <Showcase />
      <Cta />
    </main>

    <SiteFooter />
  </div>
)
