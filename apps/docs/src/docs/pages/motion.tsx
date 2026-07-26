import { LiquidButton, LiquidSurface } from '@liquefy-ui/react'
import { SubProvider } from '../../site/site-config'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Callout, CodeBlock, DemoBlock, GuideTable, Section } from '../docs-chrome'
import type { DocEntry } from '../types'

export const motionDoc: DocEntry = {
  description: 'Springs instead of easing curves: what each gesture does, how to tune it, and how to turn it off.',
  name: 'Motion',
  render: () => (
    <>
      <Section id="springs" title="Springs, not curves">
        <p>
          Interaction feedback runs through spring integrators rather than CSS transitions. The
          practical difference is interruption: press a button, release halfway through the squash, and
          the release resolves from wherever the surface actually is. A CSS curve would restart from its
          keyframe and stutter.
        </p>
        <p>
          Each surface owns a handful of springs — pointer position, scale on both axes, skew, tilt, and
          lift — and writes their current values to custom properties on every frame. One{' '}
          <code>transform</code> composes them, which is why the whole thing stays on the compositor.
        </p>
        <DemoBlock
          demo={{
            code: `<LiquidButton size="lg">Press and hold</LiquidButton>`,
            description: 'Press and hold: the surface squashes along the axis you pushed. Release and it overshoots once before settling.',
            render: () => (
              <div className="stage-row">
                <LiquidButton size="lg">Press and hold</LiquidButton>
                <LiquidSurface radius={22} styles={{ px: 6, py: 5 }}>Hover across me</LiquidSurface>
              </div>
            ),
            title: 'The gesture',
          }}
        />
      </Section>

      <Section id="gestures" title="What each gesture does">
        <GuideTable
          headers={['Event', 'Response']}
          rows={[
            ['Pointer enters', 'The surface scales up by 1%, lifts 1.5px towards the viewer, and the specular shine fades in.'],
            ['Pointer moves', 'Tilt follows the pointer on both axes, and the shine tracks it. A fraction of the offset also pulls the surface towards the pointer — the magnet.'],
            ['Pointer down', 'Scale splits: wider on x, shorter on y, with a skew in the direction of the press. That is the squash.'],
            ['Pointer up', 'Targets flip back past their resting values, so the release overshoots once and settles.'],
            ['Pointer leaves', 'Everything returns to rest, including the shine.'],
            ['Value changes', 'Inputs, selects and chips fire a pulse — the release overshoot on its own, without a press.'],
          ]}
        />
        <p>
          The shine is the only part that needs the GPU. With <code>webgl={'{false}'}</code> the springs
          still run and the surface still squashes; there is simply no canvas.
        </p>
      </Section>

      <Section id="tuning" title="Tuning it">
        <GuideTable
          headers={['Prop', 'Range', 'What it changes']}
          rows={[
            [<code>wobbliness</code>, <>0 – 1.5 (default <code>1</code>)</>, 'Damping of the jelly springs. 0 removes the overshoot but keeps the movement; 1.5 is comically loose.'],
            [<code>motion</code>, 'boolean', 'Master switch. Off detaches the springs entirely and leaves the CSS transitions, so states are still legible.'],
            [<code>interactive</code>, 'boolean, per surface', 'Off on a surface means it never tracks the pointer at all — the right call for a static container.'],
          ]}
        />
        <DemoBlock
          demo={{
            code: `<LiquefyProvider wobbliness={0}>
  <LiquidButton>Critically damped</LiquidButton>
</LiquefyProvider>

<LiquefyProvider wobbliness={1.5}>
  <LiquidButton>Very loose</LiquidButton>
</LiquefyProvider>`,
            description: 'Press each one. Same component, same spring engine, two damping values.',
            render: () => (
              <div className="stage-row">
                <SubProvider wobbliness={0}>
                  <LiquidButton>Critically damped</LiquidButton>
                </SubProvider>
                <SubProvider wobbliness={1.5}>
                  <LiquidButton>Very loose</LiquidButton>
                </SubProvider>
              </div>
            ),
            title: 'Two wobbliness values, side by side',
          }}
        />
      </Section>

      <Section id="reduced" title="prefers-reduced-motion is your call">
        <p>
          The library does not read <code>prefers-reduced-motion</code> on its own. That is a deliberate
          choice rather than an oversight: turning the material&rsquo;s core behaviour off for a whole
          class of visitors is a product decision, and quietly making it inside a component leaves no way
          to make it differently.
        </p>
        <p>
          Wiring it up is four lines, and it belongs next to wherever your provider lives.
        </p>
        <CodeBlock
          code={`'use client'

import { LiquefyProvider } from '@liquefy-ui/react'
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    setReduced(media.matches)
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return <LiquefyProvider motion={!reduced}>{children}</LiquefyProvider>
}`}
        />
        <Callout title="Motion off is not motion missing">
          With <code>motion={'{false}'}</code> the CSS transitions on colour, border and shadow remain. A
          press still reads as a press, a switch still reads as flipped — the difference is that nothing
          overshoots.{' '}
          <a className="text-link" href="#/docs/accessibility">Accessibility<ArrowRightIcon size={14} /></a>
        </Callout>
      </Section>

      <Section id="own" title="Springs on your own elements">
        <p>
          <code>useLiquidGlass</code> is the hook the components use. Give it a forwarded ref and the
          options, and it returns the element ref, a canvas ref for the shine, and a{' '}
          <code>pulse</code> function you can fire on any event that deserves feedback.
        </p>
        <CodeBlock
          code={`'use client'

import { useLiquidGlass, useLiquefyConfig } from '@liquefy-ui/react'

export const Tile = ({ children }: { children: React.ReactNode }) => {
  const config = useLiquefyConfig()
  const [ref, canvasRef, pulse] = useLiquidGlass<HTMLDivElement>(undefined, {
    intensity: config.intensity,
    motion: config.motion,
    tint: config.tint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  })

  return (
    <div className="lq-surface" onDrop={() => pulse(1.2)} ref={ref}>
      <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />
      {children}
    </div>
  )
}`}
        />
        <p>
          If all you want is the physics — no glass, no canvas — <code>attachLiquidMotion</code> from{' '}
          <code>@liquefy-ui/core</code> takes a plain element and returns a controller with{' '}
          <code>pulse</code>, <code>setDisabled</code> and <code>destroy</code>. It has no React
          dependency at all.
        </p>
      </Section>

      <Section id="cost" title="What it costs">
        <p>
          Springs only integrate while they are away from rest, so an idle page runs no animation frames.
          Hovering one surface wakes that surface, not the page. The engine itself is about 2 KB before
          gzip.
        </p>
        <p>
          The expensive part of a surface is never the motion — it is the shader and the{' '}
          <code>backdrop-filter</code>.{' '}
          <a className="text-link" href="#/docs/performance">Performance<ArrowRightIcon size={14} /></a>
        </p>
      </Section>
    </>
  ),
  slug: 'motion',
  summary: 'The spring engine, the gesture map, wobbliness, reduced motion, and useLiquidGlass.',
}
