---
"@liquefy-ui/core": patch
---

`attachGlassMerge` draws a big rounded rect into its lens as two flat rectangles and
a small disc at each corner, instead of one image the size of the shape. Chromium
draws a filter's images again for every step that reads them, fourteen times a frame
here, so a screen-sized shape used to cost most of a frame: dragging an
`ElasticSheet` went from about 20 to 60 frames a second on an M1 Pro, with the same
look. Circles, stretched shapes and small rounded rects are drawn as before.
