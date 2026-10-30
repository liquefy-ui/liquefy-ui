/**
 * Motion for the icons: SF Symbols' symbol effects for the web.
 *
 * This entry is separate from the icons on purpose. The icons are plain
 * components with no state, safe to render on a React server and free for a
 * bundle that never moves them; everything here needs the client, carries a
 * `'use client'` directive, and is only paid for by an app that imports it.
 */
export {
  IconEffect,
  type IconBounceDirection,
  type IconDrawOrder,
  type IconEffectName,
  type IconEffectProps,
  type IconRotateDirection,
  type IconWiggleDirection,
} from './effects/icon-effect'
export {
  MagicReplace,
  type MagicReplaceFallback,
  type MagicReplaceProps,
  type MagicReplaceTransition,
} from './effects/magic-replace'
