---
"@liquefy-ui/react": minor
---

`LiquidDatePicker`: a calendar in a glass popover, on a trigger that measures
like a text field so it lines up with the rest of a form.

Base UI has no calendar, so the month grid is this library's own, and it is the
part a hand-rolled picker usually leaves out: the grid is one tab stop with a
roving focus, arrows move a day and a week, Home and End reach the ends of the
week, PageUp and PageDown change the month and with Shift the year, and the
popup opens on the chosen day rather than on the first arrow in the DOM. Base UI
still owns the popover itself — it flips to stay on screen, Escape closes it, and
focus returns to the trigger.

Values go in and come back as `yyyy-mm-dd`, parsed and formatted in local time.
`toISOString()` would answer in UTC, which is tomorrow through a Tokyo evening
and yesterday through a New York one. `min` and `max` disable the days outside
them, `format` decides how the trigger reads, `locale` and `weekStartsOn` decide
how the calendar does, and `name` writes the value to a hidden input so a plain
form submit carries it.
