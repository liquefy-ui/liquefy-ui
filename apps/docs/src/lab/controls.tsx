import type { ReactNode } from 'react'

/** The row of controls under a stage. Labels share a top line; controls share a centre line. */
export const LabControls = ({ children }: { children: ReactNode }) => (
  <div className="lab-controls">{children}</div>
)

/** One control with its label, and the current value at the label's end when it has one. */
export const LabControl = ({ children, label, value }: { children: ReactNode; label: string; value?: ReactNode }) => (
  <div className="lab-control">
    <span className="lab-control__label">
      {label}
      {value !== undefined && <em>{value}</em>}
    </span>
    {children}
  </div>
)
