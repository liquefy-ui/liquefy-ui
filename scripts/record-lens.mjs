#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
 * image2 muxer and nothing else — which is why ffmpeg-static is here too. Set
 * LENS_CHROME to a Chromium binary when playwright's own download is missing.
 *
 * Frame by frame, not filmed. The page's clock — `requestAnimationFrame`,
 * `performance.now` and the pointer's `timeStamp` — is replaced before any of
 * its scripts run, then moved on by exactly one GIF frame at a time with a
 * screenshot after each. A frame may take seconds to draw, and the GIF still
 * plays at the speed the page would run at. Recording in real time instead
 * gives a stutter on any machine slower than the water, which on a machine
 * without a GPU is every one. The browser always renders through SwiftShader,
 * so the capture comes out the same everywhere and nothing needs a GPU.
 *
 * Three things about the recording are deliberate and easy to undo by accident.
 *
 * Light theme: this is the README's first look at the material, so the capture
 * uses the same bright presentation a visitor gets from a light system theme.
 *
 * The pointer draws one slow figure of eight around the card, so the colour is
 * pulled under the rim from every side; the water keeps turning by itself after.
 *
 * One way only: the GIF plays once and rests on its last frame. The water never
 * comes back to where it started, so a loop would jump at the seam.
 */

const URL_ = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/'
const VIEWPORT = { height: 800, width: 1280 }
/**
 * GIF delays count hundredths of a second, so a frame has to be a whole number
 * of them. The water changes every pixel of every frame, which leaves a GIF's
 * transparency and palette little to save: this rate and 48 colours keep it
 * near 4 MB.
 */
const FPS = 10
/**
 * The page's own frame. The backdrop's clock counts at most 1/30 s a frame, so
 * page frames as long as the GIF's would slow the water down.
 */
const STEP_MS = 20
const STIR_MS = 5000
const REST_MS = 1400
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

/**
 * Runs in the page before its own scripts. The clock runs in real time while the
 * page loads and the water warms up, and stands still from `freeze()` on, moving
 * only when `step()` moves it.
 */
const installClock = () => {
  const realNow = performance.now.bind(performance)
  const realFrame = window.requestAnimationFrame.bind(window)
  const waiting = new Map()
  let frozen = null
  let nextId = 1

  performance.now = () => frozen ?? realNow()
  window.requestAnimationFrame = (callback) => {
    const id = nextId++
    waiting.set(id, callback)
    // Before the freeze, a real frame runs it; after, only `step()` does.
    if (frozen === null) realFrame((time) => { if (frozen === null && waiting.delete(id)) callback(time) })
    return id
  }
  window.cancelAnimationFrame = (id) => { waiting.delete(id) }

  let hovered = null
  const ancestry = (element) => {
    const chain = []
    for (let node = element; node; node = node.parentElement) chain.push(node)
    return chain
  }
  const fire = (target, type, x, y) => {
    const event = new PointerEvent(type, {
      bubbles: type !== 'pointerenter' && type !== 'pointerleave',
      cancelable: true,
      clientX: x,
      clientY: y,
      composed: true,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
      view: window,
    })
    // The springs read the pointer's speed from this, so it has to be virtual too.
    Object.defineProperty(event, 'timeStamp', { value: frozen ?? realNow() })
    target.dispatchEvent(event)
  }

  window.__lens = {
    freeze: () => { frozen = realNow() },
    /** Moves the pointer to `x`, `y`, crossing in and out of elements the way a mouse does. */
    point: (x, y) => {
      const target = document.elementFromPoint(x, y) ?? document.documentElement
      if (target !== hovered) {
        const left = hovered ? ancestry(hovered) : []
        const entered = ancestry(target)
        if (hovered) fire(hovered, 'pointerout', x, y)
        for (const element of left) if (!entered.includes(element)) fire(element, 'pointerleave', x, y)
        fire(target, 'pointerover', x, y)
        for (const element of entered.reverse()) if (!left.includes(element)) fire(element, 'pointerenter', x, y)
        hovered = target
      }
      fire(target, 'pointermove', x, y)
    },
    /** One frame, `ms` long. Resolves once a real frame has painted what it drew. */
    step: (ms) => {
      frozen += ms
      const due = [...waiting.values()]
      waiting.clear()
      for (const callback of due) callback(frozen)
      return new Promise((resolve) => realFrame(() => resolve()))
    },
  }
}

const dir = mkdtempSync(join(tmpdir(), 'liquefy-lens-'))
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  executablePath: process.env.LENS_CHROME || undefined,
})
process.once('SIGINT', () => browser.close().finally(() => process.exit(130)))
const context = await browser.newContext({ colorScheme: 'light', viewport: VIEWPORT })
await context.addInitScript(installClock)
const page = await context.newPage()
await page.goto(URL_, { waitUntil: 'networkidle' })

const stage = page.locator('.pg-stage')
await stage.scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
const box = await stage.boundingBox()
const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
await page.evaluate(() => window.__lens.freeze())

// Playwright's own screenshot waits for the page to hold still, which the
// springs and the water never do; the protocol call takes the frame as it is.
const cdp = await context.newCDPSession(page)
const clip = {
  height: Math.round(box.height),
  scale: 1,
  width: Math.round(box.width),
  x: Math.round(box.x + scroll.x),
  y: Math.round(box.y + scroll.y),
}

const stepsPerFrame = 1000 / FPS / STEP_MS
const stirSteps = Math.round(STIR_MS / STEP_MS)
const total = Math.round((STIR_MS + REST_MS) * FPS / 1000)
const started = Date.now()
for (let index = 0, step = 0; index <= total; index++) {
  for (let count = 0; count < stepsPerFrame; count++, step++) {
    // A figure of eight around the middle of the stage, at a steady pace: the
    // water reads how far the pointer moved each frame, so the steps are even
    // rather than eased.
    if (step <= stirSteps) {
      const t = (step / stirSteps) * Math.PI * 2
      await page.evaluate(([x, y]) => window.__lens.point(x, y), [
        box.x + box.width * (0.5 + 0.36 * Math.sin(t)),
        box.y + box.height * (0.5 + 0.28 * Math.sin(t * 2)),
      ])
    }
    // One evaluate per frame: React renders between them, never inside one.
    await page.evaluate((ms) => window.__lens.step(ms), STEP_MS)
  }
  const { data } = await cdp.send('Page.captureScreenshot', { clip, format: 'png' })
  writeFileSync(join(dir, `frame-${String(index).padStart(4, '0')}.png`), Buffer.from(data, 'base64'))
  if (index % 25 === 0) console.log(`frame ${index}/${total} · ${Math.round((Date.now() - started) / 1000)}s`)
}
await browser.close()

const out = new URL('../brand/liquefy-lens.gif', import.meta.url).pathname
execFileSync(ffmpeg, [
  '-y', '-framerate', String(FPS), '-i', join(dir, 'frame-%04d.png'),
  '-vf', `scale=${WIDTH}:-1:flags=area,split[a][b]`
    + ';[a]palettegen=max_colors=48[p];[b][p]paletteuse=dither=bayer:bayer_scale=5',
  '-loop', '-1', out,
], { stdio: 'inherit' })

rmSync(dir, { force: true, recursive: true })
console.log('brand/liquefy-lens.gif written — the water stirred under the card')
