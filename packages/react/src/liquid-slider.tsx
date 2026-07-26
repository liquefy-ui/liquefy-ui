import { SpringValue } from '@liquefy-ui/core'
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

export type LiquidSliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & LiquidStyleProps & {
  endAdornment?: ReactNode
  label?: string
  startAdornment?: ReactNode
}

export const LiquidSlider = forwardRef<HTMLInputElement, LiquidSliderProps>(({
  className,
  endAdornment,
  id,
  label,
  startAdornment,
  style,
  styles,
  ...props
}, forwardedRef) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const config = useLiquefyConfig()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const setRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }, [forwardedRef])

  // Spring-driven thumb squish: every value change kicks a horizontal stretch
  // that springs back, so the thumb wobbles like jelly while you drag it.
  useEffect(() => {
    const input = inputRef.current
    if (!input || config.motion === false) return undefined

    const wobbliness = config.wobbliness
    const scaleX = new SpringValue(1, { damping: 13, mass: 0.9, stiffness: 340 })
    const scaleY = new SpringValue(1, { damping: 13, mass: 0.9, stiffness: 340 })
    let frame = 0
    let lastTime = performance.now()
    let lastValue = Number(input.value)

    const apply = () => {
      input.style.setProperty('--lq-thumb-sx', scaleX.current.toFixed(4))
      input.style.setProperty('--lq-thumb-sy', scaleY.current.toFixed(4))
    }

    const tick = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time
      const movingX = scaleX.step(delta)
      const movingY = scaleY.step(delta)
      apply()
      frame = movingX || movingY ? requestAnimationFrame(tick) : 0
    }

    const start = () => {
      if (frame) return
      lastTime = performance.now()
      frame = requestAnimationFrame(tick)
    }

    const handleInput = () => {
      const value = Number(input.value)
      const min = Number(input.min || 0)
      const max = Number(input.max || 100)
      const range = Math.max(max - min, 1)
      const moved = Math.abs(value - lastValue) / range
      lastValue = value
      const kick = Math.min(0.35 + moved * 9 * wobbliness, 1.25)
      scaleX.velocity += kick
      scaleY.velocity -= kick
      start()
    }

    const grow = () => {
      scaleX.setTarget(1.16)
      scaleY.setTarget(1.16)
      start()
    }

    const settle = () => {
      scaleX.setTarget(1)
      scaleY.setTarget(1)
      start()
    }

    input.addEventListener('input', handleInput)
    input.addEventListener('pointerdown', grow)
    input.addEventListener('focus', grow)
    input.addEventListener('blur', settle)
    window.addEventListener('pointerup', settle)
    window.addEventListener('pointercancel', settle)

    return () => {
      cancelAnimationFrame(frame)
      input.removeEventListener('input', handleInput)
      input.removeEventListener('pointerdown', grow)
      input.removeEventListener('focus', grow)
      input.removeEventListener('blur', settle)
      window.removeEventListener('pointerup', settle)
      window.removeEventListener('pointercancel', settle)
      input.style.removeProperty('--lq-thumb-sx')
      input.style.removeProperty('--lq-thumb-sy')
    }
  }, [config.motion, config.wobbliness])

  // The label is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles('lq-slider', { className, style, styles })

  return (
    <label className={root.className} htmlFor={inputId} style={root.style}>
      {label && <span className="lq-control-label">{label}</span>}
      <span className="lq-slider__row">
        {startAdornment && <span className="lq-slider__adornment">{startAdornment}</span>}
        <input id={inputId} ref={setRef} type="range" {...props} />
        {endAdornment && <span className="lq-slider__adornment">{endAdornment}</span>}
      </span>
    </label>
  )
})

LiquidSlider.displayName = 'LiquidSlider'
