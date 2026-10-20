import type { CSSProperties, ReactNode } from 'react'

/** The photographs in `public/scenes/`, with the credit each carries (see CREDITS.txt there). */
const SCENES = {
  coast: 'Photo by Stefan Kunze',
  fjord: 'Photo by Alexey Topolyanskiy',
  summit: 'Photo by Wolfgang Lutz',
} as const

export type LabScene = keyof typeof SCENES

type LabStageProps = {
  /** Where the content sits inside the photograph. */
  align?: 'center' | 'bottom' | 'bottom-end' | 'top'
  children: ReactNode
  className?: string
  /** Stage height in pixels. */
  height?: number
  scene?: LabScene
  style?: CSSProperties
}

/**
 * A photograph to hold an experiment over. Everything in the Lab is the same
 * glass as the rest of the library, and a flat ground leaves it nothing to bend —
 * so every demo that shows glass sits on one of these.
 *
 * The stage has no `opacity`, `filter`, `clip-path` or `mask`, and must not get
 * one: any of them would make the glass inside see only the stage's own layer.
 */
export const LabStage = ({ align = 'center', children, className, height = 340, scene = 'fjord', style }: LabStageProps) => (
  <div
    className={['lab-stage', className].filter(Boolean).join(' ')}
    data-align={align}
    data-scene={scene}
    style={{ height, ...style }}
  >
    <span className="lab-stage__credit">{SCENES[scene]}</span>
    {children}
  </div>
)
