// Reads numbers back out of inline styles. The serialisation of a style value
// is not ours to rely on: jsdom 31 started normalising them the way browsers do
// (`0.00px` reads back as `0px`, `translate(x, 0px)` as `translate(x)`, a
// `path('M-1.00 …')` as `path("M -1 …")`), so tests compare numbers instead.

type Point = { x: number, y: number }

/** Every pixel `translate()` in a transform, in order. A missing y is 0. */
export const translatesOf = (transform: string): Point[] =>
  [...transform.matchAll(/translate\(([^)]*)\)/g)]
    .map((match) => (match[1] ?? '').split(',').map((arg) => arg.trim()))
    .filter((args) => args.every((arg) => arg.endsWith('px')))
    .map(([x = '', y = '0px']) => ({ x: Number.parseFloat(x), y: Number.parseFloat(y) }))

/** The first pixel `translate()` in a transform, or NaNs when there is none. */
export const translateOf = (transform: string): Point =>
  translatesOf(transform)[0] ?? { x: Number.NaN, y: Number.NaN }

/** The commands of a `path()` clip, each with its numbers. */
export const pathCommandsOf = (clipPath: string) => {
  const data = /^path\((['"])(.*)\1\)$/.exec(clipPath)?.[2] ?? ''
  return [...data.matchAll(/([A-Za-z])([^A-Za-z]*)/g)].map((match) => ({
    command: match[1] ?? '',
    values: ((match[2] ?? '').match(/-?\d*\.?\d+/g) ?? []).map(Number),
  }))
}
