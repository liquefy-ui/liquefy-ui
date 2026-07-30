#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Records a short silent clip for social posts: the landing lens dragged across
 * the wordmark, the showcase buttons pressed until the springs overshoot, a slow
 * scroll down the grid, and the tab indicator measuring the tab it lands on.
 *
 *   pnpm build && pnpm preview          # in one terminal
 *   node scripts/record-clip.mjs        # in another
 *
 * Neither playwright nor a full ffmpeg belongs in this repository's dependencies,
 * for the same reason `record-lens.mjs` gives: they are here when a post needs
 * footage and not otherwise. Install them somewhere disposable and point this at
 * it — the bundled ffmpeg playwright ships cannot encode H.264.
 *
 *   npm --prefix /tmp/lens-tools i playwright ffmpeg-static
 *   LENS_MODULES=/tmp/lens-tools node scripts/record-clip.mjs
 *
 * `pnpm preview` moves to 4174 when 4173 is taken, so it prints the port it got:
 * pass `PREVIEW_URL` when it is not the default. Takes land in `.recordings/`,
 * which is ignored — footage is regenerated, not reviewed, and a megabyte of it
 * per attempt has no business in the history.
 *
 * Two deliberate choices, both shared with `record-lens.mjs`. Dark theme, because
 * the displacement and the dispersion at the rim are low-contrast effects that a
 * light backdrop swallows. And one unbroken drag, because the handle stops
 * tracking after a single step if the button is released and pressed again.
 *
 * Two more that belong to this file. The output is H.264 in yuv420p, because
 * anything else is re-encoded on upload and re-encoding a dark gradient is what
 * turns the glass into blocks. And it carries a silent AAC track, because a video
 * with no audio stream at all is rejected by some upload paths.
 */

const URL_ = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const OUT_DIR = new URL('../.recordings/', import.meta.url).pathname
const VIEWPORT = { height: 720, width: 1280 }
/** Page load happens inside this, and ffmpeg trims it off. */
const LEAD_MS = 3500
const FPS = 30

/** Takes accumulate rather than overwrite: choosing between them is the point. */
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
const out = process.env.CLIP_OUT ?? join(OUT_DIR, `liquefy-clip-${stamp}.mp4`)

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

const dir = mkdtempSync(join(tmpdir(), 'liquefy-clip-'))
const browser = await chromium.launch()
const started = Date.now()
const context = await browser.newContext({
  colorScheme: 'dark',
  recordVideo: { dir, size: VIEWPORT },
  viewport: VIEWPORT,
})
const page = await context.newPage()
await page.goto(URL_, { waitUntil: 'networkidle' })

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)

/** Pointer speed is what the springs read, and each step already costs ~45ms of
 *  driver overhead — so the step count paces this more than `frameMs` does. Few
 *  steps and no delay is a fast sweep, which is what makes a surface sway. */
const sweep = async (from, to, steps, frameMs = 0) => {
  for (let index = 1; index <= steps; index++) {
    const t = easeInOut(index / steps)
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
    if (frameMs > 0) await page.waitForTimeout(frameMs)
  }
}

const centre = async (locator) => {
  const box = await locator.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** A press: down, hold long enough for the squish to land, up, then wait out the
 *  overshoots — that decay is the whole point of the clip. */
const press = async (at, settle = 620) => {
  await page.mouse.move(at.x, at.y)
  await page.waitForTimeout(180)
  await page.mouse.down()
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(settle)
}

/** Scrolls on a rAF tween — `mouse.wheel` arrives in visible jumps. The tiles
 *  animate as they enter, so a target measured up front drifts by the time the
 *  scroll reaches it; this measures the element as the tween starts instead. */
const glideToTile = async (locator, gap, duration) => {
  const node = await locator.elementHandle()
  await page.evaluate(async ([element, offset, ms]) => {
    const from = window.scrollY
    const to = Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset)
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
    await new Promise((resolve) => {
      const start = performance.now()
      const step = (now) => {
        const t = Math.min(1, (now - start) / ms)
        window.scrollTo(0, from + (to - from) * ease(t))
        if (t < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }, [node, gap, duration])
}

// ── The lens ────────────────────────────────────────────────────────────────────
const stage = page.locator('.pg-stage')
const handle = page.locator('.pg-lens-handle')
await stage.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)

const stageBox = await stage.boundingBox()
const home = await centre(handle)

const lead = LEAD_MS - (Date.now() - started)
if (lead > 0) await page.waitForTimeout(lead)

await page.mouse.move(home.x, home.y)
await page.mouse.down()
let at = home
for (const [to, steps, frameMs] of [
  [{ x: home.x - 300, y: home.y + 18 }, 20, 10], // slow pass: letters bend under the bezel
  [{ x: home.x + 230, y: home.y - 28 }, 12, 0], // fast sweep back: the one that wobbles
  [{ x: home.x + 30, y: home.y + 36 }, 7, 0], // flick down
  [home, 11, 6],
]) {
  await sweep(at, to, steps, frameMs)
  at = to
}
await page.mouse.up()
await page.mouse.move(stageBox.x + 40, stageBox.y + stageBox.height - 24)
await page.waitForTimeout(900)

// ── The buttons, pressed ────────────────────────────────────────────────────────
const tiles = page.locator('.showcase-tile')
await glideToTile(tiles.first(), 96, 1400)
await page.waitForTimeout(550)

const create = page.getByRole('button', { name: /create/i }).first()
const settings = page.getByRole('button', { name: /settings/i }).first()

const createAt = await centre(create)
await press(createAt, 660)

const settingsAt = await centre(settings)
await sweep(createAt, settingsAt, 5) // fast: the row sways as the pointer crosses it
await press(settingsAt, 520)

// Off the row before scrolling: the lit rim is a hover state and does not fade
// while the pointer sits on it.
const parked = { x: settingsAt.x + 210, y: settingsAt.y + 120 }
await sweep(settingsAt, parked, 7)
await page.waitForTimeout(320)

// ── The grid, scrolling ─────────────────────────────────────────────────────────
const tabsTile = tiles.filter({ hasText: 'Tabs' }).first()
await glideToTile(tabsTile, 120, 3400) // slow: four tiles pass on the way down
await page.waitForTimeout(500)

// ── The tab indicator, which measures the tab it lands on ───────────────────────
const tabs = tabsTile.getByRole('tab')
const tabCount = await tabs.count()
let pointer = parked
for (const index of [1, 2].filter((n) => n < tabCount)) {
  const to = await centre(tabs.nth(index))
  await sweep(pointer, to, 6)
  await press(to, 620)
  pointer = to
}

await sweep(pointer, { x: pointer.x - 300, y: pointer.y + 190 }, 8)
await page.waitForTimeout(850)

await context.close()
await browser.close()

const video = readdirSync(dir).find((file) => file.endsWith('.webm'))
mkdirSync(OUT_DIR, { recursive: true })

execFileSync(ffmpeg, [
  '-y', '-ss', String(LEAD_MS / 1000), '-i', join(dir, video),
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
  '-filter:v', `fps=${FPS},scale=${VIEWPORT.width}:${VIEWPORT.height}:flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-crf', '19', '-preset', 'slow',
  '-c:a', 'aac', '-b:a', '64k', '-shortest',
  '-movflags', '+faststart', out,
], { stdio: 'inherit' })

rmSync(dir, { force: true, recursive: true })
console.log(`\n${out} written`)
