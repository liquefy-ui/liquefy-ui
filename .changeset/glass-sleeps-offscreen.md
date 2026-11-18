---
'@liquefy-ui/core': patch
'@liquefy-ui/react': patch
---

Glass now sleeps while it is out of sight. Each surface and button used to keep its rim canvas and, in Chromium, its refracting lens filter alive whether or not it was on screen, so a long list of a few hundred cards held hundreds of megabytes of canvas and spent most of each scroll frame on cards nobody could see; past the GPU's budget, cards blanked out mid-scroll. A single IntersectionObserver now lets each element release its canvas pixels and lens filter when it leaves a margin around the viewport and rebuild them on the way back in. Lens maps are also cached by shape, so a list of identical rows draws its map once.
