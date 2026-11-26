import { LiquidAlert } from '@liquefy-ui/react'

export const PreviewStatus = ({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) =>
  hasUnsavedChanges ? (
    <LiquidAlert severity="warning">Changes could not be saved to this browser.</LiquidAlert>
  ) : null
