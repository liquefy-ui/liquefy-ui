import { useRef, useState } from 'react'
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
import { DEFAULT_MATERIAL, THEME_LABELS, THEME_ORDER, useSiteConfig } from './site-config'

/**
 * What the glass is held over. Photographs first, because that is what a real
 * product puts behind a panel, and synthetic scenes between them because a
 * photograph is bad at proving one specific thing: a 9px grid shows a bend a
 * soft gradient would hide, and hard-edged colour shows where the bend moves
 * a boundary that a neutral ground would have nothing to move.
 */
const SCENES = [
  { credit: 'Alexey Topolyanskiy', id: 'fjord', label: 'Fjord', note: 'deep water, hard rock' },
  { id: 'mark', label: 'The wordmark', light: true, note: 'soft ink, wide shapes' },
  { id: 'rules', label: 'Fine rules', light: true, note: 'where displacement shows' },
  { credit: 'Wolfgang Lutz', id: 'summit', label: 'Summit', note: 'where a rim usually disappears' },
  { id: 'chroma', label: 'Saturated colour', note: 'where the rim bends a hard edge' },
  { credit: 'Stefan Kunze', id: 'coast', label: 'Coast at dusk', note: 'soft light, long gradients' },
] as const

/**
 * A panel of glass held still while the world moves behind it.
 *
 * The scenes are the visitor's to move: the stage is an ordinary scrolling
 * region and nothing snaps it afterwards, so it can be left halfway between two
 * scenes with the glass straddling both — which is the one arrangement that
 * shows what the material does to an edge, and the one a slideshow can never
 * produce. The dots are a shortcut to a scene, not a set of positions the
 * scroll is allowed to rest on.
 */
const LensStage = () => {
  const config = useSiteConfig()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  // The two drawn scenes take their ground from the page theme, so they are pale
  // only while the page is. The card carries white type, and on a pale ground it
  // has to answer for that — but in the dark theme those scenes are black and
  // there is nothing to answer, which is why the theme is half of this test.
  const scene = SCENES[index]
  const overLight = scene !== undefined && 'light' in scene && config.theme === 'light'

  const show = (next: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ behavior: 'smooth', top: next * scroller.clientHeight })
  }

  /**
   * Which scene the dots point at is read back off the scroll rather than
   * remembered from the last jump, so it stays honest while the visitor
   * scrolls by hand — and rounding is only ever applied to this readout, never
   * to `scrollTop` itself.
   */
  const handleScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientHeight === 0) return
    const at = Math.round(scroller.scrollTop / scroller.clientHeight)
    setIndex(Math.min(Math.max(at, 0), SCENES.length - 1))
  }

  return (
    <div className="pg-stage">
      <div className="pg-stage__scroll" onScroll={handleScroll} ref={scrollerRef}>
        <div className="pg-stage__sticky">
          <LiquidSurface className="pg-card" data-over-light={overLight || undefined} radius={28}>
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
            onClick={() => show(position)}
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
        <span className="pg-rail__label">Veil<em>{config.veil.toFixed(2)}</em></span>
        <LiquidSlider
          aria-label="Veil"
          max={1}
          min={0}
          onValueChange={(value) => config.setMaterial('veil', value)}
          step={0.05}
          value={config.veil}
        />
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
        <span className="pg-rail__label">Refraction<em>{config.refraction.toFixed(2)}</em></span>
        <LiquidSlider
          aria-label="Refraction"
          max={1}
          min={0}
          onValueChange={(value) => config.setMaterial('refraction', value)}
          step={0.05}
          value={config.refraction}
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

/**
 * The settings you picked, as the code that reproduces them — and only the ones
 * that differ from the library's own. At rest that leaves `<LiquefyProvider>`
 * with nothing on it, which is the honest answer to "what do I have to pass to
 * get this?": nothing.
 */
const providerSnippet = (config: ReturnType<typeof useSiteConfig>) => {
  const lines: string[] = []
  const flag = (name: string, value: boolean, fallback: boolean) => {
    if (value !== fallback) lines.push(value ? `  ${name}` : `  ${name}={false}`)
  }
  const dial = (name: string, value: number, fallback: number, digits: number) => {
    if (value !== fallback) lines.push(`  ${name}={${value.toFixed(digits)}}`)
  }

  if (config.themeChoice !== 'system') lines.push(`  theme="${config.themeChoice}"`)
  dial('veil', config.veil, DEFAULT_MATERIAL.veil, 2)
  dial('intensity', config.intensity, DEFAULT_MATERIAL.intensity, 2)
  dial('refraction', config.refraction, DEFAULT_MATERIAL.refraction, 2)
  dial('frost', config.frost, DEFAULT_MATERIAL.frost, 0)
  dial('wobbliness', config.wobbliness, DEFAULT_MATERIAL.wobbliness, 1)
  flag('lens', config.lens, DEFAULT_MATERIAL.lens)
  flag('motion', config.motionOn, true)
  flag('transparency', config.transparency, DEFAULT_MATERIAL.transparency)
  flag('webgl', config.webgl, DEFAULT_MATERIAL.webgl)
  for (const ornament of ORNAMENTS) flag(ornament.key, config[ornament.key], DEFAULT_MATERIAL[ornament.key])

  return [
    lines.length > 0 ? `<LiquefyProvider\n${lines.join('\n')}\n>` : '<LiquefyProvider>',
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
