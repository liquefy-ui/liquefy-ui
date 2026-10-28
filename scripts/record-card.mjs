#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

/**
 * Re-draws the social cards: `brand/liquefy-og.png` for the site's `og:image`, and
 * `brand/liquefy-social.png` at GitHub's aspect for the repository's social
 * preview. Not part of any build — like the GIF, they only need redrawing when the
 * material or the wording changes.
 *
 *   pnpm build && pnpm preview          # in one terminal
 *   node scripts/record-card.mjs        # in another
 *
 * Playwright is not a dependency of this repository; install it somewhere
 * disposable and point this at it, exactly as `record-lens.mjs` says:
 *
 *   npm --prefix /tmp/lens-tools i playwright
 *   LENS_MODULES=/tmp/lens-tools node scripts/record-card.mjs
 *
 * Set LENS_CHROME to a Chromium binary when playwright's own download is missing.
 * The browser renders through SwiftShader, so no GPU is needed.
 *
 * The picture in the card is not a mock-up: it is a clipped screenshot of the
 * landing page's own glass stage over its water, so the refraction and the
 * lit rim are the ones a visitor gets. This card stays dark so those low-contrast
 * effects remain legible in a small still image. The water is different on every
 * run, so run it a few times and keep the take where the colour reaches the
 * panel's edges; both cards always come from the one frame.
 */

const URL_ = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
/**
 * The widest the stage gets: at 1080 the playground drops to one column and the
 * stage takes the whole row, so the panel in its middle has water on both sides.
 */
const VIEWPORT = { height: 1000, width: 1080 }

const CARDS = [
  { file: 'liquefy-og.png', height: 630, width: 1200 },
  { file: 'liquefy-social.png', height: 640, width: 1280 },
]

/** The card's side padding and the picture's height, shared with the markup below. */
const PAD_X = 56
const FIGURE_H = 280

// `createRequire`, not `import`: a bare specifier in an ES module resolves against
// this file's directory and ignores NODE_PATH, so an install outside the
// repository is unreachable any other way.
const load = createRequire(process.env.LENS_MODULES
  ? join(process.env.LENS_MODULES, 'noop.js')
  : import.meta.url)

let chromium
try {
  ({ chromium } = load('playwright'))
} catch {
  console.error('playwright is not installed. See the comment at the top of this file.')
  process.exit(1)
}

/** Straight through CDP: Playwright's screenshot waits for a still frame, and a
 *  page whose springs and shader never stop does not have one. */
const capture = async (page, clip) => {
  const client = await page.context().newCDPSession(page)
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    ...(clip ? { clip: { ...clip, scale: 2 } } : {}),
  })
  return Buffer.from(data, 'base64')
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  executablePath: process.env.LENS_CHROME || undefined,
})
process.once('SIGINT', () => browser.close().finally(() => process.exit(130)))
const page = await browser.newPage({ colorScheme: 'dark', viewport: VIEWPORT })
// SwiftShader compiles the page's shaders on the main thread, and the page
// answers nothing until it has: the better part of a minute without a GPU.
page.setDefaultTimeout(180_000)
await page.goto(URL_, { waitUntil: 'load' })

const stage = page.locator('.pg-stage').first()
// Not `scrollIntoViewIfNeeded`: it waits for the element to hold still, for the
// same reason the screenshot below cannot.
await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(2500)

const box = await stage.boundingBox()
const panel = await page.locator('.pg-card').first().boundingBox()
// The boxes are measured from the viewport, the protocol's clip from the page.
const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))

// A band across the whole stage, centred on the panel, as tall as the
// narrower card's picture would show of it. The wider card's cover fit then
// only trims the band top and bottom, and the panel stays whole in both.
const width = box.width - 4
const height = Math.round(width * FIGURE_H / (Math.min(...CARDS.map((each) => each.width)) - 2 * PAD_X))
const strip = await capture(page, {
  height,
  width,
  x: box.x + scroll.x + 2,
  y: panel.y + panel.height / 2 - height / 2 + scroll.y,
})

const card = (strip64) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; }
      html, body { height: 100%; }
      body { background: #000; display: flex; font-family: 'Manrope', sans-serif; -webkit-font-smoothing: antialiased; }

      /* The rule grid the stage itself bends, so the card reads as one surface
         rather than a screenshot pasted onto a black rectangle. */
      .card {
        background:
          radial-gradient(120% 90% at 82% 8%, rgba(255, 255, 255, 0.07), transparent 60%),
          repeating-linear-gradient(0deg, transparent 0 43px, rgba(255, 255, 255, 0.028) 43px 44px),
          repeating-linear-gradient(90deg, transparent 0 43px, rgba(255, 255, 255, 0.022) 43px 44px),
          #000;
        display: flex; flex-direction: column; justify-content: space-between;
        padding: 52px ${PAD_X}px 46px; width: 100%;
      }

      h1 { color: #fff; font-size: 64px; font-weight: 800; letter-spacing: -0.045em; line-height: 1; }
      h1 span { color: #8e9095; }
      p { color: #a9abb0; font-size: 23px; font-weight: 500; letter-spacing: -0.01em; line-height: 1.4; margin-top: 16px; max-width: 620px; }
      .meta { color: #6c6e73; display: flex; font-family: 'DM Mono', monospace; font-size: 19px; gap: 18px; }
      .meta b { color: #cfd1d5; font-weight: 500; }

      /* A fixed height with a cover fit, so the strip is cropped to the card
         rather than the card being overrun by whatever the stage measured. */
      figure { border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 22px; height: ${FIGURE_H}px; line-height: 0; overflow: hidden; }
      figure img { height: 100%; object-fit: cover; width: 100%; }
    </style>
  </head>
  <body>
    <div class="card">
      <header>
        <h1>Liquid Glass<br /><span>for React</span></h1>
        <p>Real WebGL edge refraction, springs that read pointer velocity, accessible primitives.</p>
      </header>
      <figure><img alt="" src="data:image/png;base64,${strip64}" /></figure>
      <div class="meta">
        <span><b>npm i @liquefy-ui/react</b></span>
        <span>MIT</span>
        <span>liquefy-ui.com</span>
      </div>
    </div>
  </body>
</html>`

const html = card(strip.toString('base64'))

for (const { file, height, width } of CARDS) {
  const canvas = await browser.newPage({ viewport: { height, width } })
  await canvas.setContent(html, { waitUntil: 'load' })
  await canvas.evaluate(() => document.fonts.ready)
  await canvas.waitForTimeout(400)
  const out = new URL(`../brand/${file}`, import.meta.url).pathname
  writeFileSync(out, await capture(canvas))
  await canvas.close()
  console.log(`brand/${file} written — ${width}×${height}`)
}

await browser.close()
