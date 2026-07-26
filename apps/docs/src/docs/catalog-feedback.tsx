import { useEffect, useRef, useState } from 'react'
import {
  LiquidAlert,
  LiquidButton,
  LiquidDialog,
  LiquidProgress,
  LiquidSkeleton,
  LiquidSpinner,
  LiquidToastProvider,
  useLiquidToast,
} from '@liquefy-ui/react'
import type { ComponentDoc } from './types'

const DialogDemo = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <LiquidButton onClick={() => setOpen(true)}>Open dialog</LiquidButton>
      <LiquidDialog
        description="Focus is trapped and returned, on a Liquid Glass surface."
        onOpenChange={setOpen}
        open={open}
        title="Delete 3 items?"
      >
        <p style={{ lineHeight: 1.6, margin: '0 0 18px', opacity: 0.75 }}>
          Escape and backdrop clicks close it, the page behind is inert, and focus
          goes back to the button that opened it.
        </p>
        <div className="lq-dialog__footer">
          <LiquidButton onClick={() => setOpen(false)}>Cancel</LiquidButton>
          <LiquidButton onClick={() => setOpen(false)} tint="#ff9fb5">Delete</LiquidButton>
        </div>
      </LiquidDialog>
    </>
  )
}

const ProgressDemo = () => {
  const [value, setValue] = useState(12)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setValue((current) => (current >= 100 ? 8 : current + 9))
    }, 900)
    return () => window.clearInterval(intervalRef.current)
  }, [])

  return (
    <div style={{ display: 'grid', gap: 22, maxWidth: 380, width: '100%' }}>
      <LiquidProgress label="Uploading assets" showValue value={value} />
      <LiquidProgress label="Preparing shaders" />
    </div>
  )
}

const ToastDemoInner = () => {
  const { toast } = useLiquidToast()

  return (
    <>
      <LiquidButton
        onClick={() => toast({ description: 'Your theme was published to npm.', severity: 'success', title: 'Release complete' })}
      >
        Success toast
      </LiquidButton>
      <LiquidButton
        onClick={() => toast({ description: 'WebGL context lost — falling back to CSS.', severity: 'warning', title: 'Renderer fallback' })}
      >
        Warning toast
      </LiquidButton>
    </>
  )
}

const ToastDemo = () => (
  <LiquidToastProvider placement="bottom-right">
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <ToastDemoInner />
    </div>
  </LiquidToastProvider>
)

export const feedbackDocs: ComponentDoc[] = [
  {
    demos: [
      {
        code: `<LiquidAlert severity="info" title="Heads up">
  Refraction requires a WebGL2-capable browser.
</LiquidAlert>
<LiquidAlert severity="success" title="Published">
  @liquefy-ui/react@0.2.0 is live on npm.
</LiquidAlert>
<LiquidAlert severity="warning" title="Context limit">
  Browsers cap live WebGL contexts at around 16 per page.
</LiquidAlert>
<LiquidAlert onClose={() => {}} severity="danger" title="Build failed">
  The shader failed to compile on this device.
</LiquidAlert>`,
        render: () => (
          <div style={{ display: 'grid', gap: 12, maxWidth: 520, width: '100%' }}>
            <LiquidAlert severity="info" title="Heads up">Refraction requires a WebGL2-capable browser.</LiquidAlert>
            <LiquidAlert severity="success" title="Published">@liquefy-ui/react@0.2.0 is live on npm.</LiquidAlert>
            <LiquidAlert severity="warning" title="Context limit">Browsers cap live WebGL contexts at around 16 per page.</LiquidAlert>
            <LiquidAlert onClose={() => {}} severity="danger" title="Build failed">The shader failed to compile on this device.</LiquidAlert>
          </div>
        ),
        title: 'Severities',
      },
      {
        code: `<LiquidAlert
  action={<LiquidButton size="sm">Retry</LiquidButton>}
  severity="danger"
  title="Sync failed"
>
  3 documents could not be uploaded.
</LiquidAlert>`,
        render: () => (
          <div style={{ maxWidth: 520, width: '100%' }}>
            <LiquidAlert action={<LiquidButton size="sm">Retry</LiquidButton>} severity="danger" title="Sync failed">
              3 documents could not be uploaded.
            </LiquidAlert>
          </div>
        ),
        title: 'With action',
      },
    ],
    description: 'Inline status banners in four severities with icon, title, action, and dismiss slots. Warnings and dangers announce as alerts.',
    importLine: "import { LiquidAlert } from '@liquefy-ui/react'",
    name: 'Alert',
    props: [
      { defaultValue: "'info'", description: 'Tone and default icon of the banner.', name: 'severity', type: "'info' | 'success' | 'warning' | 'danger'" },
      { description: 'Bold first line.', name: 'title', type: 'ReactNode' },
      { description: 'Replaces the default severity icon.', name: 'icon', type: 'ReactNode' },
      { description: 'Trailing action slot (e.g. a small button).', name: 'action', type: 'ReactNode' },
      { description: 'Shows a dismiss button and is called on dismiss.', name: 'onClose', type: '() => void' },
    ],
    propsTitle: 'LiquidAlert',
    slug: 'alert',
  },
  {
    demos: [
      {
        code: `<LiquidProgress label="Uploading assets" showValue value={value} />
<LiquidProgress label="Preparing shaders" />  {/* indeterminate */}`,
        render: () => <ProgressDemo />,
        title: 'Determinate and indeterminate',
      },
      {
        code: `<LiquidProgress tint="#69dfc4" value={72} />
<LiquidProgress tint="#f4b64f" value={45} />
<LiquidProgress tint="#ff5d73" value={18} />`,
        render: () => (
          <div style={{ display: 'grid', gap: 16, maxWidth: 380, width: '100%' }}>
            <LiquidProgress tint="#69dfc4" value={72} />
            <LiquidProgress tint="#f4b64f" value={45} />
            <LiquidProgress tint="#ff5d73" value={18} />
          </div>
        ),
        title: 'Tinted',
      },
    ],
    description: 'A linear progress bar with a luminous fill. Omit value for an indeterminate sweep.',
    importLine: "import { LiquidProgress } from '@liquefy-ui/react'",
    name: 'Progress',
    props: [
      { description: 'Current value; omit for indeterminate.', name: 'value', type: 'number' },
      { defaultValue: '100', description: 'Value that represents 100%.', name: 'max', type: 'number' },
      { description: 'Label above the track.', name: 'label', type: 'string' },
      { defaultValue: 'false', description: 'Shows the percentage next to the label.', name: 'showValue', type: 'boolean' },
      { description: 'Fill color override.', name: 'tint', type: 'string' },
    ],
    propsTitle: 'LiquidProgress',
    slug: 'progress',
  },
  {
    demos: [
      {
        code: `<LiquidSpinner size={28} />
<LiquidSpinner />
<LiquidSpinner size={48} thickness={2.4} tint="#c594ff" />
<LiquidSpinner value={68} />  {/* determinate */}`,
        render: () => (
          <>
            <LiquidSpinner size={28} />
            <LiquidSpinner />
            <LiquidSpinner size={48} thickness={2.4} tint="#c594ff" />
            <LiquidSpinner value={68} />
          </>
        ),
        title: 'Sizes and modes',
      },
    ],
    description: 'A circular activity indicator. Spins forever by default, or renders a fixed arc when given a value.',
    importLine: "import { LiquidSpinner } from '@liquefy-ui/react'",
    name: 'Spinner',
    props: [
      { defaultValue: '36', description: 'Rendered diameter in pixels.', name: 'size', type: 'number' },
      { defaultValue: '3', description: 'Stroke width of the ring.', name: 'thickness', type: 'number' },
      { description: 'Percentage (0–100) for a determinate arc.', name: 'value', type: 'number' },
      { defaultValue: "'Loading'", description: 'Accessible name.', name: 'label', type: 'string' },
      { description: 'Arc color override.', name: 'tint', type: 'string' },
    ],
    propsTitle: 'LiquidSpinner',
    slug: 'spinner',
  },
  {
    demos: [
      {
        code: `<div style={{ display: 'flex', gap: 14 }}>
  <LiquidSkeleton variant="circular" />
  <div style={{ flex: 1, display: 'grid', gap: 8 }}>
    <LiquidSkeleton width="55%" />
    <LiquidSkeleton width="85%" />
  </div>
</div>
<LiquidSkeleton height={110} variant="rectangular" />`,
        render: () => (
          <div style={{ display: 'grid', gap: 16, maxWidth: 380, width: '100%' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <LiquidSkeleton variant="circular" />
              <div style={{ display: 'grid', flex: 1, gap: 8 }}>
                <LiquidSkeleton width="55%" />
                <LiquidSkeleton width="85%" />
              </div>
            </div>
            <LiquidSkeleton height={110} variant="rectangular" />
          </div>
        ),
        title: 'Composition',
      },
    ],
    description: 'Shimmering placeholders in text, circular, and rectangular shapes for content that is still loading.',
    importLine: "import { LiquidSkeleton } from '@liquefy-ui/react'",
    name: 'Skeleton',
    props: [
      { defaultValue: "'text'", description: 'Placeholder shape.', name: 'variant', type: "'text' | 'circular' | 'rectangular'" },
      { description: 'Explicit width (px or CSS unit).', name: 'width', type: 'number | string' },
      { description: 'Explicit height (px or CSS unit).', name: 'height', type: 'number | string' },
      { description: 'Corner radius override.', name: 'radius', type: 'number | string' },
    ],
    propsTitle: 'LiquidSkeleton',
    slug: 'skeleton',
  },
  {
    demos: [
      {
        code: `// 1. Wrap your app once
<LiquidToastProvider placement="bottom-right">
  <App />
</LiquidToastProvider>

// 2. Fire toasts anywhere
const { toast } = useLiquidToast()
toast({
  title: 'Release complete',
  description: 'Your theme was published to npm.',
  severity: 'success',
})`,
        render: () => <ToastDemo />,
        title: 'Fire a toast',
      },
    ],
    description: 'Ephemeral notifications stacked in a fixed viewport. A provider plus a useLiquidToast() hook, with severities and auto-dismiss.',
    importLine: "import { LiquidToastProvider, useLiquidToast } from '@liquefy-ui/react'",
    acceptsStyles: false,
    name: 'Toast',
    props: [
      { description: 'Bold first line of the toast.', name: 'title', required: true, type: 'ReactNode' },
      { description: 'Secondary line.', name: 'description', type: 'ReactNode' },
      { defaultValue: "'info'", description: 'Tone and icon.', name: 'severity', type: "'info' | 'success' | 'warning' | 'danger'" },
      { defaultValue: '4200', description: 'Auto-dismiss delay in ms; 0 keeps it open.', name: 'duration', type: 'number' },
    ],
    propsTitle: 'toast() options',
    slug: 'toast',
  },
  {
    demos: [
      {
        code: `const [open, setOpen] = useState(false)

<LiquidButton onClick={() => setOpen(true)}>Open dialog</LiquidButton>
<LiquidDialog
  description="Focus is trapped and returned, on a Liquid Glass surface."
  onOpenChange={setOpen}
  open={open}
  title="Delete 3 items?"
>
  <p>Escape and backdrop clicks close it, and focus returns to the trigger.</p>
  <div className="lq-dialog__footer">
    <LiquidButton onClick={() => setOpen(false)}>Cancel</LiquidButton>
    <LiquidButton onClick={() => setOpen(false)} tint="#ff9fb5">Delete</LiquidButton>
  </div>
</LiquidDialog>`,
        render: () => <DialogDemo />,
        title: 'Confirm dialog',
      },
    ],
    description: 'A modal built on Base UI. Focus is trapped inside and restored to the trigger on close, the page behind is inert and scroll-locked, and the title and description are wired up as aria-labelledby / aria-describedby.',
    importLine: "import { LiquidDialog } from '@liquefy-ui/react'",
    name: 'Dialog',
    props: [
      { description: 'Whether the dialog is shown.', name: 'open', required: true, type: 'boolean' },
      { description: 'Called when the dialog wants to open or close.', name: 'onOpenChange', required: true, type: '(open: boolean) => void' },
      { description: 'Heading of the dialog.', name: 'title', required: true, type: 'ReactNode' },
      { description: 'Supporting text under the title.', name: 'description', type: 'ReactNode' },
      { defaultValue: "'Close'", description: 'Accessible label of the close button.', name: 'closeLabel', type: 'string' },
    ],
    propsTitle: 'LiquidDialog',
    slug: 'dialog',
  },
]
