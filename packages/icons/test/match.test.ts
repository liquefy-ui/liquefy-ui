import { describe, expect, it } from 'vitest'
import { isRelated, matchStrokes, type StrokeShape } from '../src/effects/match'
import { parsePath, shapeCommands, splitSubpaths } from '../src/effects/path'

/** An icon as strokes, from `[tag, attributes]` pairs the way the icons are written. */
const icon = (...elements: [string, Record<string, string>][]): StrokeShape[] =>
  elements.flatMap(([tag, attributes]) =>
    splitSubpaths(shapeCommands(tag, attributes)).map((subpath) => ({ context: attributes.transform ?? '', subpath })))

const circle = ['circle', { cx: '12', cy: '12', r: '8.5' }] as [string, Record<string, string>]
const path = (d: string): [string, Record<string, string>] => ['path', { d }]

const plus = icon(path('M12 5.5v13M5.5 12h13'))
const minus = icon(path('M5.5 12h13'))
const close = icon(path('m6.5 6.5 11 11M17.5 6.5l-11 11'))
const alert = icon(circle, path('M12 8v4.5M12 15.8v.1'))
const info = icon(circle, path('M12 11.5V16M12 8.2v.1'))
const check = icon(circle, path('m8.5 12.2 2.5 2.4 4.6-5'))
const play = icon(path('m9 7 8 5-8 5V7Z'))
const pause = icon(path('M9 7v10M15 7v10'))
const lock = icon(['rect', { height: '9.5', rx: '2.5', width: '14', x: '5', y: '10.5' }], path('M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5'))
const open = icon(['rect', { height: '9.5', rx: '2.5', width: '14', x: '5', y: '10.5' }], path('M8.2 10.5V6.5a3.8 3.8 0 0 1 7.6 0v1'))

describe('lining up two icons', () => {
  it('keeps a stroke both icons have, however each one wrote it', () => {
    // Plus writes its bar inside one path with the upright; minus on its own.
    expect(matchStrokes(plus, minus)).toEqual({ added: [], morphs: [], removed: [0], shared: [[1, 0]] })
    expect(matchStrokes(minus, plus)).toEqual({ added: [0], morphs: [], removed: [], shared: [[0, 1]] })
  })

  it('keeps the body of a lock and morphs its shackle', () => {
    expect(matchStrokes(lock, open)).toEqual({ added: [], morphs: [[1, 1]], removed: [], shared: [[0, 0]] })
  })

  it('pairs each stroke with the partner nearest overall, not the first that fits', () => {
    // The alert's line becomes the info's dot above it, and its dot the line below.
    expect(matchStrokes(alert, info)).toEqual({ added: [], morphs: [[1, 2], [2, 1]], removed: [], shared: [[0, 0]] })
  })

  it('draws off and on what has no partner', () => {
    expect(matchStrokes(check, alert)).toEqual({ added: [1, 2], morphs: [], removed: [1], shared: [[0, 0]] })
  })

  it('only keeps a stroke drawn under the same transforms', () => {
    const turned = icon(['path', { d: 'M5.5 12h13', transform: 'rotate(90 12 12)' }])
    expect(matchStrokes(minus, turned).shared).toEqual([])
  })

  it('keeps one copy of a stroke for each one there is', () => {
    const twice = icon(path('M5.5 12h13'), path('M5.5 12h13'))
    expect(matchStrokes(minus, twice)).toEqual({ added: [1], morphs: [], removed: [], shared: [[0, 0]] })
  })
})

describe('whether two icons are related', () => {
  it('is when they share a stroke', () => {
    expect(isRelated(matchStrokes(plus, minus))).toBe(true)
    expect(isRelated(matchStrokes(check, alert))).toBe(true)
  })

  it('is when every stroke of one turns into a stroke of the other', () => {
    expect(isRelated(matchStrokes(plus, close))).toBe(true)
    expect(isRelated(matchStrokes(icon(path('m6.5 9.5 5.5 5 5.5-5')), icon(path('m6.5 14.5 5.5-5 5.5 5'))))).toBe(true)
  })

  it('is not when they have nothing in common', () => {
    expect(isRelated(matchStrokes(play, pause))).toBe(false)
    // One line could bend into the other's line, but the other's tick has no partner.
    expect(isRelated(matchStrokes(icon(path('M0 0h4')), icon(path('M9 9 1 1'), path('M3 3 5 5 7 3'))))).toBe(false)
  })
})

describe('the parsed strokes', () => {
  it('come from parsePath and shapes alike', () => {
    expect(icon(path('M1 1h2'))[0]!.subpath).toEqual(parsePath('M1 1h2'))
  })
})
