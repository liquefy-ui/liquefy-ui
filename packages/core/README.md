# @liquefy-ui/core

The framework-agnostic liquefy-ui runtime. It provides the WebGL 2 shader, physical springs, pointer tracking, and design tokens.

```ts
import { attachLiquidMotion, SpringValue } from '@liquefy-ui/core'
```

It has no runtime dependencies. WebGL is safely disabled when unavailable.

`attachGlassMerge(element, options)` draws several glass shapes on one element so
that they melt into each other when they come close, refracting the backdrop
through the joins where SVG backdrop filters are supported and falling back to a
clipped frosted outline elsewhere. Call `setShapes` with the shapes once a frame.
