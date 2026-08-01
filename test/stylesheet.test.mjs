import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Layout rules whose failure is silent. A `min-width` a column cannot satisfy does
 * not clip, it overflows — and the symptom is neighbouring controls sitting on top
 * of each other, which points nowhere near a width declaration. Neither a type
 * error nor a render test can catch it, because nothing here is wrong until
 * something is narrow, so the floors that have to survive a phone column are
 * checked against the stylesheet instead.
 */

const css = readFileSync(new URL('../packages/react/src/styles.css', import.meta.url), 'utf8')

/** The declarations inside one selector's block. */
const blockOf = (selector) => {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No such block in styles.css: ${selector}`)
  const end = css.indexOf('\n  }', start)
  return css.slice(start, end === -1 ? undefined : end)
}

describe('width floors', () => {
  // 200px is the select's comfortable default, not a requirement: three filters
  // side by side in a 430px phone column have ~138px each, and a floor that
  // column cannot satisfy overflows it rather than shrinking.
  it('caps the select trigger at its container', () => {
    expect(blockOf('.lq-select__trigger')).toMatch(/min-width:\s*min\(200px,\s*100%\)/)
  })
})
