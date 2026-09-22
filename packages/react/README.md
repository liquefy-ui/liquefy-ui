# @liquefy-ui/react

React components that combine highly transparent Liquid Glass with accessible interaction behavior.

```tsx
import { LiquefyProvider, LiquidButton } from '@liquefy-ui/react'
import { ArrowRightIcon } from '@liquefy-ui/icons'
import '@liquefy-ui/react/styles.css'

<LiquefyProvider>
  <LiquidButton iconAfter={<ArrowRightIcon />} size="lg">Continue</LiquidButton>
</LiquefyProvider>
```

There is no `variant` prop on `LiquidButton`: hierarchy comes from `size`, `tint` and
placement, and anything else goes through the `styles` prop below.

The provider takes no required props beyond `children`: its defaults are the material the
library ships with, and every prop on it is a departure from that rather than a thing you
have to supply to get started.

React 18.2 and newer are supported. Disable WebGL per component with `webgl={false}` or across a subtree through the provider. The `theme` prop accepts `dark`, `light`, or `system`.

Every component also takes a token-aware `styles` prop:

```tsx
<LiquidButton styles={{ p: 3, color: 'accent', w: { base: '100%', md: 240 }, _hover: { bg: '$glass-soft' } }}>
  Continue
</LiquidButton>
```

Spacing keys count `--lq-space` units, `$token` resolves to `var(--lq-token)`, and
state keys (`_hover`, `_dark`, …) plus breakpoint objects compile to a class that
sits outside the `liquefy-ui` cascade layer. See the root README for the full table.
