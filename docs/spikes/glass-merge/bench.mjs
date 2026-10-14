// Drives proto.js in Chromium: screenshots of frozen frames, and frame-time
// runs of the moving scene. Serve the repository root first:
//
//   python3 -m http.server 8765 --bind 127.0.0.1
//   CHROME=/path/to/chrome node docs/spikes/glass-merge/bench.mjs shots|trace|encode [filter]
//
// shots:  SHOTS='[{"name","query","clip"}]' — screenshots of frozen frames
// trace:  RUNS='["query", …]' FRAMES=24 — serialised frame times + main thread
// encode: toDataURL / toBlob cost of a displacement map (encode.html)
//
// `playwright` is resolved from PLAYWRIGHT (a path to its package) or from
// the normal module lookup; it is not a dependency of this repository.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const base = process.env.BASE ?? 'http://127.0.0.1:8765/docs/spikes/glass-merge/index.html'
const [task = 'shots', filter = ''] = process.argv.slice(2)

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    // Uncapped frames; with the swap listener below, one frame's whole cost.
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    '--enable-gpu-benchmarking',
  ],
  executablePath: process.env.CHROME,
})

const open = async (query, viewport = { height: 580, width: 880 }) => {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(`${base}?${query}`)
  await page.waitForFunction(() => window.__ready === true)
  return { errors, page }
}

if (task === 'shots') {
  const shots = JSON.parse(process.env.SHOTS ?? '[]')
  mkdirSync(join(here, 'shots'), { recursive: true })
  for (const { clip, name, query } of shots) {
    if (filter && !name.includes(filter)) continue
    const { errors, page } = await open(query)
    await page.waitForTimeout(600)
    await page.screenshot({ clip, path: join(here, 'shots', `${name}.png`) })
    console.log(name, errors.length ? errors : 'ok')
    await page.close()
  }
}

if (task === 'encode') {
  const page = await browser.newPage()
  await page.goto(base.replace('index.html', 'encode.html'))
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 })
  const results = await page.evaluate(() => window.encodeResults)
  console.table(results)
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(results, null, 2))
}

// Main-thread and GPU-process busy time per frame, from a trace taken around
// serialised frames. The renderer main thread is real CPU work on any
// machine; the GPU process here is SwiftShader, so it only ranks the modes.
const busyPerFrame = (events, frames) => {
  const threads = new Map()
  for (const event of events) {
    if (event.ph === 'M' && event.name === 'thread_name') threads.set(`${event.pid}:${event.tid}`, event.args.name)
  }
  const sums = {}
  const add = (key, value) => { sums[key] = (sums[key] ?? 0) + value }
  for (const event of events) {
    if (event.ph !== 'X' || !event.dur) continue
    const thread = threads.get(`${event.pid}:${event.tid}`)
    const ms = event.dur / 1000
    if (event.name === 'ThreadControllerImpl::RunTask') {
      if (thread === 'CrRendererMain') add('main', ms)
      else if (thread === 'CrGpuMain') add('gpuMain', ms)
      else if (thread === 'VizCompositorThread') add('viz', ms)
    }
    if (thread === 'CrRendererMain') {
      if (event.name === 'Paint') add('paint', ms)
      else if (event.name === 'UpdateLayoutTree') add('style', ms)
      else if (event.name === 'PrePaint') add('prePaint', ms)
      else if (event.name === 'Layerize') add('layerize', ms)
      else if (event.name === 'Commit' || event.name === 'ProxyMain::BeginMainFrame::commit') add('commit', ms)
      else if (event.name === 'FireAnimationFrame') add('raf', ms)
    }
    if (event.name === 'ImageDecodeTask' || event.name === 'Decode Image' || event.name === 'ImageFrameGenerator::decode') {
      add('decode', ms)
    }
  }
  return Object.fromEntries(Object.entries(sums).map(([key, value]) => [key, +(value / frames).toFixed(2)]))
}

if (task === 'trace') {
  const runs = JSON.parse(process.env.RUNS ?? '[]')
  const frames = Number(process.env.FRAMES ?? 40)
  const results = []
  for (const query of runs) {
    if (filter && !query.includes(filter)) continue
    const { errors, page } = await open(`${query}&t=0.4`)
    await page.evaluate(() => window.glassMerge.swapFrames(8))
    // Wall time untraced (tracing slows the software GPU), then the same
    // frames again under a light trace for the per-thread split.
    const swap = await page.evaluate((count) => window.glassMerge.swapFrames(count, 0.6), frames)
    await browser.startTracing(page, { categories: ['toplevel', 'devtools.timeline', 'blink'] })
    await page.evaluate((count) => window.glassMerge.swapFrames(count, 0.6), Math.min(frames, 20))
    const trace = JSON.parse((await browser.stopTracing()).toString())
    const result = { query, ...swap, busy: busyPerFrame(trace.traceEvents, Math.min(frames, 20)), errors }
    results.push(result)
    console.log(JSON.stringify(result))
    await page.close()
  }
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(results, null, 2))
}

await browser.close()
