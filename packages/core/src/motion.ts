import { clamp } from './math'
import { mediaQuery } from './media'
import { LiquidRenderer } from './renderer'
import { SpringValue } from './spring'
import type { LiquidMotionController, LiquidMotionOptions } from './types'

const readRadius = (element: HTMLElement): number => {
  const parsed = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)
  return Number.isFinite(parsed) ? parsed : 16
}

export const attachLiquidMotion = (
  element: HTMLElement,
  canvas: HTMLCanvasElement | null,
  options: LiquidMotionOptions = {},
): LiquidMotionController => {
  let disabled = options.disabled ?? false
  let frame = 0
  let lastTime = performance.now()
  let lastPointerTime = 0
  let lastPointerX = 0
  let lastPointerY = 0
  let releaseTimeout = 0
  // Effects run regardless of OS accessibility settings unless the caller
  // explicitly opts in to respecting prefers-reduced-motion.
  const prefersReducedMotion = mediaQuery('(prefers-reduced-motion: reduce)')
  const reducedMotion = (): boolean => options.respectReducedMotion === true && prefersReducedMotion.matches

  const wobbliness = clamp(options.wobbliness ?? 1, 0, 1.5)
  const bounce = clamp(options.bounce ?? 0.05, 0, 0.16)
  const tilt = clamp(options.tilt ?? 3.5, 0, 12)

  // Deliberately underdamped: the visible jiggle after presses and fast
  // pointer sweeps is the point. Damping rises as wobbliness drops.
  const jellyDamping = 26 - wobbliness * 16.5
  const pointerX = new SpringValue(0.5, { damping: 30, stiffness: 320 })
  const pointerY = new SpringValue(0.5, { damping: 30, stiffness: 320 })
  const scaleX = new SpringValue(1, { damping: jellyDamping, mass: 0.9, stiffness: 330 })
  const scaleY = new SpringValue(1, { damping: jellyDamping, mass: 0.9, stiffness: 330 })
  const skew = new SpringValue(0, { damping: jellyDamping * 1.15, mass: 0.9, stiffness: 260 })
  const tiltX = new SpringValue(0, { damping: 13, stiffness: 190 })
  const tiltY = new SpringValue(0, { damping: 13, stiffness: 190 })
  const lift = new SpringValue(0, { damping: 20, mass: 0.8, stiffness: 230 })
  const presence = new SpringValue(0, { damping: 24, stiffness: 210 })

  const renderer = canvas && options.webgl !== false && !reducedMotion()
    ? new LiquidRenderer(canvas, {
      intensity: options.intensity,
      radius: readRadius(element),
      tint: options.tint,
    })
    : null

  const inject = (spring: SpringValue, amount: number, cap: number): void => {
    spring.velocity = clamp(spring.velocity + amount, -cap, cap)
  }

  const render = (time: number): void => {
    const delta = (time - lastTime) / 1000
    lastTime = time
    let moving = false
    for (const spring of [pointerX, pointerY, scaleX, scaleY, skew, tiltX, tiltY, lift, presence]) {
      if (spring.step(delta)) moving = true
    }

    const normalizedX = pointerX.current * 2 - 1
    const normalizedY = pointerY.current * 2 - 1
    const magnetStrength = presence.current * 1.65
    const wobbleEnergy = clamp(
      (Math.abs(scaleX.velocity) + Math.abs(scaleY.velocity)) * 1.4 + Math.abs(skew.velocity) * 0.04,
      0,
      1,
    ) * clamp(wobbliness, 0, 1)
    const squish = clamp((Math.abs(scaleX.current - 1) + Math.abs(scaleY.current - 1)) * 6, 0, 1)

    element.style.setProperty('--lq-pointer-x', `${(pointerX.current * 100).toFixed(3)}%`)
    element.style.setProperty('--lq-pointer-y', `${(pointerY.current * 100).toFixed(3)}%`)
    element.style.setProperty('--lq-rotate-x', `${tiltX.current.toFixed(3)}deg`)
    element.style.setProperty('--lq-rotate-y', `${tiltY.current.toFixed(3)}deg`)
    element.style.setProperty('--lq-scale-x', scaleX.current.toFixed(4))
    element.style.setProperty('--lq-scale-y', scaleY.current.toFixed(4))
    element.style.setProperty('--lq-skew-x', `${skew.current.toFixed(3)}deg`)
    element.style.setProperty('--lq-lift', `${lift.current.toFixed(3)}px`)
    element.style.setProperty('--lq-magnet-x', `${(normalizedX * magnetStrength).toFixed(3)}px`)
    element.style.setProperty('--lq-magnet-y', `${(normalizedY * magnetStrength).toFixed(3)}px`)
    element.style.setProperty('--lq-shine-opacity', presence.current.toFixed(4))
    element.style.setProperty('--lq-squish', squish.toFixed(4))

    if (renderer) {
      renderer.setPointer(pointerX.current, pointerY.current)
      renderer.setStretch(scaleX.current - 1, scaleY.current - 1)
      renderer.setWobble(wobbleEnergy)
    }

    if (moving) {
      frame = requestAnimationFrame(render)
      return
    }

    frame = 0
  }

  const start = (): void => {
    if (frame || reducedMotion()) return
    lastTime = performance.now()
    frame = requestAnimationFrame(render)
  }

  const updatePointer = (event: PointerEvent): void => {
    if (disabled) return

    const bounds = element.getBoundingClientRect()
    const width = Math.max(bounds.width, 1)
    const height = Math.max(bounds.height, 1)
    const localX = clamp((event.clientX - bounds.left) / width)
    const localY = clamp((event.clientY - bounds.top) / height)
    pointerX.setTarget(localX)
    pointerY.setTarget(localY)
    tiltX.setTarget(-(localY * 2 - 1) * tilt)
    tiltY.setTarget((localX * 2 - 1) * tilt)

    // Fast sweeps shove the surface sideways so it sways like set jelly.
    const now = event.timeStamp
    if (lastPointerTime > 0 && now > lastPointerTime) {
      const deltaSeconds = Math.min((now - lastPointerTime) / 1000, 0.05)
      const velocityX = (event.clientX - lastPointerX) / width / Math.max(deltaSeconds, 0.004)
      const velocityY = (event.clientY - lastPointerY) / height / Math.max(deltaSeconds, 0.004)
      inject(skew, velocityX * 3.4 * wobbliness, 42)
      inject(scaleX, Math.abs(velocityX) * 0.09 * wobbliness, 1.6)
      inject(scaleY, Math.abs(velocityY) * 0.09 * wobbliness, 1.6)
    }
    lastPointerTime = now
    lastPointerX = event.clientX
    lastPointerY = event.clientY

    if (reducedMotion()) {
      pointerX.set(localX)
      pointerY.set(localY)
      element.style.setProperty('--lq-pointer-x', `${(localX * 100).toFixed(2)}%`)
      element.style.setProperty('--lq-pointer-y', `${(localY * 100).toFixed(2)}%`)
    }

    start()
  }

  const enter = (event: PointerEvent): void => {
    if (disabled) return
    element.dataset.liquidActive = 'true'
    presence.setTarget(1)
    scaleX.setTarget(1.01)
    scaleY.setTarget(1.01)
    lift.setTarget(-1.5)
    lastPointerTime = 0
    renderer?.setActive(true)
    renderer?.setRadius(readRadius(element))
    updatePointer(event)
  }

  const leave = (): void => {
    element.dataset.liquidActive = 'false'
    pointerX.setTarget(0.5)
    pointerY.setTarget(0.5)
    scaleX.setTarget(1)
    scaleY.setTarget(1)
    skew.setTarget(0)
    tiltX.setTarget(0)
    tiltY.setTarget(0)
    lift.setTarget(0)
    presence.setTarget(0)
    lastPointerTime = 0
    renderer?.setActive(false)
    renderer?.setPress(false)
    start()
  }

  const down = (event: PointerEvent): void => {
    if (disabled) return
    window.clearTimeout(releaseTimeout)
    scaleX.setTarget(1 + bounce * 0.55)
    scaleY.setTarget(1 - bounce * 1.15)
    skew.setTarget((pointerX.current * 2 - 1) * -2.4)
    lift.setTarget(1)
    renderer?.setPress(true)
    renderer?.ripple(pointerX.current, pointerY.current, 0.7)
    start()
  }

  const up = (): void => {
    // Release: spring targets return to rest while a velocity kick sends the
    // shape through several visible overshoots — the pull-back "purun".
    scaleX.setTarget(1.01)
    scaleY.setTarget(1.01)
    skew.setTarget(0)
    lift.setTarget(-2)
    inject(scaleY, bounce * (9 + wobbliness * 13), 4)
    inject(scaleX, -bounce * (5 + wobbliness * 7), 4)
    renderer?.setPress(false)
    renderer?.ripple(pointerX.current, pointerY.current, 1)
    start()
    releaseTimeout = window.setTimeout(() => {
      lift.setTarget(element.dataset.liquidActive === 'true' ? -1.5 : 0)
      start()
    }, 140)
  }

  element.addEventListener('pointerenter', enter)
  element.addEventListener('pointermove', updatePointer)
  element.addEventListener('pointerleave', leave)
  element.addEventListener('pointerdown', down)
  element.addEventListener('pointerup', up)
  element.addEventListener('pointercancel', leave)

  return {
    destroy: () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(releaseTimeout)
      renderer?.destroy()
      element.removeEventListener('pointerenter', enter)
      element.removeEventListener('pointermove', updatePointer)
      element.removeEventListener('pointerleave', leave)
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', leave)
    },
    pulse: (strength = 1) => {
      const pulseStrength = clamp(strength, 0, 1.5)
      renderer?.ripple(pointerX.current, pointerY.current, pulseStrength)
      inject(scaleY, bounce * pulseStrength * (8 + wobbliness * 10), 4)
      inject(scaleX, -bounce * pulseStrength * 5, 4)
      start()
    },
    setDisabled: (nextDisabled: boolean) => {
      disabled = nextDisabled
      element.dataset.liquidDisabled = String(nextDisabled)
      if (nextDisabled) leave()
    },
  }
}
