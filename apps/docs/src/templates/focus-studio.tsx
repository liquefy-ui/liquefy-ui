import { CheckIcon, ClockIcon, PauseIcon, PlayIcon, XIcon } from '@liquefy-ui/icons'
import { FluidBackdrop, LiquidIsland, LiquidLevel, MagneticActions } from '@liquefy-ui/lab'
import { LiquidSegmented } from '@liquefy-ui/react'
import { useEffect, useState } from 'react'

const focusDuration = 25 * 60
const timerModes = [
  { label: 'Focus', value: 'focus', seconds: focusDuration },
  { label: 'Short break', value: 'break', seconds: 5 * 60 },
]

const waterColors = [
  'color-mix(in srgb, var(--lq-foreground) 14%, var(--lq-solid-fill))',
  'color-mix(in srgb, var(--lq-accent) 24%, var(--lq-solid-fill))',
  'color-mix(in srgb, var(--lq-foreground) 26%, var(--lq-solid-fill))',
  'var(--lq-solid-fill)',
]

const statusViews = {
  ready: {
    content: <span className="studio-status"><ClockIcon size={17} /><span>Ready</span></span>,
    height: 44,
    width: 120,
  },
  paused: {
    content: <span className="studio-status"><PauseIcon size={17} /><span>Paused</span></span>,
    height: 44,
    width: 130,
  },
  running: {
    content: <span className="studio-status"><PlayIcon size={17} /><span>In session</span></span>,
    height: 44,
    width: 152,
  },
  complete: {
    announce: 'Session complete',
    bounce: true,
    content: <span className="studio-status"><CheckIcon size={17} /><span>Session complete</span></span>,
    height: 44,
    width: 192,
  },
}

const secondsLeft = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export const FocusStudio = () => {
  const [mode, setMode] = useState('focus')
  const duration = timerModes.find(({ value }) => value === mode)?.seconds ?? focusDuration
  const [remaining, setRemaining] = useState(18 * 60 + 40)
  const [deadline, setDeadline] = useState<number | null>(null)

  useEffect(() => {
    if (deadline === null) return
    const interval = window.setInterval(() => {
      const next = secondsLeft(deadline)
      setRemaining(next)
      if (next === 0) setDeadline(null)
    }, 250)
    return () => window.clearInterval(interval)
  }, [deadline])

  const selectMode = (value: string) => {
    const entry = timerModes.find((option) => option.value === value)
    if (!entry) return
    setMode(value)
    setRemaining(entry.seconds)
    setDeadline(null)
  }

  const toggle = () => {
    if (deadline !== null) {
      setRemaining(secondsLeft(deadline))
      setDeadline(null)
      return
    }
    const seconds = remaining || duration
    setRemaining(seconds)
    setDeadline(Date.now() + seconds * 1000)
  }

  const running = deadline !== null
  const view = running ? 'running' : remaining === 0 ? 'complete' : remaining === duration ? 'ready' : 'paused'
  const time = formatTime(remaining)

  return (
    <FluidBackdrop
      background="var(--lq-solid-fill)"
      className="focus-studio"
      colors={waterColors}
      dyeResolution={256}
      maxPixelRatio={1}
      resolution={64}
      speed={0.65}
      stir={0.35}
    >
      <LiquidIsland label="Session status" size={44} view={view} views={statusViews} />
      <LiquidLevel label={`${time} remaining`} max={duration} size={236} value={remaining}>
        <span className="studio-time">{time}</span>
      </LiquidLevel>
      <MagneticActions
        actions={[
          { icon: running ? <PauseIcon size={24} /> : <PlayIcon size={24} />, label: running ? 'Pause timer' : 'Start timer', onClick: toggle },
          { icon: <XIcon size={22} />, label: 'Reset timer', onClick: () => selectMode(mode) },
        ]}
        label="Timer controls"
        size="lg"
      />
      <LiquidSegmented className="studio-modes" label="Timer mode" onValueChange={selectMode} options={timerModes} value={mode} />
    </FluidBackdrop>
  )
}
