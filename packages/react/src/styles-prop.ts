import { useInsertionEffect, useMemo, type CSSProperties } from 'react'
import { useLiquefyConfig, type LiquefyBreakpoint, type LiquefyBreakpoints } from './provider'

// Declared locally so the package keeps working without @types/node, in both the
// browser (where `process` is absent) and any bundler that inlines NODE_ENV.
declare const process: { env?: Record<string, string | undefined> } | undefined

const isDevelopment = typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'

/* -------------------------------------------------------------------------- *
 * Public types
 * -------------------------------------------------------------------------- */

type Scalar = number | string

/** A single value, or one value per breakpoint. `base` applies below the first breakpoint. */
export type LiquidResponsive<T> = T | ({ base?: T } & Partial<Record<LiquefyBreakpoint, T>>)

type StandardStyles = {
  [K in keyof CSSProperties]?: LiquidResponsive<CSSProperties[K]>
}

type CustomPropertyStyles = {
  [K in `--${string}`]?: LiquidResponsive<Scalar>
}

/**
 * Shorthands. Spacing keys (`p*`, `m*`) read plain numbers as multiples of the
 * `--lq-space` scale; every other key reads numbers as pixels, matching `style`.
 */
type ShorthandStyles = {
  bg?: LiquidResponsive<CSSProperties['backgroundColor']>
  h?: LiquidResponsive<CSSProperties['height']>
  m?: LiquidResponsive<Scalar>
  maxH?: LiquidResponsive<CSSProperties['maxHeight']>
  maxW?: LiquidResponsive<CSSProperties['maxWidth']>
  mb?: LiquidResponsive<Scalar>
  minH?: LiquidResponsive<CSSProperties['minHeight']>
  minW?: LiquidResponsive<CSSProperties['minWidth']>
  ml?: LiquidResponsive<Scalar>
  mr?: LiquidResponsive<Scalar>
  mt?: LiquidResponsive<Scalar>
  mx?: LiquidResponsive<Scalar>
  my?: LiquidResponsive<Scalar>
  p?: LiquidResponsive<Scalar>
  pb?: LiquidResponsive<Scalar>
  pl?: LiquidResponsive<Scalar>
  pr?: LiquidResponsive<Scalar>
  pt?: LiquidResponsive<Scalar>
  px?: LiquidResponsive<Scalar>
  py?: LiquidResponsive<Scalar>
  /** Drives `--lq-radius`, so the press-squish keeps animating the corners. */
  radius?: LiquidResponsive<Scalar>
  /** Sets width and height together. */
  size?: LiquidResponsive<Scalar>
  w?: LiquidResponsive<CSSProperties['width']>
}

/** State keys understood by `styles`. Anything else must be written as `&…` or `@…`. */
export type LiquidStyleState =
  | '_active'
  | '_checked'
  | '_dark'
  | '_disabled'
  | '_even'
  | '_expanded'
  | '_first'
  | '_focus'
  | '_focusVisible'
  | '_hover'
  | '_invalid'
  | '_last'
  | '_light'
  | '_odd'
  | '_open'
  | '_placeholder'
  | '_readOnly'
  | '_selected'

type ConditionalStyles = { [K in LiquidStyleState]?: LiquidStyles } & {
  [K in `&${string}`]?: LiquidStyles
} & {
  [K in `@${string}`]?: LiquidStyles
}

/**
 * Style overrides for a Liquid component root.
 *
 * - every CSS property (camelCase) plus `--custom-properties`
 * - shorthands: `p`, `px`, `mt`, `w`, `h`, `size`, `bg`, `radius`, …
 * - `$token` anywhere in a string resolves to `var(--lq-token)`
 * - responsive objects: `{ base: 1, md: 3 }`
 * - states: `_hover`, `_focusVisible`, `_dark`, … and raw `&…` / `@…` keys
 */
export type LiquidStyles = StandardStyles & CustomPropertyStyles & ShorthandStyles & ConditionalStyles

/** Mixed into every component's props. */
export type LiquidStyleProps = {
  /**
   * Token-aware style overrides applied to the component root. Static values
   * become inline styles; responsive and stateful values become a generated
   * class that sits outside the `liquefy-ui` cascade layer, so it always wins
   * over the stylesheet without needing `!important`.
   */
  styles?: LiquidStyles
}

/* -------------------------------------------------------------------------- *
 * Maps
 * -------------------------------------------------------------------------- */

const SHORTHANDS: Record<string, readonly string[]> = {
  bg: ['background-color'],
  h: ['height'],
  m: ['margin'],
  maxH: ['max-height'],
  maxW: ['max-width'],
  mb: ['margin-bottom'],
  minH: ['min-height'],
  minW: ['min-width'],
  ml: ['margin-left'],
  mr: ['margin-right'],
  mt: ['margin-top'],
  mx: ['margin-inline'],
  my: ['margin-block'],
  p: ['padding'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
  pr: ['padding-right'],
  pt: ['padding-top'],
  px: ['padding-inline'],
  py: ['padding-block'],
  size: ['width', 'height'],
  w: ['width'],
}

// Numbers on these read as multiples of --lq-space rather than pixels. Unitless
// numbers are invalid CSS for all of them, so there is nothing to be ambiguous about.
const SPACING_PROPS = new Set([
  'column-gap',
  'gap',
  'margin',
  'margin-block',
  'margin-block-end',
  'margin-block-start',
  'margin-bottom',
  'margin-inline',
  'margin-inline-end',
  'margin-inline-start',
  'margin-left',
  'margin-right',
  'margin-top',
  'padding',
  'padding-block',
  'padding-block-end',
  'padding-block-start',
  'padding-bottom',
  'padding-inline',
  'padding-inline-end',
  'padding-inline-start',
  'padding-left',
  'padding-right',
  'padding-top',
  'row-gap',
])

// Everything else gets `px` appended, exactly like the `style` attribute does.
const UNITLESS_PROPS = new Set([
  'animation-iteration-count',
  'aspect-ratio',
  'border-image-slice',
  'box-flex',
  'column-count',
  'columns',
  'flex',
  'flex-grow',
  'flex-shrink',
  'fill-opacity',
  'font-weight',
  'grid-area',
  'grid-column',
  'grid-column-end',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-start',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'scale',
  'stroke-opacity',
  'stroke-width',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
])

// Bare color words on colour-ish properties, so `color: 'accent'` reads well.
const COLOR_WORDS = new Set([
  'accent',
  'foreground',
  'line',
  'muted',
  'placeholder',
  'text',
  'tint',
])

const isColorProp = (prop: string): boolean =>
  prop === 'color' || prop === 'fill' || prop === 'stroke' || prop.endsWith('color')

type Variant = { at?: string; selector: string }

const STATES: Record<string, readonly Variant[]> = {
  _active: [{ selector: '&:active' }],
  _checked: [{ selector: "&:checked, &[aria-checked='true'], &[data-checked='true']" }],
  // theme='system' resolves through the media query instead of the attribute.
  _dark: [
    { selector: "[data-liquid-theme='dark'] &" },
    { at: '@media (prefers-color-scheme: dark)', selector: "[data-liquid-theme='system'] &" },
  ],
  _disabled: [{ selector: "&:disabled, &[aria-disabled='true'], &[data-disabled='true']" }],
  _even: [{ selector: '&:nth-child(even)' }],
  _expanded: [{ selector: "&[aria-expanded='true']" }],
  _first: [{ selector: '&:first-child' }],
  _focus: [{ selector: '&:focus' }],
  _focusVisible: [{ selector: '&:focus-visible' }],
  _hover: [{ selector: '&:hover' }],
  _invalid: [{ selector: "&:invalid, &[aria-invalid='true'], &[data-invalid='true']" }],
  _last: [{ selector: '&:last-child' }],
  _light: [
    { selector: "[data-liquid-theme='light'] &" },
    { at: '@media (prefers-color-scheme: light)', selector: "[data-liquid-theme='system'] &" },
  ],
  _odd: [{ selector: '&:nth-child(odd)' }],
  _open: [{ selector: "&[open], &[data-open='true']" }],
  _placeholder: [{ selector: '&::placeholder' }],
  _readOnly: [{ selector: "&:read-only, &[aria-readonly='true']" }],
  _selected: [
    { selector: "&[aria-selected='true'], &[data-selected='true'], &[aria-current='page']" },
  ],
}

// The physics engine writes these inline every frame; a style override loses the
// race silently, so it is worth saying so out loud in development.
const PHYSICS_OWNED = new Set(['backdrop-filter', 'transform'])

/* -------------------------------------------------------------------------- *
 * Value + property resolution
 * -------------------------------------------------------------------------- */

const hyphenate = (key: string): string =>
  key.startsWith('--') ? key : key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

const camelize = (prop: string): string =>
  prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())

/** `$accent` → `var(--lq-accent)`, anywhere inside a string. */
const resolveTokens = (value: string): string => value.replace(/\$([a-zA-Z][\w-]*)/g, 'var(--lq-$1)')

const resolveValue = (prop: string, value: Scalar): string => {
  if (typeof value === 'number') {
    if (SPACING_PROPS.has(prop)) return value === 0 ? '0' : `calc(var(--lq-space, 4px) * ${value})`
    if (UNITLESS_PROPS.has(prop) || prop.startsWith('--')) return String(value)
    return value === 0 ? '0' : `${value}px`
  }
  if (isColorProp(prop) && COLOR_WORDS.has(value)) return `var(--lq-${value})`
  return resolveTokens(value)
}

type Declaration = readonly [prop: string, value: string]

const declare = (key: string, value: Scalar): Declaration[] => {
  if (key === 'radius') {
    const resolved = typeof value === 'number' ? `${value}px` : resolveTokens(value)
    // Keeping the squish term means custom corners still breathe under a press.
    return [
      ['--lq-radius', resolved],
      ['border-radius', 'calc(var(--lq-radius) + var(--lq-squish, 0) * 6px)'],
    ]
  }
  const props = SHORTHANDS[key] ?? [hyphenate(key)]
  return props.map((prop) => [prop, resolveValue(prop, value)] as const)
}

/* -------------------------------------------------------------------------- *
 * Parsing
 * -------------------------------------------------------------------------- */

type Block = {
  at: readonly string[]
  decls: Declaration[]
  order: number
  selector: string
}

type Parsed = {
  /** Static top-level declarations, ready for the `style` attribute. */
  inline: CSSProperties | undefined
  /** Hyphenated property names declared at the top level, whatever route they took. */
  owned: readonly string[]
  rules: string | undefined
  token: string | undefined
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toLength = (value: number | string): string => (typeof value === 'number' ? `${value}px` : value)

const parse = (
  styles: LiquidStyles,
  breakpoints: LiquefyBreakpoints,
  order: readonly LiquefyBreakpoint[],
): { blocks: Block[]; owned: string[] } => {
  const blocks: Block[] = []
  const owned: string[] = []

  const walk = (node: Record<string, unknown>, at: readonly string[], selector: string, top: boolean) => {
    // Reserved up front so unconditional declarations always precede the
    // breakpoint and state blocks they are meant to be overridden by.
    const base: Block = { at, decls: [], order: 0, selector }
    blocks.push(base)
    const deferred: (() => void)[] = []

    for (const [key, value] of Object.entries(node)) {
      if (value === undefined || value === null || value === false) continue

      const state = STATES[key]
      if (state) {
        for (const variant of state) {
          deferred.push(() =>
            walk(
              value as Record<string, unknown>,
              variant.at ? [...at, variant.at] : at,
              variant.selector.includes('&') ? variant.selector.replace(/&/g, selector) : variant.selector,
              false,
            ),
          )
        }
        continue
      }

      if (key.startsWith('&')) {
        deferred.push(() => walk(value as Record<string, unknown>, at, key.replace(/&/g, selector), false))
        continue
      }

      if (key.startsWith('@')) {
        deferred.push(() => walk(value as Record<string, unknown>, [...at, key], selector, false))
        continue
      }

      if (isPlainObject(value)) {
        const { base: baseValue } = value as { base?: Scalar }
        if (baseValue !== undefined && baseValue !== null) {
          base.decls.push(...declare(key, baseValue))
        }
        for (const [index, name] of order.entries()) {
          const atBreakpoint = value[name] as Scalar | undefined
          if (atBreakpoint === undefined || atBreakpoint === null) continue
          const query = `@media (min-width: ${toLength(breakpoints[name])})`
          const decls = declare(key, atBreakpoint)
          deferred.push(() => {
            blocks.push({ at: [...at, query], decls, order: index + 1, selector })
          })
        }
        // Recorded even when only a breakpoint sets it: the class has to be the
        // only route to the property, or the inline fallback would outrank it.
        if (top) owned.push(...declare(key, 0).map(([prop]) => prop))
        continue
      }

      const decls = declare(key, value as Scalar)
      base.decls.push(...decls)
      if (top) owned.push(...decls.map(([prop]) => prop))
    }

    for (const run of deferred) run()
  }

  walk(styles as Record<string, unknown>, [], '&', true)
  return { blocks: blocks.filter((block) => block.decls.length > 0), owned }
}

/* -------------------------------------------------------------------------- *
 * Sheet
 * -------------------------------------------------------------------------- */

const hash = (input: string): string => {
  let value = 5381
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 33) ^ input.charCodeAt(index)
  }
  return (value >>> 0).toString(36)
}

const collected = new Map<string, string>()
let sheet: HTMLStyleElement | null = null

const insert = (token: string, rules: string): void => {
  if (collected.has(token)) return
  collected.set(token, rules)
  if (typeof document === 'undefined') return
  if (!sheet) {
    sheet = document.querySelector<HTMLStyleElement>('style[data-liquefy-styles]')
    if (!sheet) {
      sheet = document.createElement('style')
      sheet.setAttribute('data-liquefy-styles', '')
      document.head.append(sheet)
    }
  }
  sheet.append(document.createTextNode(rules))
}

/**
 * Every rule generated by `styles` so far, as CSS text. Server renderers can
 * inline this into the document head; the generated rules are intentionally
 * unlayered so they win over `@layer liquefy-ui` without `!important`.
 */
export const getLiquefyStyleSheet = (): string => [...collected.values()].join('')

/* -------------------------------------------------------------------------- *
 * Hook
 * -------------------------------------------------------------------------- */

const serializeBlock = (block: Block, selector: string): string => {
  const body = block.decls.map(([prop, value]) => `${prop}:${value}`).join(';')
  let rule = `${block.selector.replace(/&/g, selector)}{${body}}`
  for (const at of [...block.at].reverse()) {
    rule = `${at}{${rule}}`
  }
  return rule
}

/**
 * Pure compiler behind {@link useLiquidStyles}. Exported for the unit tests; it
 * is deliberately absent from the package entry point.
 */
export const compileLiquidStyles = (
  styles: LiquidStyles | undefined,
  breakpoints: LiquefyBreakpoints,
  order: readonly LiquefyBreakpoint[],
): Parsed => {
  if (!styles) return { inline: undefined, owned: [], rules: undefined, token: undefined }

  const { blocks, owned } = parse(styles, breakpoints, order)
  if (blocks.length === 0) return { inline: undefined, owned, rules: undefined, token: undefined }

  if (isDevelopment) {
    for (const prop of owned) {
      if (PHYSICS_OWNED.has(prop)) {
        console.warn(
          `[liquefy-ui] styles.${camelize(prop)} is overwritten every frame by the jelly springs. ` +
            'Wrap the component in your own element and style that instead.',
        )
      }
    }
  }

  // A single unconditional block can ride on the style attribute — no class, no
  // stylesheet, no hydration concerns. The moment a state or breakpoint appears
  // everything has to move into the sheet together, or the inline declarations
  // would outrank the very rules meant to override them.
  const [only] = blocks
  if (blocks.length === 1 && only && only.at.length === 0 && only.selector === '&') {
    const inline: Record<string, string> = {}
    for (const [prop, value] of only.decls) inline[camelize(prop)] = value
    return { inline: inline as CSSProperties, owned, rules: undefined, token: undefined }
  }

  const sorted = [...blocks].sort((left, right) => left.order - right.order)
  const token = `lq-x-${hash(JSON.stringify(sorted))}`
  const rules = sorted.map((block) => serializeBlock(block, `.${token}`)).join('')
  return { inline: undefined, owned, rules, token }
}

/** A `style` object that also accepts custom properties. */
export type LiquidCustomProperties = CSSProperties & Record<`--${string}`, number | string>

type StyledInput = {
  className?: string
  style?: CSSProperties
  styles?: LiquidStyles
  /** Component-owned custom properties. `styles` and `style` both outrank them. */
  vars?: LiquidCustomProperties
}

export type StyledRoot = {
  className: string
  style: CSSProperties | undefined
}

/**
 * Resolves the `styles` prop into a `className` / `style` pair for a component
 * root, merging the component's own classes and custom properties.
 */
export const useLiquidStyles = (
  base: string | readonly (string | false | undefined)[],
  { className, style, styles, vars }: StyledInput,
): StyledRoot => {
  const { breakpoints } = useLiquefyConfig()
  const key = styles ? JSON.stringify(styles) : ''
  const order = useMemo(
    () =>
      (Object.keys(breakpoints) as LiquefyBreakpoint[]).sort(
        (left, right) => parseFloat(toLength(breakpoints[left])) - parseFloat(toLength(breakpoints[right])),
      ),
    [breakpoints],
  )
  const compiled = useMemo(
    () => compileLiquidStyles(styles, breakpoints, order),
    // The serialized form is the real identity here; inline object literals
    // would otherwise recompile on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, breakpoints, order],
  )

  useInsertionEffect(() => {
    if (compiled.token && compiled.rules) insert(compiled.token, compiled.rules)
  }, [compiled.token, compiled.rules])

  if (typeof document === 'undefined' && compiled.token && compiled.rules) {
    insert(compiled.token, compiled.rules)
  }

  const merged = useMemo(() => {
    if (!vars && !compiled.inline && !style) return undefined
    const next: Record<string, unknown> = {}
    if (vars) {
      for (const [prop, value] of Object.entries(vars)) {
        // Anything `styles` declares must reach the element through `styles`,
        // otherwise a component-owned inline var would outrank the class.
        if (compiled.owned.includes(hyphenate(prop))) continue
        next[prop] = value
      }
    }
    Object.assign(next, compiled.inline, style)
    return next as CSSProperties
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled, JSON.stringify(vars ?? null), style])

  const classes = typeof base === 'string' ? [base] : [...base]
  return {
    className: [...classes, compiled.token, className].filter(Boolean).join(' '),
    style: merged,
  }
}
