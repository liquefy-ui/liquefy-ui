---
"@liquefy-ui/react": patch
---

Let the light theme's dock honour `--lq-dock-active`. The active and hovered item
hard-coded the colour instead of reading the token, so overriding it moved the
dock under `theme="dark"` and `theme="system"` but not under `theme="light"` —
the one asymmetry between the three themes. The default colour is unchanged.
