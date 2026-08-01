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
