import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  GlassCard,
  LiquidBadge,
  LiquidButton,
  LiquidChip,
  LiquidSegmented,
  LiquidSlider,
  LiquidSurface,
  LiquidSwitch,
  LiquidTextField,
  type LiquefyTheme,
} from '@liquefy-ui/react'
import { HeartIcon, SearchIcon, SparklesIcon } from '@liquefy-ui/icons'
import { CopyButton } from './chrome'
import { LiquefyLockup } from './lockup'
import { THEME_LABELS, THEME_ORDER, TINTS, useSiteConfig } from './site-config'

/**
 * What the glass is held over. Photographs first, because that is what a real
 * product puts behind a panel, and synthetic scenes between them because a
 * photograph is bad at proving one specific thing: a 9px grid shows a bend a
 * soft gradient would hide, and hard-edged colour shows a dispersion that a
 * neutral ground has nothing to separate.
 */
const SCENES = [
  { id: 'mark', label: 'The wordmark', note: 'soft ink, wide shapes' },
  { credit: 'Alexey Topolyanskiy', id: 'fjord', label: 'Fjord', note: 'deep water, hard rock' },
  { id: 'rules', label: 'Fine rules', note: 'where displacement shows' },
  { credit: 'Wolfgang Lutz', id: 'summit', label: 'Summit', note: 'where a rim usually disappears' },
  { id: 'chroma', label: 'Saturated colour', note: 'where dispersion shows' },
  { credit: 'Stefan Kunze', id: 'coast', label: 'Coast at dusk', note: 'soft light, long gradients' },
] as const

/** Long enough to read a scene, short enough that nobody waits for the next. */
const AUTO_ADVANCE_MS = 2800

/**
 * A panel of glass held still while the world moves behind it.
 *
 * The scenes are driven, never dragged. An earlier version let the wheel scroll
 * them, which turned the stage into a trap: with the pointer over it the page
 * itself would not move until all six scenes had been wound past, and the very
 * first notch of that wheel was also read as "the visitor has taken over", so
 * the slideshow stopped before it had started. Now the scroller is not
 * user-scrollable at all — it advances on its own and on the dots, and the page
 * scrolls straight past it the way every other block does.
 */
const LensStage = () => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [taken, setTaken] = useState(false)

  const show = (next: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setIndex(next)
    scroller.scrollTo({ behavior: 'smooth', top: next * scroller.clientHeight })
  }

  /**
   * One pass, and then it leaves the page alone. It waits until the stage is on
   * screen so nobody misses it, stops for good at the last scene rather than
   * looping, and does not run at all under a reduced-motion preference — this
   * is movement the visitor did not ask for, whatever the library's own stance
   * on animation is.
   */
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || taken) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    let at = 0
    let timer = 0
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      timer = window.setTimeout(function step() {
        at += 1
        if (at >= SCENES.length) return
        setIndex(at)
        scroller.scrollTo({ behavior: 'smooth', top: at * scroller.clientHeight })
        timer = window.setTimeout(step, AUTO_ADVANCE_MS)
      }, AUTO_ADVANCE_MS)
    }, { threshold: 0.4 })
    observer.observe(scroller)

    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [taken])

  /** A resize changes what one scene is worth, so the offset has to be redone. */
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined
    const reflow = () => { scroller.scrollTop = index * scroller.clientHeight }
    window.addEventListener('resize', reflow)
    return () => window.removeEventListener('resize', reflow)
  }, [index])

  return (
    <div className="pg-stage">
      <div className="pg-stage__scroll" ref={scrollerRef}>
        <div className="pg-stage__sticky">
          <LiquidSurface className="pg-card" radius={28}>
            <p className="pg-card__eyebrow">Live material</p>
            <h3 className="pg-card__title">Nothing behind it is hidden.</h3>
            <p className="pg-card__body">
              This panel is the same LiquidSurface every component is built on, held
              over whatever happens to be passing. A photograph, a grid and a wall of
              colour — the material has to survive all three, and the controls on the
              right change it everywhere at once.
            </p>
          </LiquidSurface>
        </div>

        {SCENES.map((scene) => (
          <section className={`pg-scene pg-scene--${scene.id}`} key={scene.id}>
            {scene.id === 'mark' ? (
              <div aria-hidden="true" className="pg-stage__backdrop">
                <LiquefyLockup className="pg-stage__word" />
                <span className="pg-stage__orb pg-stage__orb--one" />
                <span className="pg-stage__orb pg-stage__orb--two" />
                <span className="pg-stage__rule" />
              </div>
            ) : null}
            <span className="pg-scene__tag">
              {scene.label}
              <em>{scene.note}</em>
              {'credit' in scene ? <em className="pg-scene__credit">Photo by {scene.credit}</em> : null}
            </span>
          </section>
        ))}
      </div>

      <div aria-label="Scenes" className="pg-dots" role="group">
        {SCENES.map((scene, position) => (
          <button
            aria-current={position === index ? 'true' : undefined}
            aria-label={scene.label}
            className="pg-dots__dot"
            key={scene.id}
            onClick={() => { setTaken(true); show(position) }}
            type="button"
          />
        ))}
      </div>

      <span className="pg-stage__caption">
        {(SCENES[index] ?? SCENES[0]).label} — {index + 1} of {SCENES.length}. Edge refraction is
        on by default; every switch for it is on the right.
      </span>
    </div>
  )
}


const SAMPLE_TABS = [
  { label: 'Card', value: 'card' },
  { label: 'Form', value: 'form' },
  { label: 'Media', value: 'media' },
]

/** Real components, wired up, so every control on the right has something to change. */
const SamplePanel = () => {
  const [tab, setTab] = useState('card')
  const [liked, setLiked] = useState(false)
  const [notify, setNotify] = useState(true)

  return (
    <LiquidSurface className="pg-sample" interactive={false} radius={26} webgl={false}>
      <LiquidSegmented label="Sample surface" onValueChange={setTab} options={SAMPLE_TABS} value={tab} />

      {tab === 'card' && (
        <GlassCard
          description="The backdrop stays visible. Only the optical edge, the tint and the contrast define this layer."
          eyebrow="Live material"
          radius={22}
          title="Clarity over blur"
          variant="clear"
        >
          <div className="pg-sample__row">
            <LiquidButton iconBefore={<SparklesIcon />}>Continue</LiquidButton>
            <LiquidButton iconBefore={<HeartIcon />} onClick={() => setLiked((current) => !current)}>
              {liked ? 'Saved' : 'Save'}
            </LiquidButton>
          </div>
        </GlassCard>
      )}

      {tab === 'form' && (
        <div className="pg-sample__form">
          <LiquidTextField
            label="Search components"
            placeholder="Try “button”"
            startAdornment={<SearchIcon size={18} />}
          />
          <div className="pg-sample__field">
            <span>Email notifications</span>
            <LiquidSwitch checked={notify} label="Email notifications" onCheckedChange={setNotify} />
          </div>
          <LiquidSlider defaultValue={64} label="Spatial depth" max={100} min={0} />
          <div className="pg-sample__row">
            <LiquidButton>Save changes</LiquidButton>
            <LiquidChip>Unsaved changes</LiquidChip>
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div className="pg-sample__media">
          <div className="pg-sample__art" aria-hidden="true"><span /><span /></div>
          <div className="pg-sample__meta">
            <div>
              <strong>Afterglow</strong>
              <span>Velvet Horizon</span>
            </div>
            <LiquidBadge>Hi-Res</LiquidBadge>
          </div>
          <LiquidSlider aria-label="Playback position" defaultValue={38} max={100} min={0} />
          <div className="pg-sample__row">
            <LiquidButton iconBefore={<SparklesIcon />}>Play</LiquidButton>
            <LiquidButton>Queue</LiquidButton>
          </div>
        </div>
      )}
    </LiquidSurface>
  )
}

const THEME_OPTIONS = THEME_ORDER.map((value) => ({ label: THEME_LABELS[value], value }))

/** The four ornaments, which are separable from the optics underneath them. */
const ORNAMENTS = [
  { key: 'glow', label: 'Rim glow' },
  { key: 'ripple', label: 'Press ripple' },
  { key: 'shimmer', label: 'Iridescence' },
  { key: 'sparkle', label: 'Sparkle' },
] as const satisfies readonly { key: 'glow' | 'ripple' | 'shimmer' | 'sparkle'; label: string }[]

type ControlRailProps = {
  onToggleCode: () => void
  showCode: boolean
}

/** The material controls. Everything here re-tints the entire site, live. */
const ControlRail = ({ onToggleCode, showCode }: ControlRailProps) => {
  const config = useSiteConfig()

  return (
    <LiquidSurface className="pg-rail" interactive={false} radius={26} webgl={false}>
      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">Appearance</span>
        <LiquidSegmented
          label="Appearance"
          onValueChange={(value) => config.setTheme(value as LiquefyTheme)}
          options={THEME_OPTIONS}
          value={config.themeChoice}
        />
      </div>

      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">
          Tint
          <em>{TINTS.find((entry) => entry.value === config.tint)?.label ?? config.tint}</em>
        </span>
        <div className="pg-tints">
          {TINTS.map((tint) => (
            <button
              aria-label={`Set tint to ${tint.label}`}
              aria-pressed={config.tint === tint.value}
              key={tint.value}
              onClick={() => config.setMaterial('tint', tint.value)}
              style={{ '--swatch': tint.value } as CSSProperties}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">Optical intensity<em>{config.intensity.toFixed(2)}</em></span>
        <LiquidSlider
          aria-label="Optical intensity"
          max={1.2}
          min={0.2}
          onValueChange={(value) => config.setMaterial('intensity', value)}
          step={0.01}
          value={config.intensity}
        />
      </div>

      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">Wobbliness<em>{config.wobbliness.toFixed(1)}</em></span>
        <LiquidSlider
          aria-label="Wobbliness"
          max={2}
          min={0}
          onValueChange={(value) => config.setMaterial('wobbliness', value)}
          step={0.1}
          value={config.wobbliness}
        />
      </div>

      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">Elasticity<em>{config.elasticity.toFixed(2)}</em></span>
        <LiquidSlider
          aria-label="Elasticity"
          max={0.6}
          min={0}
          onValueChange={(value) => config.setMaterial('elasticity', value)}
          step={0.01}
          value={config.elasticity}
        />
      </div>

      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">Frost<em>{config.frost}px</em></span>
        <LiquidSlider
          aria-label="Frost"
          max={24}
          min={0}
          onValueChange={(value) => config.setMaterial('frost', value)}
          step={1}
          value={config.frost}
        />
      </div>

      <div className="pg-rail__row pg-rail__row--stacked">
        <span className="pg-rail__label">Dispersion<em>{config.dispersion.toFixed(2)}</em></span>
        <LiquidSlider
          aria-label="Dispersion"
          max={1}
          min={0}
          onValueChange={(value) => config.setMaterial('dispersion', value)}
          step={0.05}
          value={config.dispersion}
        />
      </div>

      <div className="pg-rail__switches">
        {ORNAMENTS.map((ornament) => (
          <div className="pg-rail__row" key={ornament.key}>
            <span>{ornament.label}</span>
            <LiquidSwitch
              checked={config[ornament.key]}
              label={ornament.label}
              onCheckedChange={(next) => config.setMaterial(ornament.key, next)}
            />
          </div>
        ))}
      </div>

      <div className="pg-rail__switches">
        <div className="pg-rail__row">
          <span>Jelly motion</span>
          <LiquidSwitch checked={config.motionOn} label="Jelly motion" onCheckedChange={config.setMotionOn} />
        </div>
        <div className="pg-rail__row">
          <span>Transparency</span>
          <LiquidSwitch
            checked={config.transparency}
            label="Transparency"
            onCheckedChange={(next) => config.setMaterial('transparency', next)}
          />
        </div>
        <div className="pg-rail__row">
          <span>GPU shader</span>
          <LiquidSwitch
            checked={config.webgl}
            label="GPU shader"
            onCheckedChange={(next) => config.setMaterial('webgl', next)}
          />
        </div>
        <div className="pg-rail__row">
          <span>Edge refraction</span>
          <LiquidSwitch
            checked={config.lens}
            label="Edge refraction"
            onCheckedChange={(next) => config.setMaterial('lens', next)}
          />
        </div>
      </div>

      <div className="pg-rail__actions">
        <button aria-expanded={showCode} className="pg-rail__code" onClick={onToggleCode} type="button">
          {showCode ? 'Hide settings as code' : 'Show settings as code'}
        </button>
        <button className="pg-rail__reset" onClick={config.reset} type="button">Reset material</button>
      </div>
    </LiquidSurface>
  )
}

const providerSnippet = (config: ReturnType<typeof useSiteConfig>) => {
  const flag = (name: string, value: boolean) => (value ? `  ${name}` : `  ${name}={false}`)
  return [
    '<LiquefyProvider',
    `  theme="${config.themeChoice}"`,
    `  tint="${config.tint}"`,
    `  intensity={${config.intensity.toFixed(2)}}`,
    `  wobbliness={${config.wobbliness.toFixed(1)}}`,
    `  elasticity={${config.elasticity.toFixed(2)}}`,
    `  frost={${config.frost}}`,
    `  dispersion={${config.dispersion.toFixed(2)}}`,
    flag('lens', config.lens),
    flag('motion', config.motionOn),
    flag('transparency', config.transparency),
    flag('webgl', config.webgl),
    ...ORNAMENTS.map((ornament) => flag(ornament.key, config[ornament.key])),
    '>',
    '  <App />',
    '</LiquefyProvider>',
  ].join('\n')
}

/** The settings you just picked, as the code that reproduces them. */
const ConfigSnippet = () => {
  const config = useSiteConfig()
  const code = providerSnippet(config)

  return (
    <div className="pg-snippet">
      <div className="pg-snippet__head">
        <span>Your settings, as code</span>
        <CopyButton label="Copy provider configuration" text={code} />
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

export const Playground = () => {
  // The snippet stays folded away so the control rail lines up with the stage
  // beside it; opening it scrolls inside the rail rather than growing the column.
  const [showCode, setShowCode] = useState(false)

  return (
    <div className="pg">
      <div className="pg__main">
        <LensStage />
        <SamplePanel />
      </div>
      <div className="pg__side">
        <ControlRail onToggleCode={() => setShowCode((current) => !current)} showCode={showCode} />
        {showCode && <ConfigSnippet />}
      </div>
    </div>
  )
}
