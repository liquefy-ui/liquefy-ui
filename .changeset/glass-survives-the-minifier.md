---
'@liquefy-ui/react': patch
---

Every glass surface keeps its blur once the stylesheet has been through a build.
`-webkit-backdrop-filter` is now written before the standard property rather
than after it: Lightning CSS, which is what Vite hands a stylesheet to, reads
the pair as one property declared twice and keeps only the last one. The old
order left a built stylesheet with nothing but the prefixed form in it, and
Chrome has since dropped that alias — so a bundled app got surfaces, buttons,
fields and popovers with no `backdrop-filter` at all, whatever it looked like in
development. Consumers importing the stylesheet as it ships were never affected.
