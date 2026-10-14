---
"@liquefy-ui/lab": minor
---

New package: `@liquefy-ui/lab`, for experimental, motion-heavy components built on
`@liquefy-ui/react`. APIs here may change between minor versions while it is 0.x.

The first is `DropletMenu`: a round glass trigger that buds its items off one at a
time. Each droplet stretches along its path, swings past its place and jiggles to
rest, and closing calls them home in reverse. The droplets are the same glass as
every other surface, so the backdrop refracts through them.

It is Base UI's menu underneath — roving focus, typeahead, Escape, focus returned
to the trigger — and it keeps the popup mounted until the last droplet is home.
`placement` lands the droplets around the trigger, on one side, or on a quarter arc
for a corner button; `radius` defaults to the closest that keeps them apart. The
provider's `motion` and `wobbliness`, and `prefers-reduced-motion`, are honoured.
