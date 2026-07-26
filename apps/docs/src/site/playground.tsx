import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
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
} from '@liquefy-ui/react'
import { HeartIcon, SearchIcon, SparklesIcon } from '@liquefy-ui/icons'
import { CopyButton } from './chrome'
import { LiquefyLockup } from './lockup'
import { TINTS, useSiteConfig } from './site-config'

/**
 * The draggable lens. It is the fastest way to feel what the library actually
 * does, so it sits at the top of the playground where a first-time visitor's
 * pointer already is.
 */
const LensStage = () => {
  const stageRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [position, setPosition] = useState({ x: 0.62, y: 0.46 })
  const [touched, setTouched] = useState(false)

  const moveTo = (clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return
    const bounds = stage.getBoundingClientRect()
    setPosition({
      x: Math.min(0.86, Math.max(0.14, (clientX - bounds.left) / bounds.width)),
      y: Math.min(0.78, Math.max(0.22, (clientY - bounds.top) / bounds.height)),
    })
  }

  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    setTouched(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic pointer events have no active pointer to capture.
    }
    moveTo(event.clientX, event.clientY)
  }

  const lensStyle = {
    left: `${(position.x * 100).toFixed(2)}%`,
    top: `${(position.y * 100).toFixed(2)}%`,
  } as CSSProperties

  return (
    <div className="pg-stage" ref={stageRef}>
      <div aria-hidden="true" className="pg-stage__backdrop">
        <LiquefyLockup className="pg-stage__word" />
        <span className="pg-stage__orb pg-stage__orb--one" />
        <span className="pg-stage__orb pg-stage__orb--two" />
        <span className="pg-stage__rule" />
      </div>
      <div
        className="pg-lens-handle"
        data-touched={touched}
        onPointerCancel={() => { draggingRef.current = false }}
        onPointerDown={handleDown}
        onPointerMove={(event) => { if (draggingRef.current) moveTo(event.clientX, event.clientY) }}
        onPointerUp={() => { draggingRef.current = false }}
        style={lensStyle}
      >
        <LiquidSurface className="pg-lens" radius={72} variant="clear">
          <span className="pg-lens__hint">drag me</span>
        </LiquidSurface>
      </div>
      <span className="pg-stage__caption">A WebGL displacement lens bending the live backdrop at its bezel.</span>
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

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

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
          onValueChange={(value) => config.setTheme(value === 'dark' ? 'dark' : 'light')}
          options={THEME_OPTIONS}
          value={config.theme === 'dark' ? 'dark' : 'light'}
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
          onChange={(event) => config.setMaterial('intensity', Number(event.currentTarget.value))}
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
          onChange={(event) => config.setMaterial('wobbliness', Number(event.currentTarget.value))}
          step={0.1}
          value={config.wobbliness}
        />
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
    `  theme="${config.theme}"`,
    `  tint="${config.tint}"`,
    `  intensity={${config.intensity.toFixed(2)}}`,
    `  wobbliness={${config.wobbliness.toFixed(1)}}`,
    flag('lens', config.lens),
    flag('motion', config.motionOn),
    flag('transparency', config.transparency),
    flag('webgl', config.webgl),
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
