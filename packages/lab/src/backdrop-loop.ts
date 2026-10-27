import { useEffect, useRef, useState, type RefObject } from 'react'

/** The longest frame a backdrop's clock will count, in seconds. */
const MAX_FRAME = 1 / 30

/**
 * The clock a moving backdrop runs on. It moves forward by the length of each
 * frame it is shown, and no more: a frame longer than `longest` — a stall, a
 * tab that was in the background, a page that was scrolled away — counts as
 * `longest`. So the picture carries on from where it was left rather than
 * leaping ahead by however long nobody was looking, and a capture that hands
 * out frames on a clock of its own sees exactly that many frames of motion.
 */
export class FrameClock {
  /** Seconds counted so far. */
  public time = 0
  private last: number | null = null

  public constructor(private readonly longest = MAX_FRAME) {}

  /**
   * Counts the frame shown at `now`, in milliseconds as `requestAnimationFrame`
   * hands it, and returns its length in seconds. The first frame after a
   * pause has nothing to measure from and counts as nothing.
   */
  public tick(now: number): number {
    const step = this.last === null || !Number.isFinite(now)
      ? 0
      : Math.min(Math.max((now - this.last) / 1000, 0), this.longest)
    this.last = Number.isFinite(now) ? now : this.last
    this.time += step
    return step
  }

  /** Stops measuring, so the gap until the next frame is not counted. */
  public pause(): void {
    this.last = null
  }
}

/**
 * Runs `frame` on every animation frame while `running`, the element is on
 * screen and the page is visible. Off screen, or with the tab in the
 * background, no frames are requested at all — a backdrop is the most
 * expensive thing on its page and nobody is looking at it — and the clock is
 * paused rather than left to count the time away.
 */
export const useBackdropLoop = (
  element: RefObject<HTMLElement | null>,
  running: boolean,
  frame: (step: number, time: number) => void,
): FrameClock => {
  const [clock] = useState(() => new FrameClock())
  const frameRef = useRef(frame)
  frameRef.current = frame

  useEffect(() => {
    if (!running) return undefined
    let onScreen = true
    let shown = typeof document === 'undefined' || document.visibilityState !== 'hidden'
    let handle = 0

    const tick = (now: number) => {
      handle = 0
      const step = clock.tick(now)
      frameRef.current(step, clock.time)
      schedule()
    }
    const schedule = () => {
      if (handle !== 0 || !onScreen || !shown) return
      handle = requestAnimationFrame(tick)
    }
    const pause = () => {
      cancelAnimationFrame(handle)
      handle = 0
      clock.pause()
    }
    const update = () => {
      if (onScreen && shown) schedule()
      else pause()
    }

    const target = element.current
    const observer = target && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
        onScreen = entries.at(-1)?.isIntersecting ?? true
        update()
      })
      : null
    if (target) observer?.observe(target)
    const visibility = () => {
      shown = document.visibilityState !== 'hidden'
      update()
    }
    document.addEventListener('visibilitychange', visibility)
    schedule()

    return () => {
      pause()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [clock, element, running])

  return clock
}
