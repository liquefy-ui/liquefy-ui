---
"@liquefy-ui/react": minor
---

`useLiquefyPortalContainer`: the node inside `LiquefyProvider` that the library's
own popups portal into. Pass it as a Base UI `Portal`'s `container` and a popup you
compose yourself keeps the theme's custom properties instead of rendering unstyled
at the end of `document.body`.
