import { useState, type RefObject } from 'react'
import { cssColor, parseColor, readColors, tintPalette, type BackdropRgb } from './backdrop-color'
import { useBeforePaint } from './use-before-paint'

/**
 * A backdrop's colours as CSS, for what is drawn before any script runs — the
 * server's markup and the stand-in where nothing can be drawn. Given colours
 * are used as they are. Without any, a tint written as hex or `rgb()` is
 * spread into `count` colours here; any other tint can only be resolved in
 * the browser, so it stands alone until then.
 */
export const cssPalette = (colors: readonly string[] | undefined, tint: string, count: number): string[] => {
  if (colors && colors.length > 0) return [...colors]
  const parsed = parseColor(tint)
  return parsed ? tintPalette(parsed, count).map(cssColor) : [tint]
}

/**
 * The colours a backdrop draws with, resolved against `element` so any CSS
 * colour works — `var(--lq-accent)`, `oklch()`, a name. With no `colors`,
 * the `tint` is spread into a palette of `count`. `null` until the element
 * is there to resolve them against.
 */
export const useBackdropPalette = (
  element: RefObject<HTMLElement | null>,
  colors: readonly string[] | undefined,
  tint: string,
  count: number,
): BackdropRgb[] | null => {
  const [palette, setPalette] = useState<BackdropRgb[] | null>(null)
  // Inline arrays are new on every render; their contents are what matter.
  const key = colors && colors.length > 0 ? JSON.stringify(colors) : ''

  useBeforePaint(() => {
    const target = element.current
    if (!target) return
    const list: readonly string[] = key ? JSON.parse(key) : []
    if (list.length > 0) {
      const resolved = readColors(target, list)
      setPalette(resolved.length > 0 ? resolved : tintPalette([0.5, 0.5, 0.5], count))
      return
    }
    const [resolved] = readColors(target, [tint])
    setPalette(tintPalette(resolved ?? [0.5, 0.5, 0.5], count))
  }, [count, element, key, tint])

  return palette
}
