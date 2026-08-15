---
"@liquefy-ui/react": minor
---

`LiquidSlider` draws a real track, a real filled indicator and a real thumb.

It used to wrap a bare `input[type=range]` and paint it through the vendor
pseudo-elements, which put a ceiling on what it could look like:
`::-webkit-slider-runnable-track` has no idea where the thumb is, so the "filled"
part of the track was a fixed gradient pretending to be one — it did not follow
the value at all. Firefox got a plain grey track instead, because
`::-moz-range-track` will not take the gradient. Both browsers now get the same
slider, and the fill is the value.

The thumb still wraps a real `input[type=range]`, so the slider submits with a
form, `ref` still gives you the input, and a test can still drive it with a
change event. The jelly squish is unchanged — it composes with the `translate`
Base UI sets on the thumb by riding the `scale` property instead of `transform`.

**Breaking:** the props are the slider's own rather than the input element's.

- `onChange={(event) => setValue(Number(event.currentTarget.value))}` becomes
  `onValueChange={setValue}` — it hands you the number directly.
- `value`, `defaultValue`, `min`, `max` and `step` are `number` (they were the
  input's wider `string | number | readonly string[]`). Anything already passing
  numbers, which is every example in the docs, needs no change.
- `label`, `startAdornment`, `endAdornment`, `name`, `disabled` and `aria-label`
  all keep working. An `aria-label` reaches the input inside the thumb, not just
  the group around it.
