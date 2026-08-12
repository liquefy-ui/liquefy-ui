---
"@liquefy-ui/react": minor
---

`LiquidSegmented` is a toggle group rather than a tab list. It used to claim
`role="tablist"` and `role="tab"` without ever rendering a tabpanel, which tells
a screen reader to expect panels that do not exist, and it left the arrow keys
doing nothing — Tab stopped on every option in turn instead. It now takes one
tab stop and moves between options with the arrows, and each option reports
itself with `aria-pressed`.

Pressing the option that is already chosen stays a no-op: a segmented control
answers its question at all times, so there is no way to clear it.

`options`, `value`, `defaultValue`, `onValueChange`, `size` and `label` are
unchanged, as is the springy indicator. A test that reaches for
`getAllByRole('tab')` or reads `aria-selected` needs `button` and `aria-pressed`.
