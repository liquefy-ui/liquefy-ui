#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Re-records `brand/liquefy-lens.gif`: the landing page's own lens, dragged across
 * the wordmark. Not part of any build — a GIF in git only needs rebuilding when
 * the material itself changes.
 *
 *   pnpm build && pnpm preview          # in one terminal
 *   node scripts/record-lens.mjs        # in another
 *
 * Neither playwright nor a full ffmpeg belongs in this repository's dependencies —
 * playwright drags browser downloads behind it, for a script that runs when the
 * material changes and not otherwise. Install them somewhere disposable and point
 * this at it:
 *
 *   npm --prefix /tmp/lens-tools i playwright ffmpeg-static
 *   LENS_MODULES=/tmp/lens-tools node scripts/record-lens.mjs
 *
 * The bundled ffmpeg that ships with playwright cannot write a GIF — it has the
 * image2 muxer and nothing else — which is why ffmpeg-static is here too.
 *
 * Two things about the recording are deliberate and easy to undo by accident.
 *
 * Dark theme: the displacement and the dispersion at the rim are both low-contrast
 * effects, and a light backdrop swallows them.
 *
 * Ending where it started: the scenes have to come back to the top, or the GIF
 * jumps on every repeat. The pointer also has to leave the card before the last
 * frames, because the lit rim is hover and hover does not fade while it sits
 * there.
 */

const URL_ = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const VIEWPORT = { height: 800, width: 1280 }
/** Page load and scrolling happen inside this, and ffmpeg trims it off. */
const LEAD_MS = 4000
const FPS = 15
const WIDTH = 800

// `createRequire` rather than `import`: a bare specifier in an ES module resolves
// against this file's own directory and ignores NODE_PATH, so an install that
// lives outside the repository is unreachable any other way.
const load = createRequire(process.env.LENS_MODULES
  ? join(process.env.LENS_MODULES, 'noop.js')
  : import.meta.url)

let chromium
let ffmpeg
try {
  ({ chromium } = load('playwright'))
  ffmpeg = load('ffmpeg-static')
} catch {
  console.error('playwright and ffmpeg-static are not installed. See the comment at the top of this file.')
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'liquefy-lens-'))
const browser = await chromium.launch()
const started = Date.now()
const context = await browser.newContext({
  colorScheme: 'dark',
  recordVideo: { dir, size: VIEWPORT },
  viewport: VIEWPORT,
})
const page = await context.newPage()
await page.goto(URL_, { waitUntil: 'networkidle' })

const stage = page.locator('.pg-stage')
const scroller = '.pg-stage__scroll'
await stage.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)

const box = await stage.boundingBox()
const sceneHeight = await page.evaluate(
  (selector) => document.querySelector(selector).clientHeight,
  scroller,
)

const lead = LEAD_MS - (Date.now() - started)
if (lead > 0) await page.waitForTimeout(lead)

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)

/** Each step costs ~45ms of driver overhead, so the step count sets the pace far
 *  more than `frameMs` does. */
const glide = async (from, to, steps, frameMs) => {
  for (let index = 1; index <= steps; index++) {
    const t = easeInOut(index / steps)
    await page.evaluate(
      ([selector, y]) => { document.querySelector(selector).scrollTop = y },
      [scroller, from + (to - from) * t],
    )
    if (frameMs > 0) await page.waitForTimeout(frameMs)
  }
}

// Out to the photograph, past the grid, and home again. Slow on the way down so
// the frost has time to read, quicker coming back.
const route = [
  [sceneHeight * 1, 22, 8],
  [sceneHeight * 2, 16, 4],
  [sceneHeight * 3, 16, 4],
  [0, 26, 0],
]

let at = 0
for (const [to, steps, frameMs] of route) {
  await glide(at, to, steps, frameMs)
  at = to
}
await page.mouse.move(box.x + 40, box.y + box.height - 30)
await page.waitForTimeout(1300)

const end = await page.evaluate(
  (selector) => document.querySelector(selector).scrollTop,
  scroller,
)
await context.close()
await browser.close()

if (end > 5) {
  console.error(`The scenes ended ${Math.round(end)}px from the top; the loop would jump.`)
  process.exit(1)
}

const video = readdirSync(dir).find((file) => file.endsWith('.webm'))
const out = new URL('../brand/liquefy-lens.gif', import.meta.url).pathname
const crop = `crop=${Math.round(box.width)}:${Math.round(box.height)}:${Math.round(box.x)}:${Math.round(box.y)}`

execFileSync(ffmpeg, [
  '-y', '-ss', String(LEAD_MS / 1000), '-i', join(dir, video),
  '-vf', `${crop},fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[a][b]`
    + ';[a]palettegen=max_colors=80:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
  '-loop', '0', out,
], { stdio: 'inherit' })

rmSync(dir, { force: true, recursive: true })
console.log(`brand/liquefy-lens.gif written — drift ${Math.round(drift)}px`)
