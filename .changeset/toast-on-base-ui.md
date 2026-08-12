---
"@liquefy-ui/react": minor
---

`LiquidToastProvider` runs on Base UI's toast manager, so a message no longer
withdraws itself while it is being read. The old queue dismissed each toast from
a bare `setTimeout` started the moment it was queued: hovering the stack,
focusing the button inside it or tabbing away to another window all left it
counting down, and a long message could vanish mid-sentence. The timer now pauses
for all three, and <kbd>F6</kbd> moves keyboard focus into the stack.

Two things a consumer can see changed with it:

- `toast()` returns a `string` id rather than a `number`, and `dismiss()` takes
  the same. Code that stores what `toast()` handed back and passes it to
  `dismiss()` needs no change; code that declared the type in between does.
- Each toast is a `dialog` rather than a `status`, announced from the live
  region around the viewport. This is what APG asks for — `role="status"` on the
  toast itself re-announced the whole stack every time one arrived — but a test
  that looks for `getByRole('status')` will need to look for `dialog` instead.

`placement`, `severity`, `duration` and the `useLiquidToast()` hook are
unchanged, including `duration={0}` meaning "stay until dismissed".
