import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { themeDefaults } from '../src/docs/pages/theming'

/**
 * The theming page prints each theme's starting values by hand. A default
 * changed in the stylesheet and not there would leave the docs describing a
 * library nobody can install, so the table is read back against the file.
 */
const css = readFileSync(new URL('../../../packages/react/src/styles.css', import.meta.url), 'utf8')

const declarations = (start: number) => {
  const body = css.slice(start, css.indexOf('\n  }', start))
  return new Map([...body.matchAll(/(--lq-[a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}

const dark = declarations(css.indexOf('\n  .lq-provider {'))
const light = declarations(css.indexOf(".lq-provider[data-liquid-theme='light'] {"))
const systemLight = declarations(css.indexOf("    .lq-provider[data-liquid-theme='system'] {"))

describe('the theme defaults table', () => {
  it.each(themeDefaults)('prints what styles.css declares for $name', ({ dark: darkValue, light: lightValue, name }) => {
    expect(dark.get(name)).toBe(darkValue)
    expect(light.get(name)).toBe(lightValue)
    // `theme="system"` on a light machine has to land on the same values.
    expect(systemLight.get(name)).toBe(lightValue)
  })
})
