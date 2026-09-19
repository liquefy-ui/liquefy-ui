import { ArrowRightIcon } from '@liquefy-ui/icons'
import { Ambience, SiteFooter, SiteHeader, useScrollReset } from './chrome'
import { Playground } from './playground'

const MAPPING: [string, string, string][] = [
  ['Appearance', 'theme', 'Explicit light or dark. In an app, theme="system" follows the OS instead.'],
  ['Optical intensity', 'intensity', 'Strength of the glass: blur, saturation, and the brightness of the bezel.'],
  ['Wobbliness', 'wobbliness', 'Spring looseness. 0 keeps transitions but stops the jelly overshoot.'],
  ['Elasticity', 'elasticity', 'How far a surface leans toward a pointer that has not reached it yet. 0 is rigid.'],
  ['Frost', 'frost', 'Backdrop blur added to every glass. Each surface keeps the blur its own job needs on top.'],
  ['Dispersion', 'dispersion', 'How far apart the red and blue channels are pulled at the rim.'],
  ['Rim glow', 'glow', 'The lit patch that follows the pointer around the bezel.'],
  ['Press ripple', 'ripple', 'The ring that travels out from a press.'],
  ['Iridescence', 'shimmer', 'The colour shift across the rim while a surface is still wobbling.'],
  ['Sparkle', 'sparkle', 'Slow specular glints drifting across the face.'],
  ['Jelly motion', 'motion', 'Master switch for the spring physics.'],
  ['Transparency', 'transparency', 'Off swaps the translucent fills for opaque ones, for contrast or performance.'],
  ['GPU shader', 'webgl', 'Off falls back to CSS-only glass — same tokens, same layout, no canvas.'],
  ['Edge refraction', 'lens', 'The displacement lens at the bezel. Off keeps the blur but drops the bend.'],
]

export const PlaygroundPage = ({ route }: { route: string }) => {
  useScrollReset(route)

  return (
    <div className="site-shell">
      <Ambience />
      <SiteHeader section="playground" />

      <main className="playground-page">
        <header className="section-heading section-heading--page">
          <span>Playground</span>
          <h1>Tune the material.</h1>
          <p>
            These are the <code>LiquefyProvider</code> props, wired to the whole site. Whatever you set
            here follows you into the docs and the component pages, and the snippet underneath is the
            configuration that reproduces it.
          </p>
        </header>

        <Playground />

        <section className="mapping">
          <h2>What each control changes</h2>
          <div className="docs-props__scroll">
            <table>
              <thead>
                <tr>
                  <th>Control</th>
                  <th>Prop</th>
                  <th>Effect</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map(([control, prop, effect]) => (
                  <tr key={prop}>
                    <td>{control}</td>
                    <td><code className="docs-props__type">{prop}</code></td>
                    <td>{effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mapping__note">
            Motion and transparency stay on by default regardless of OS accessibility settings: the
            library does not silently opt a product out of its own design language. Wiring{' '}
            <code>prefers-reduced-motion</code> to the <code>motion</code> prop takes four lines, and the
            accessibility page has them.{' '}
            <a className="text-link" href="#/docs/accessibility">Accessibility<ArrowRightIcon size={14} /></a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
