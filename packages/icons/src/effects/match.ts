import { pathDistance, pathSignature, serializePath, type Subpath } from './path'

/**
 * One stroke of an icon, for matching against another icon's: the subpath, and
 * the transforms it is drawn under, which have to agree for two strokes to be
 * the same stroke.
 */
export type StrokeShape = { context: string; subpath: Subpath }

/**
 * How the strokes of the icon going out line up with the icon coming in, by
 * index into each list. `shared` are drawn exactly alike and stay put;
 * `morphs` are written with the same commands and can turn into each other;
 * `removed` and `added` have no partner and are drawn off and on.
 */
export type StrokeMatch = {
  added: number[]
  morphs: [from: number, to: number][]
  removed: number[]
  shared: [from: number, to: number][]
}

/** Above this many strokes in a group, partners are picked greedily rather than by trying every pairing. */
const EXHAUSTIVE = 6

/**
 * The pairing of `from` with `to` (indices into each) that moves the numbers
 * least in total. Every stroke on the shorter side gets a partner.
 */
const pairUp = (
  from: readonly number[],
  to: readonly number[],
  cost: (a: number, b: number) => number,
): [number, number][] => {
  const flip = from.length > to.length
  const small = flip ? to : from
  const large = flip ? from : to
  const costOf = (a: number, b: number) => (flip ? cost(b, a) : cost(a, b))
  const pair = (a: number, b: number): [number, number] => (flip ? [b, a] : [a, b])

  if (large.length > EXHAUSTIVE) {
    const left = new Set(large)
    return small.map((a) => {
      let best = -1
      let lowest = Number.POSITIVE_INFINITY
      for (const b of left) {
        const value = costOf(a, b)
        if (value < lowest) {
          lowest = value
          best = b
        }
      }
      left.delete(best)
      return pair(a, best)
    })
  }

  let bestTotal = Number.POSITIVE_INFINITY
  let bestPairs: [number, number][] = []
  const used = new Set<number>()
  const chosen: [number, number][] = []
  const search = (index: number, total: number): void => {
    if (total >= bestTotal) return
    if (index === small.length) {
      bestTotal = total
      bestPairs = chosen.map(([a, b]) => pair(a, b))
      return
    }
    const a = small[index]!
    for (const b of large) {
      if (used.has(b)) continue
      used.add(b)
      chosen.push([a, b])
      search(index + 1, total + costOf(a, b))
      chosen.pop()
      used.delete(b)
    }
  }
  search(0, 0)
  return bestPairs
}

/**
 * Lines up two icons' strokes. A stroke in both, drawn alike under the same
 * transforms, is shared. Of the rest, strokes with the same commands pair up
 * into morphs, each with the partner it is nearest to overall — so a line
 * becomes the nearer of two lines rather than the first. Whatever is left was
 * only in one of the two.
 */
export const matchStrokes = (previous: readonly StrokeShape[], next: readonly StrokeShape[]): StrokeMatch => {
  const keyOf = ({ context, subpath }: StrokeShape) => `${context}|${serializePath(subpath)}`
  const shared: [number, number][] = []
  const taken = new Set<number>()
  const nextKeys = next.map(keyOf)

  previous.forEach((stroke, from) => {
    const key = keyOf(stroke)
    const to = nextKeys.findIndex((candidate, index) => candidate === key && !taken.has(index))
    if (to === -1) return
    taken.add(to)
    shared.push([from, to])
  })

  const sharedFrom = new Set(shared.map(([from]) => from))
  const groups = new Map<string, { from: number[]; to: number[] }>()
  const group = (stroke: StrokeShape) => {
    const key = `${stroke.context}|${pathSignature(stroke.subpath)}`
    let entry = groups.get(key)
    if (!entry) {
      entry = { from: [], to: [] }
      groups.set(key, entry)
    }
    return entry
  }
  previous.forEach((stroke, index) => {
    if (!sharedFrom.has(index)) group(stroke).from.push(index)
  })
  next.forEach((stroke, index) => {
    if (!taken.has(index)) group(stroke).to.push(index)
  })

  const morphs: [number, number][] = []
  for (const { from, to } of groups.values()) {
    if (from.length === 0 || to.length === 0) continue
    morphs.push(...pairUp(from, to, (a, b) => pathDistance(previous[a]!.subpath, next[b]!.subpath)))
  }
  morphs.sort(([a], [b]) => a - b)

  const morphedFrom = new Set(morphs.map(([from]) => from))
  const morphedTo = new Set(morphs.map(([, to]) => to))
  return {
    added: next.map((_, index) => index).filter((index) => !taken.has(index) && !morphedTo.has(index)),
    morphs,
    removed: previous.map((_, index) => index).filter((index) => !sharedFrom.has(index) && !morphedFrom.has(index)),
    shared,
  }
}

/**
 * Whether the two icons are related enough for a magic replace: they share a
 * stroke, or every stroke of one turns into a stroke of the other. Two icons
 * with nothing in common, where only some strokes happen to be written alike,
 * would melt into a muddle, so those get the fallback instead.
 */
export const isRelated = ({ added, morphs, removed, shared }: StrokeMatch): boolean =>
  shared.length > 0 || (morphs.length > 0 && added.length === 0 && removed.length === 0)
