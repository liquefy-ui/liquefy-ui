---
"@liquefy-ui/react": minor
---

The remaining hand-rolled controls sit on Base UI primitives, which mostly shows
up as things that were quietly missing starting to work. Every public prop is
unchanged, and so is every piece of glass: Base UI supplies the behaviour, the
shader canvas and the springs stay exactly where they were.

- `LiquidSwitch`, `LiquidCheckbox` and `LiquidRadio` render a hidden input
  beside the button, so they submit with a form and answer `required`. They were
  `<button role="checkbox">` and friends before, which no form ever saw.
- `LiquidRadioGroup` has roving focus. Tab used to stop on every option in the
  group and the arrow keys did nothing — the two things a radio group is
  specified to do.
- `LiquidTextField` and `LiquidTextArea` are Base UI fields. The label, the
  control and the hint were wired together by hand through a generated id;
  the field owns that now, and a control put in a form reports its validity
  through the same parts.
- `LiquidButton` stays focusable while `isLoading`. A button that disables
  itself while it works used to throw the keyboard back to the top of the
  document at the moment the user was waiting to hear what happened.
- `LiquidChip` reports `aria-pressed` when it is given a `selected` state.
  A chip with only an `onClick` is still an ordinary button, and one with
  neither is still a label with a delete button hanging off it.
- `LiquidAvatar` tracks the image's loading status rather than a single
  `errored` flag, which covers a cached image that is already complete before
  React attaches `onError`, and a `src` that changes to a broken one after a
  good one has loaded.
- `LiquidProgress` and `LiquidDivider` follow the same primitives, and
  `LiquidProgress` now sizes its fill from the value itself.

Consumers styling these components off the library's own class names are
unaffected. Anything reaching past them into the data attributes should know
that state is now spelled the Base UI way — `[data-checked]` rather than
`[data-checked='true']`, `[data-indeterminate]` rather than
`[data-checked='mixed']`, and `[data-disabled]` rather than `:disabled`.
