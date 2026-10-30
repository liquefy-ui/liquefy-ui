import { isValidElement, useEffect, useRef, type ReactElement } from 'react'
import { iconOf, useBeforePaint, useMotionGate } from './dom'
import { replaceIcon, type ReplaceFallback, type ReplaceSession, type ReplaceTransition } from './replace'

export type MagicReplaceTransition = ReplaceTransition
export type MagicReplaceFallback = ReplaceFallback

export type MagicReplaceProps = {
  /**
   * The icon to show. A different component, or the same one with a different
   * `key`, starts a replacement; new props on the same icon just render.
   */
  children: ReactElement
  /** What `magic` does when the two icons have nothing in common: shrink and grow, or draw off and on. */
  fallback?: ReplaceFallback
  /**
   * Whether the change may move. Left out, it follows the nearest
   * `LiquefyProvider`'s `motion` and moves when there is none; it never reads
   * `prefers-reduced-motion`. False swaps the icons at once.
   */
  motion?: boolean
  /** How fast the change plays: 2 is twice as fast. */
  speed?: number
  /**
   * `magic` keeps what the two icons share and changes only the rest: shared
   * strokes stay put, strokes written alike morph into each other, and the
   * others draw off and on. `scale` shrinks one away as the other grows in;
   * `draw` draws the old one off, then the new one on.
   */
  transition?: ReplaceTransition
}

type Shown = { key: string | null; svg: SVGSVGElement | null; type: unknown }

/**
 * Swaps one icon for another the way SF Symbols' Magic Replace does, keeping
 * the strokes the two have in common and changing only the rest.
 *
 * ```tsx
 * <MagicReplace>{locked ? <LockIcon /> : <LockOpenIcon />}</MagicReplace>
 * ```
 *
 * A lock opening keeps its body and swings its shackle up; a status mark in a
 * circle keeps the circle and redraws the mark inside; a chevron turning over
 * bends through on a spring. Icons with nothing in common fall back to
 * `fallback`. Like `IconEffect`, the wrapper is a `display: contents` span: the
 * change happens inside the incoming icon's own `<svg>`, so nothing around it
 * moves.
 */
export const MagicReplace = ({
  children,
  fallback = 'scale',
  motion,
  speed = 1,
  transition = 'magic',
}: MagicReplaceProps): ReactElement => {
  const ref = useRef<HTMLSpanElement>(null)
  const gate = useMotionGate(ref, motion)
  const shown = useRef<Shown | null>(null)
  const session = useRef<ReplaceSession | null>(null)
  const type: unknown = isValidElement(children) ? children.type : undefined
  const key = isValidElement(children) ? children.key : null

  // Every commit: the icon that was on screen is kept, off the page, until a
  // new one arrives to change from.
  useBeforePaint(() => {
    const previous = shown.current
    const svg = iconOf(ref.current)
    shown.current = { key, svg, type }
    if (!previous || (previous.type === type && previous.key === key)) return

    // A change still running is finished first, so the next starts from a whole icon.
    session.current?.stop()
    session.current = null
    if (!svg || !previous.svg || previous.svg === svg || !gate.allowed()) return
    const change = replaceIcon(previous.svg, svg, { fallback, speed, transition })
    session.current = change
    void change?.done.then(() => {
      if (session.current === change) session.current = null
    })
  })

  useEffect(() => () => session.current?.stop(), [])

  return <span data-magic-replace="" ref={ref} style={{ display: 'contents' }}>{children}</span>
}
