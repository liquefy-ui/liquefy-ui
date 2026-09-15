import { Slider } from '@base-ui/react/slider'
import { SpringValue } from '@liquefy-ui/core'
import { forwardRef, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquefyConfig } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// This wrapped a bare `input[type=range]` and painted it through the vendor
// pseudo-elements, which is why the filled part of the track was a fixed
// gradient rather than the value: `::-webkit-slider-runnable-track` cannot know
// where the thumb is. Firefox got a plain grey track instead, because
// `::-moz-range-track` cannot take the gradient at all. Base UI draws the track,
// the filled indicator and the thumb as real elements, so the fill follows the
// value and both browsers get the same slider.

export type LiquidSliderProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & LiquidStyleProps & {
  defaultValue?: number
  disabled?: boolean
  endAdornment?: ReactNode
  label?: string
  max?: number
  min?: number
  name?: string
  onValueChange?: (value: number) => void
  startAdornment?: ReactNode
  step?: number
  value?: number
}

/** A slider carries one value here; Base UI's array form is for ranged sliders. */
const single = (value: number | number[]): number => Array.isArray(value) ? value[0] ?? 0 : value

export const LiquidSlider = forwardRef<HTMLInputElement, LiquidSliderProps>(({
  'aria-label': ariaLabel,
  className,
  defaultValue,
  disabled,
  endAdornment,
  label,
  max = 100,
  min = 0,
  name,
  onValueChange,
  startAdornment,
  step,
  style,
  styles,
  value,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const thumbRef = useRef<HTMLDivElement>(null)
  const lastValue = useRef(single(value ?? defaultValue ?? min))
  // The springs live in an effect, but the value changes arrive as React
  // callbacks, so the two talk through these.
  const kick = useRef<(moved: number) => void>(() => {})
  const settleTo = useRef<(target: number) => void>(() => {})

  // Spring-driven thumb squish: every value change kicks a horizontal stretch
  // that springs back, so the thumb wobbles like jelly while you drag it.
  useEffect(() => {
    const thumb = thumbRef.current
    if (!thumb || config.motion === false) return undefined

    const wobbliness = config.wobbliness
    const scaleX = new SpringValue(1, { damping: 13, mass: 0.9, stiffness: 340 })
    const scaleY = new SpringValue(1, { damping: 13, mass: 0.9, stiffness: 340 })
    let frame = 0
    let lastTime = performance.now()

    const apply = () => {
      thumb.style.setProperty('--lq-thumb-sx', scaleX.current.toFixed(4))
      thumb.style.setProperty('--lq-thumb-sy', scaleY.current.toFixed(4))
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

    kick.current = (moved) => {
      const amount = Math.min(0.35 + moved * 9 * wobbliness, 1.25)
      scaleX.velocity += amount
      scaleY.velocity -= amount
      start()
    }

    settleTo.current = (target) => {
      scaleX.setTarget(target)
      scaleY.setTarget(target)
      start()
    }

    // A drag that ends anywhere on the page still ends the drag.
    const settle = () => settleTo.current(1)
    window.addEventListener('pointerup', settle)
    window.addEventListener('pointercancel', settle)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerup', settle)
      window.removeEventListener('pointercancel', settle)
      kick.current = () => {}
      settleTo.current = () => {}
      thumb.style.removeProperty('--lq-thumb-sx')
      thumb.style.removeProperty('--lq-thumb-sy')
    }
  }, [config.motion, config.wobbliness])

  // The slider is the layout box, so it owns className, style and styles alike.
  const root = useLiquidStyles('lq-slider', { className, style, styles })

  return (
    <Slider.Root
      aria-label={ariaLabel}
      className={root.className}
      defaultValue={defaultValue}
      disabled={disabled}
      max={max}
      min={min}
      name={name}
      onValueChange={(next) => {
        const nextValue = single(next)
        const moved = Math.abs(nextValue - lastValue.current) / Math.max(max - min, 1)
        lastValue.current = nextValue
        kick.current(moved)
        onValueChange?.(nextValue)
      }}
      step={step}
      style={root.style}
      value={value}
      {...props}
    >
      {label && <Slider.Label className="lq-control-label">{label}</Slider.Label>}
      <span className="lq-slider__row">
        {startAdornment && <span className="lq-slider__adornment">{startAdornment}</span>}
        <Slider.Control
          className="lq-slider__control"
          onPointerDown={() => settleTo.current(1.16)}
        >
          <Slider.Track className="lq-slider__track">
            <Slider.Indicator className="lq-slider__indicator" />
            <Slider.Thumb
              className="lq-slider__thumb"
              // The label names the group; the input inside the thumb is what a
              // screen reader lands on, and it needs the name too.
              getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
              inputRef={forwardedRef}
              onBlur={() => settleTo.current(1)}
              onFocus={() => settleTo.current(1.16)}
              ref={thumbRef}
            />
          </Slider.Track>
        </Slider.Control>
        {endAdornment && <span className="lq-slider__adornment">{endAdornment}</span>}
      </span>
    </Slider.Root>
  )
})

LiquidSlider.displayName = 'LiquidSlider'
