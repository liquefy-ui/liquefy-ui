import { vi } from 'vitest'

/**
 * A stand-in for the Web Animations API, which jsdom does not have. Every call
 * to `element.animate` is recorded with what it was asked to play, and the
 * animation it hands back finishes or cancels when a test says so.
 */
export class FakeAnimation {
  public currentTime = 0
  public readonly effect = { updateTiming: vi.fn() }
  public readonly finished: Promise<FakeAnimation>
  public playState: 'finished' | 'idle' | 'running' = 'running'
  private settle!: { reject: (reason: unknown) => void; resolve: (value: FakeAnimation) => void }

  public constructor(
    public readonly element: Element,
    public readonly keyframes: Keyframe[],
    public readonly options: KeyframeAnimationOptions,
  ) {
    this.finished = new Promise((resolve, reject) => {
      this.settle = { reject, resolve }
    })
    // A browser marks `finished` as handled, so a cancel nobody awaits is not an error.
    this.finished.catch(() => undefined)
  }

  public cancel = vi.fn(() => {
    if (this.playState !== 'running') return
    this.playState = 'idle'
    this.settle.reject(new DOMException('The animation was cancelled', 'AbortError'))
  })

  public finish(): void {
    if (this.playState !== 'running') return
    this.playState = 'finished'
    this.settle.resolve(this)
  }
}

export const installAnimations = () => {
  const played: FakeAnimation[] = []
  const animate = vi.fn(function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    const animation = new FakeAnimation(this, keyframes, options)
    played.push(animation)
    return animation
  })
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate, writable: true })
  return {
    animate,
    played,
    /** The animations still running. */
    running: () => played.filter((animation) => animation.playState === 'running'),
    /** Finishes everything running and lets the promises waiting on it settle. */
    async finishAll() {
      for (const animation of played) animation.finish()
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
    uninstall() {
      delete (Element.prototype as Partial<Element>).animate
    },
  }
}
