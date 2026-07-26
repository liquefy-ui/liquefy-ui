import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A media query adds no specificity. So a responsive override written as
 * `.thing { … }` silently loses to a `.thing[data-x='y'] { … }` further up the
 * file, and the layout it was meant to fix stays broken — at one breakpoint,
 * on one page, which is where nobody looks.
 *
 * That is not hypothetical here. `.docs-body[data-toc='false']` beat both
 * responsive overrides of `grid-template-columns`, so every page without a
 * table of contents kept a 232px sidebar track below 900px, dropped `main` into
 * it, and left the rest of the viewport empty.
 */
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

type Rule = { selector: string; properties: string[]; media: string | null; line: number; weight: number }

const specificity = (selector: string) => {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:[a-z-]+\(?/g) ?? []).length
  const types = (selector.match(/(^|[\s>+~])[a-z][\w-]*/g) ?? []).length
  return ids * 10000 + classes * 100 + types
}

const parse = () => {
  const lines = css.split('\n')
  const rules: Rule[] = []
  let media: string | null = null
  let depth = 0

  for (const [index, line] of lines.entries()) {
    const opened = line.match(/@media ([^{]+)\{/)
    if (opened) {
      media = opened[1].trim()
      depth = 1
      continue
    }

    const rule = line.match(/^\s*([^@{}]+?)\s*\{\s*$/)
    if (rule) {
      const properties: string[] = []
      for (let scan = index + 1; scan < lines.length && !lines[scan].includes('}'); scan += 1) {
        const property = lines[scan].match(/^\s*([a-z-]+):/)
        if (property) properties.push(property[1])
      }
      rules.push({ selector: rule[1].trim(), properties, media, line: index + 1, weight: specificity(rule[1].trim()) })
    }

    if (media) {
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
      if (depth <= 0) media = null
    }
  }

  return rules
}

describe('responsive overrides can actually win', () => {
  const rules = parse()

  it('parses the stylesheet it is meant to police', () => {
    expect(rules.length).toBeGreaterThan(200)
    expect(rules.some((rule) => rule.media?.includes('max-width: 900px'))).toBe(true)
  })

  it('has no override outranked by an earlier, more specific rule', () => {
    const losses: string[] = []

    for (const rule of rules.filter((entry) => entry.media)) {
      const base = rule.selector.split(',')[0].trim()

      for (const earlier of rules.filter((entry) => !entry.media && entry.line < rule.line)) {
        if (!earlier.selector.startsWith(base) || earlier.selector === base) continue
        // The same element qualified further, not a descendant of it: a space or
        // a combinator after the base name means some other element entirely.
        if (!/^[.[:#]/.test(earlier.selector.slice(base.length))) continue
        if (earlier.weight <= rule.weight) continue

        const clash = rule.properties.filter((property) => earlier.properties.includes(property))
        if (clash.length > 0) {
          losses.push(
            `${rule.selector} @media ${rule.media} (line ${rule.line}) cannot set ${clash.join(', ')}: ` +
              `${earlier.selector} (line ${earlier.line}) is more specific. Qualify the override the same way.`,
          )
        }
      }
    }

    expect(losses).toEqual([])
  })

  it('keeps the docs grid collapsing to one column with or without a table of contents', () => {
    const narrow = rules.find(
      (rule) => rule.media === '(max-width: 900px)' && rule.selector.startsWith('.docs-body'),
    )
    expect(narrow, 'the 900px override exists').toBeDefined()
    expect(narrow!.selector, 'and carries the attribute that lets it win').toContain('[data-toc]')
    expect(narrow!.properties).toContain('grid-template-columns')
  })
})
