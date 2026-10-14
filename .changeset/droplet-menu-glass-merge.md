---
"@liquefy-ui/lab": minor
---

`DropletMenu` draws the trigger and its droplets as one body of glass. A droplet
leaving pulls a neck out of the trigger that thins and lets go before it lands,
and one coming home melts back in, with the refraction and the lit rim running
through the join. Underneath it is a `GlassMerge` surface fed from the
choreography each frame; the trigger and the droplets are clear buttons over it,
with the same menu behaviour as before.

The droplets are now laid out beside the trigger rather than portalled to the
provider, so they and their glass are clipped and stacked alike, and the menu
lifts itself to the menu layer while they are out. Engines without SVG backdrop
filters, and a provider with `lens` or `transparency` off, get the merged outline
with a frosted or solid fill.
