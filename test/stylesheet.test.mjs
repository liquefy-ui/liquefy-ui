import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Layout rules whose failure is silent. A `min-width` a column cannot satisfy does
 * not clip, it overflows — and the symptom is neighbouring controls sitting on top
 * of each other, which points nowhere near a width declaration. A popover that
 * loses the stacking order is worse: it renders, it is interactive, it is simply
 * painted behind the panel it belongs to. Neither a type error nor a render test
 * can catch either one, because nothing is wrong until something is narrow or
 * something is nested, so both are checked against the stylesheet instead.
 */

const css = readFileSync(new URL('../packages/react/src/styles.css', import.meta.url), 'utf8')

/** The declarations inside one selector's block. */
const blockOf = (selector) => {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No such block in styles.css: ${selector}`)
  const end = css.indexOf('\n  }', start)
  return css.slice(start, end === -1 ? undefined : end)
}

/** The `z-index` one selector declares. */
const zIndexOf = (selector) => {
  const found = /z-index:\s*(\d+)/.exec(blockOf(selector))
  if (!found) throw new Error(`No z-index in ${selector}`)
  return Number(found[1])
}

describe('width floors', () => {
  // 200px is the select's comfortable default, not a requirement: three filters
  // side by side in a 430px phone column have ~138px each, and a floor that
  // column cannot satisfy overflows it rather than shrinking.
  it('caps the select trigger at its container', () => {
    expect(blockOf('.lq-select__trigger')).toMatch(/min-width:\s*min\(200px,\s*100%\)/)
  })
})

/**
 * Every overlay portals into the provider's node as a sibling of the others, so
 * nesting in the JSX orders nothing and this ladder is the whole contract. It is
 * easy to break one rung at a time, and a select popup under a drawer looks like a
 * pulldown that does nothing when tapped rather than like a z-index.
 */
describe('the overlay ladder', () => {
  const ladder = [
    ['the floating dock', ".lq-dock-shell[data-position='floating']"],
    ['a dialog backdrop', '.lq-dialog__backdrop'],
    ['a dialog panel', '.lq-dialog'],
    ['a popover', '.lq-popover'],
    ['a tooltip', '.lq-tooltip__positioner'],
    ['the toast viewport', '.lq-toast-viewport'],
  ]

  it('keeps every layer above the one it has to cover', () => {
    const rungs = ladder.map(([name, selector]) => [name, zIndexOf(selector)])
    for (const [index, [name, z]] of rungs.entries()) {
      if (index === 0) continue
      const [under, below] = rungs[index - 1]
      expect(z, `${name} has to paint over ${under}`).toBeGreaterThan(below)
    }
  })

  // A drawer is a dialog wearing a different animation, and a popover opened from
  // inside one has to clear both by the same margin.
  it('puts the drawer on the same rungs as the dialog', () => {
    expect(zIndexOf('.lq-drawer')).toBe(zIndexOf('.lq-dialog'))
    expect(zIndexOf('.lq-drawer__backdrop')).toBe(zIndexOf('.lq-dialog__backdrop'))
  })

  // The positioner is what carries the layer; the popup inside it only inherits
  // the stacking context, so a positioner left behind sinks its own popup.
  it('keeps the select and menu positioners on the popover rung', () => {
    for (const selector of ['.lq-select__positioner', '.lq-menu__positioner']) {
      expect(zIndexOf(selector), selector).toBe(zIndexOf('.lq-popover'))
    }
  })
})

/**
 * The other half of `packages/react/test/style-hooks.test.tsx`. That file proves
 * Base UI still emits each attribute; this one proves the stylesheet still
 * selects on it. Either half passing alone is a component that renders correctly
 * and looks wrong, which is exactly the failure neither a type error nor a render
 * test catches.
 */
describe('the state selectors Base UI drives', () => {
  const rules = [
    ['a checked switch', ".lq-switch[data-checked] {"],
    ['a switch flicked back off', '.lq-switch[data-interacted][data-unchecked] .lq-switch__thumb {'],
    ['an indeterminate checkbox', '.lq-checkbox__box[data-indeterminate] {'],
    ['a selected radio', '.lq-radio__control[data-checked] {'],
    ['a pressed segment', '.lq-segmented__item[data-pressed] {'],
    ['an indeterminate progress bar', '.lq-progress__fill[data-indeterminate] {'],
    ['a divider with no label', ".lq-divider[data-orientation='horizontal']:not([data-with-label])::after {"],
    ['a disabled button', '.lq-button[data-disabled],'],
    ['a disabled slider', '.lq-slider__control[data-disabled] {'],
    ['a toast of a given severity', ".lq-toast[data-type='success'] {"],
    ['a toast on its way out', '.lq-toast[data-ending-style] {'],
  ]

  for (const [state, selector] of rules) {
    it(`still paints ${state}`, () => {
      expect(css, selector).toContain(selector)
    })
  }

  // `[data-checked='true']` is how this library used to spell state, and how Base
  // UI never spells it: the attribute is present or it is absent, so a rule left
  // in the old form matches nothing at all. Only the names Base UI owns are
  // checked; `data-loading`, `data-selected` and the spinner's own
  // `data-indeterminate` are this library's, and are booleans on purpose.
  it('spells Base UI state the way Base UI writes it', () => {
    const owned = /\[data-(checked|unchecked|pressed|disabled|indeterminate)='/
    const offenders = css
      .split('\n')
      .filter((line) => owned.test(line) && !line.includes('.lq-spinner'))

    expect(offenders).toEqual([])
  })
})

/**
 * A text entry cannot sit inside a compositing layer on a touchscreen. WebKit
 * places the text-selection callout — the bubble a long press raises, the one
 * holding Paste — against the wrong coordinate space when it does, so the menu
 * never appears and the field cannot be pasted into; a password typed from a
 * manager is the usual casualty. Nothing about that is visible to a render test
 * or a type, because the stylesheet is correct and the field looks right. It is
 * checked here instead, against the two rules that unwrap it.
 */
describe('text entries on a touchscreen', () => {
  /** The declarations one selector carries under `any-pointer: coarse`. */
  const coarseBlockOf = (selector) => {
    const pattern = new RegExp(
      `@media \\(any-pointer: coarse\\) \\{\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`,
    )
    const found = pattern.exec(css)
    if (!found) throw new Error(`No coarse-pointer block for ${selector}`)
    return found[1]
  }

  it('drops the geometry off the field and the surface holding it', () => {
    for (const selector of ['.lq-text-field__control', '.lq-surface:has(.lq-text-field__control)']) {
      const block = coarseBlockOf(selector)
      expect(block, `${selector} keeps a transform`).toMatch(/transform:\s*none/)
      expect(block, `${selector} keeps a 3D context`).toMatch(/transform-style:\s*flat/)
      expect(block, `${selector} keeps a compositing hint`).toMatch(/will-change:\s*auto/)
    }
  })

  // One selector a browser cannot parse voids the whole list it sits in, so the
  // two cannot share a rule: joined, a Safari too old for `:has()` would drop the
  // plain field along with it and be left with the bug this fixes.
  it('keeps the `:has()` selector out of the plain field rule', () => {
    expect(coarseBlockOf('.lq-text-field__control')).not.toContain(':has(')
  })
})
