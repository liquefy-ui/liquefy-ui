---
"@liquefy-ui/react": patch
---

`LiquidSegmented`: the sliding indicator now follows the pressed item's measured
box instead of an equal share of the track. When one label is too long for an
equal column (a narrow phone screen), its column grows and the indicator used to
drift off the pressed item.
