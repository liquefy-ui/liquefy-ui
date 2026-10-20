import type { ComponentDoc } from '../docs/types'

/**
 * The shelves the Lab is sorted onto. They are fixed here rather than declared by
 * each experiment, so the order is decided once and a new experiment cannot start
 * a shelf by misspelling one.
 */
export type LabCategoryKey = 'menus' | 'surfaces' | 'meters' | 'effects' | 'backdrops' | 'icons'

/**
 * One experiment on the Lab screen. It is a component page — demos, an import
 * line, a prop table — plus where it sits and what it ships in.
 *
 * Each experiment lives in its own file under `./experiments/` and exports it as
 * `experiment`; the registry finds the files itself, so adding one touches no
 * shared list.
 */
export type LabExperiment = ComponentDoc & {
  category: LabCategoryKey
  /** What it was modelled on, credited under the title: "SwiftUI GlassEffectContainer". */
  inspiredBy?: string
  /** Position within its shelf, lowest first. Experiments without one follow, by name. */
  order?: number
  /** The package that ships it. Icon motion is in @liquefy-ui/icons; everything else in lab. */
  package: '@liquefy-ui/icons' | '@liquefy-ui/lab'
}
