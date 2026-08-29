# @liquefy-ui/react

## 0.3.0

### Minor Changes

- 6c4cdb0: The remaining hand-rolled controls sit on Base UI primitives, which mostly shows
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

- 6c4cdb0: `LiquidSegmented` is a toggle group rather than a tab list. It used to claim
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

- 3281818: `LiquidSlider` draws a real track, a real filled indicator and a real thumb.

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

- 6c4cdb0: `LiquidToastProvider` runs on Base UI's toast manager, so a message no longer
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

### Patch Changes

- 9cde2b7: Let a touchscreen paste into `LiquidTextField` and `LiquidTextarea`. Both wrap
  their input in a compositing layer, and WebKit places the text-selection callout
  against the wrong coordinate space when an input is nested that way, so a long
  press on iOS raised no menu and the field could not be pasted into. Under
  `any-pointer: coarse` the field — and a surface holding one — now drop the
  transform, which only ever drove pointer-tracked tilt that a touchscreen has no
  pointer for. Nothing changes for a mouse.

## 0.2.0

### Minor Changes

- 20db087: `LiquidDrawer` dismisses itself when the panel is flicked towards the edge it
  slid in from. The gesture stands down for a mouse, for content that can still
  scroll the way the flick would scroll it, and for a popup the panel opened —
  a listbox is portaled out of the drawer but still bubbles its events back
  through it. Set `swipeToClose={false}` to turn it off.
- bbf5e1e: `LiquidDrawer` and `LiquidDialog` are thick glass rather than clear. A panel
  that covers the page is read through, and on a phone a drawer is most of the
  screen with only a sliver of dimmed backdrop beside it — the page underneath
  used to show through the text. Both panels now soften what they refract, by
  20px, and carry a fill a little over half way to solid: enough that the words
  sit on something, little enough that the page still moves and colours behind
  them. `transparency={false}` on the provider still takes the glass off entirely.

  The softening reaches the lens too. `LiquidSurface` takes a `lensBlur`, which
  sets the blur inside the refraction the lens performs — until now that blur was
  fixed at a token 0.6px, so a lensed surface could refract the page behind it in
  perfect focus however frosted the stylesheet asked it to be.

- 4d89e14: `LiquidSelect` takes an `onOpenChange` callback, so whatever holds the select
  can tell when its popup is on screen.

### Patch Changes

- 9945404: A `LiquidSurface` with `interactive={false}` paints its shader again. The prop
  means the surface does not answer a pointer, but it also withheld the motion
  controller — and the controller is what drives the WebGL sheen — so the surface
  mounted a canvas that nothing ever drew into and wore flat glass instead of
  liquid. It now holds still and keeps its shine. `LiquidDrawer` is the component
  this was visible on; `LiquidAccordion` and `LiquidList` pass `webgl={false}` and
  are unchanged.
- 49998d7: Every glass surface keeps its blur once the stylesheet has been through a build.
  `-webkit-backdrop-filter` is now written before the standard property rather
  than after it: Lightning CSS, which is what Vite hands a stylesheet to, reads
  the pair as one property declared twice and keeps only the last one. The old
  order left a built stylesheet with nothing but the prefixed form in it, and
  Chrome has since dropped that alias — so a bundled app got surfaces, buttons,
  fields and popovers with no `backdrop-filter` at all, whatever it looked like in
  development. Consumers importing the stylesheet as it ships were never affected.
- 7440db1: A `LiquidDrawer` or `LiquidDialog` in the light theme is glass rather than
  grey. The scrim behind a panel is a dark dim, and a translucent panel sitting
  on top of it takes the dimming on as grey — 40% of near-black under a white
  fill landed the panel body at about #ced0d0. Dark mode never showed it, because
  there the dim disappears into the page. The light scrim now dims only as far as
  it takes to put the page out of reach, the fill gives up a few points so more of
  the page comes through, and the inner white glow steps back the way it already
  does on every other light surface, where it only ever read as haze.

## 0.1.6

### Patch Changes

- e61b652: Accept a node as the `title` of `GlassCard`, `LiquidAlert` and
  `LiquidAccordionItem`, which all three always rendered and the documented props
  tables always promised, but the types never allowed. `HTMLAttributes` declares
  `title` as the tooltip string, and intersecting that with `ReactNode` leaves
  `string` — so `title={<span …>}` failed to typecheck even though it lands in an
  `<h3>`, a `<strong>` or an accordion header. `LiquidDialog` and `LiquidDrawer`
  already omit the attribute for this reason; the other three now do too.
- 21df5ce: Raise the popover layer above the dialog and drawer, so a `LiquidSelect`,
  `LiquidMenu` or `LiquidTooltip` opened from inside one is visible. Every overlay
  portals into the provider's node as a sibling of the others, so the z-index is
  the only thing ordering them — and a select popup at 60 landed under a drawer
  panel at 80. The popup was fully rendered and interactive, just painted
  underneath, which reads as a pulldown that does nothing when tapped. Popovers now
  sit at 85 and tooltips at 88, still below the toast viewport at 90, and the whole
  ladder is written down next to the popover base so the next edit keeps it.
- 7ec315a: Let a `LiquidSelect` trigger shrink below 200px when its container is narrower
  than that. The flat `min-width: 200px` could not be honoured in a narrow column —
  three filter selects side by side on a phone — and the trigger overflowed instead,
  which reads as neighbouring selects overlapping rather than as a width problem.
  Capping the floor with `min(200px, 100%)` leaves every container with a definite
  width of 200px or more measuring exactly as before. A container sized by its own
  content — `width: fit-content`, a table cell — has no width for the percentage to
  resolve against, so a select there now measures its content instead of 200px.
- f1d911a: Render the toast viewport into the provider's portal node instead of the document
  body, so a toast keeps its fill and shadow. The theme tokens are declared on
  `.lq-provider`, and a subtree portaled outside it reads none of them:
  `--lq-solid-fill` resolves to nothing, the `color-mix()` built on it is invalid,
  and the material disappears. Dialog, Drawer, Select and Menu already portal into
  that node for this exact reason. The body stays the fallback for a
  `LiquidToastProvider` mounted without a `LiquefyProvider` above it — which also
  means the fix only reaches a toast provider nested inside one, so that is now what
  the documented usage shows. A toast's `z-index` is scoped to whatever stacking
  context holds the provider, the same as Dialog's and Drawer's already are.

## 0.1.5

### Patch Changes

- 6475e4a: Name the agent-facing tooling in the npm keywords: `mcp`, `ai`, `agents` and
  `llms-txt`, alongside `shadcn-registry` and `tailwindcss`. The package ships an
  MCP server, a shadcn registry and a Tailwind v4 bridge, and npm search could not
  find any of them by name.
- 621f110: Let the light theme's dock honour `--lq-dock-active`. The active and hovered item
  hard-coded the colour instead of reading the token, so overriding it moved the
  dock under `theme="dark"` and `theme="system"` but not under `theme="light"` —
  the one asymmetry between the three themes. The default colour is unchanged.

## 0.1.4

### Patch Changes

- 00c1c93: Scroll a bottom `LiquidDrawer` whose content is taller than the panel. The panel
  is sized by `max-height`, so the surface's `height: 100%` resolved against an
  `auto` parent and grew to its content instead: nothing scrolled, and the end of a
  tall panel — a form's submit button, say — sat past the bottom of the screen with
  no way to reach it.

## 0.1.3

### Patch Changes

- 0781867: Broaden the npm keywords so search finds these packages by what they are
- Updated dependencies [0781867]
  - @liquefy-ui/core@0.1.3

## 0.1.2

### Patch Changes

- Republish `@liquefy-ui/core` with the provenance attestation 0.1.1 is missing.

  The other packages picked up their trusted-publisher configuration on the 0.1.1
  release; core did not, so its OIDC exchange failed and the publish fell back to the
  token — which produces an unsigned tarball.

  `icons` and `react` ride along because the three are a linked group and
  `test/metadata.test.mjs` holds them to one version. None of the packaged code
  changed.

- Updated dependencies
  - @liquefy-ui/core@0.1.2

## 0.1.1

### Patch Changes

- Publish with npm provenance.

  0.1.0 shipped unsigned. `publishConfig.provenance` is read by npm, but this is a
  pnpm workspace, so `changeset publish` shells out to `pnpm publish` — which has no
  provenance support at all and silently ignored the field.

  The registry now trusts this repository's `release.yml` directly through OIDC, so
  no token is exchanged and npm attaches the attestation itself. Nothing about the
  packaged code changed; this release exists so the published artifact can be traced
  back to the commit that built it.

- Updated dependencies
  - @liquefy-ui/core@0.1.1
