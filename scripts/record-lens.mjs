#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Re-records `brand/liquefy-lens.gif`: the playground's glass card held over the
 * water while a pointer stirs it underneath. Not part of any build — a GIF in
 * git only needs rebuilding when the material itself changes.
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
 * Light theme: this is the README's first look at the material, so the capture
 * uses the same bright presentation a visitor gets from a light system theme.
 *
 * The pointer draws one slow figure of eight around the card, so the colour is
 * pulled under the rim from every side; the water keeps turning by itself after.
 */

const URL_ = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const VIEWPORT = { height: 800, width: 1280 }
/** Page load happens inside this, and ffmpeg trims it off. */
const LEAD_MS = 4000
const FPS = 10
const STIR_MS = 5000
const WIDTH = 720

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
  colorScheme: 'light',
  recordVideo: { dir, size: VIEWPORT },
  viewport: VIEWPORT,
})
const page = await context.newPage()
await page.goto(URL_, { waitUntil: 'networkidle' })

const stage = page.locator('.pg-stage')
await stage.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)

const box = await stage.boundingBox()

const lead = LEAD_MS - (Date.now() - started)
if (lead > 0) await page.waitForTimeout(lead)

// A figure of eight around the middle of the stage, at a steady pace: the
// water reads the pointer's speed, so the steps are even rather than eased.
const steps = Math.round(STIR_MS / 40)
for (let index = 0; index <= steps; index++) {
  const t = (index / steps) * Math.PI * 2
  await page.mouse.move(
    box.x + box.width * (0.5 + 0.36 * Math.sin(t)),
    box.y + box.height * (0.5 + 0.28 * Math.sin(t * 2)),
  )
  await page.waitForTimeout(40)
}
await page.waitForTimeout(1400)
await context.close()
await browser.close()

const video = readdirSync(dir).find((file) => file.endsWith('.webm'))
const out = new URL('../brand/liquefy-lens.gif', import.meta.url).pathname
const crop = `crop=${Math.round(box.width)}:${Math.round(box.height)}:${Math.round(box.x)}:${Math.round(box.y)}`

execFileSync(ffmpeg, [
  '-y', '-ss', String(LEAD_MS / 1000), '-i', join(dir, video),
  '-vf', `${crop},fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[a][b]`
    + ';[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
  '-loop', '-1', out,
], { stdio: 'inherit' })

rmSync(dir, { force: true, recursive: true })
console.log('brand/liquefy-lens.gif written — the water stirred under the card')
