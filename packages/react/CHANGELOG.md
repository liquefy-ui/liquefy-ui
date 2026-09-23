# @liquefy-ui/react

## 1.0.0

### Minor Changes

- b798158: Add `veil`, a dial that takes the material down to nothing but an edge
  
  `veil` is how much of the material's own dressing sits between the eye and what
  is behind it: the fill, the inner sheen, the cast shadow and the lift it gives
  the backdrop's colour. It runs from 1, which is the material exactly as it was,
  down to 0. It is a provider prop and a prop on `LiquidSurface` and
  `LiquidGlass`, so a single panel can be thinner than everything around it.
  
  It deliberately leaves the rim and the refraction alone. Those are what make a
  panel read as glass rather than as a hole cut in the page, so `veil={0}` with
  `frost={0}` is a pane with nothing in it but a lit edge and the bend behind it
  — which was not reachable before, because the cast shadow and the inner sheen
  had no dial of their own and sat over the backdrop whatever else was turned
  down.
  
  The scaling is derived per surface rather than on the theme tokens, so a veil
  set on one component still resolves there instead of being fixed at provider
  scope. It covers the surface material — `LiquidSurface`, `LiquidGlass` and
  `GlassCard`; the smaller controls keep the dressing their own shapes need.
- b798158: Compose the lens with the frost, and make the refracting material the default
  
  Fixed: attaching an edge lens wrote `backdrop-filter` straight onto the element,
  which is one declaration — so the blur, the saturation and the brightness the
  material had already asked for were thrown away the moment the lens arrived.
  Turning the frost up did nothing to any surface with refraction on it. The lens
  now publishes `--lq-lens`, and every backdrop-filter in the stylesheet ends with
  `var(--lq-lens, )`, so the refraction joins the rest of the material instead of
  replacing it.
  
  `refraction` is now a provider prop. It defaults to `1`, while provider-level
  `frost` defaults to `0`; every component resolves both from the provider, so the
  optics reach cards, buttons, fields and the rest rather than only the surfaces
  that name them.
  
  `LiquidGlass` ornaments now fall back to the provider instead of starting out
  switched off, which makes a bare `<LiquidGlass>` the house material rather than
  a stripped-down variant of it. Naming `glow`, `ripple`, `shimmer` or `sparkle`
  is how an instance departs from that — including `glow={false}` to opt out.
- b798158: Add `frost`, and stop the slider thumb hanging out of its own control
  
  `frost` is a provider prop: backdrop blur in pixels, added to whatever each
  surface already asks for. A dialog stays thicker than a card however far the
  dial is turned, and the default of `0` leaves every surface exactly where it
  was. `LiquidGlass` takes `frost` too, set outright rather than added, because a
  component naming its own frost is saying what it wants to be rather than how
  much more than everything else.
  
  That rename frees `frost` from the meaning it briefly had on `LiquidGlass` —
  the blur applied to the refracted image, which is now `softness`. Frosted glass
  is a backdrop blur; it was the wrong word for the other thing.
  
  Fixed: `LiquidSlider` centres its thumb on the value, so at either end half the
  handle hung outside the track. Anywhere the slider sat in a container that
  clips, the handle was sliced down the middle at exactly the value where someone
  is most likely to be looking at it. The control is now inset by half a thumb,
  so the handle's outer edge lands on the control's own.
- b798158: Retune the default material
  
  The provider's defaults change, so every surface looks different without any
  code changing: `tint` becomes `#8f8f8f`, `intensity` becomes `1.2`, and
  `wobbliness` becomes `0.1`. The playground writes a snippet for whatever values
  you pick.
  
  `lens` and `webgl` are on by default. Turning `webgl` off creates no presentation
  canvas, and since `glow`, `ripple`, `shimmer` and `sparkle` are drawn by that
  pass, all four are inert while it is off. Turning `lens` off drops the
  displacement at the bezel while the frost, lit rim and springs stay in place.
  
  The React material now arrives lit and refracting without any provider props.
- b798158: Composite the rim as a ring, and retune the default material
  
  Fixed: the rim overlay was filling the whole face instead of the 1.6px band it
  is masked to. `-webkit-mask` was declared after `mask-composite: exclude`, and
  the shorthand resets the compositing operator — `-webkit-mask-composite: xor`
  does not put the standard one back, so the ring composited as source-over. The
  gradient it paints is white and blends with `screen`, which made every surface
  a bright diagonal wash on a dark page: labels inside segmented controls and
  buttons disappeared under it. The light theme never showed it, because `screen`
  against white is a no-op. Prefixed declarations now come first and the standard
  ones last, the same ordering `backdrop-filter` already needed in this file.
  
  The defaults move to the material the playground has settled on: `frost` to 0,
  `refraction` to 1 and `veil` to 0.
  
  `veil` now reaches the things that were still fixed underneath it — the clear
  variant's fill, which was `transparent` and so had nothing for the dial to
  scale, and the shader canvas, whose `screen` blend is brightest exactly where
  a surface asking to be barely there can least afford it. A theme can set a
  floor under the dial with `--lq-veil-floor`, and the dark one does: a hairline
  on black is not a panel, so `veil={0}` there still leaves a little material.
  Set `--lq-veil-floor: 0` on a subtree to take that away too.
- b798158: Turn the optics up, and let every component take them from the provider
  
  The defaults move to `intensity` `1.2`, with both `lens` and `webgl` on. The
  material arrives lit and refracting rather than waiting to be switched on.
  
  The larger change is that components stop overruling it. `GlassCard`,
  `LiquidAccordion`, `LiquidList`, `LiquidTable`, `LiquidButton`,
  `LiquidIconButton`, `LiquidChip`, `LiquidPagination`, and every control from
  `LiquidCheckbox` to `LiquidTextarea` used to pin `lens` — and some of them
  `webgl` — to `false` regardless of what the provider said. Several of those
  pins date from when the bezel could fold the backdrop back on itself at small
  sizes, which it no longer can. They now read the provider like everything else,
  so `<LiquefyProvider lens={false}>` means what it says and so does the default.
  
  Two things worth knowing before upgrading. The lens is an SVG filter inside
  `backdrop-filter`, which is among the most expensive things a browser
  composites, so a page dense with lit controls now costs more than it did —
  `lens={false}` on the provider, or per component, takes it straight back.
  `LiquidChip` and `LiquidPagination` still render no shader canvas of their own,
  by design: they travel in groups, and a presentation canvas each is not a trade
  worth making.
- b798158: Drop `dispersion` and `elasticity`, and make the provider need nothing
  
  Removed: `dispersion` and `elasticity` are gone from `LiquefyProvider` and from
  `LiquidGlass`. Neither earned its place in the material — the channel split was
  a rim effect nobody was turning up, and the lean toward an approaching pointer
  read as drift rather than as life. `@liquefy-ui/core` keeps both as low-level
  options; `attachLiquidLens` simply no longer splits the channels unless asked.
  
  `<LiquefyProvider>` now needs nothing but `children`. Its defaults are the
  material the library ships with — `veil` 0, `intensity` 1.2, `refraction` 1,
  `frost` 0, `wobbliness` 0.1, glow and shimmer on, ripple and sparkle off — so
  every prop on it is a departure from that rather than something you have to
  supply to get the look. The READMEs and the provider page show it bare.
- b798158: Rebuild the lens optics so the rim can no longer fold
  
  The bezel cross-section is now a power curve instead of a spherical cap. A cap
  is the honest shape of a lens but its slope goes vertical where it meets the
  rim, so displacement jumped from nothing to its maximum within a pixel and the
  backdrop folded back on itself at rounded ends — the mirrored sliver that made
  edge refraction unusable on control-sized elements. Displacement is now solved
  from the slope of that curve for a chosen compression, which makes folding
  structurally impossible rather than something each new value had to be checked
  against. `strength` reads 0 to 1 as a result: the fraction of the bend the
  material can take, not a multiplier that could exceed it.
  
  New: `LiquidGlass`, the material with its optics as props, and `glow`, `ripple`,
  `shimmer` and `sparkle` as separate switches, so the optics can be had without
  the ornaments. The lit rim is now two blended rings whose bright quarter follows
  the pointer.

### Patch Changes

- Updated dependencies [b798158]
- Updated dependencies [b798158]
- Updated dependencies [b798158]
- Updated dependencies [b798158]
- Updated dependencies [b798158]
  - @liquefy-ui/core@0.2.0

## 0.4.0

### Minor Changes

- e70fad9: `LiquidDatePicker`: a calendar in a glass popover, on a trigger that measures
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
