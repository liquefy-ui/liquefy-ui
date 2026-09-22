import {
  attachLiquidLens,
  attachLiquidMotion,
  type LiquidMotionController,
  type LiquidMotionOptions,
} from '@liquefy-ui/core'
import { useCallback, useEffect, useRef, type Ref, type RefCallback } from 'react'

export type LiquidGlassOptions = LiquidMotionOptions & {
  /** Width of the refracting band at the rim, in pixels. Defaults to 22% of the short side. */
  bezel?: number
  /** Exponent of the bezel cross-section: 1 is an even ramp, higher piles the bend against the rim. */
  curve?: number
  lens?: boolean
  lensBlur?: number
  lensStrength?: number
  motion?: boolean
  saturation?: number
}

export type LiquidPulse = (strength?: number) => void

const assignRef = <Value,>(ref: Ref<Value> | undefined, value: Value | null): void => {
  if (typeof ref === 'function') {
    ref(value)
    return
  }

  if (ref) ref.current = value
}

export const useLiquidGlass = <Element extends HTMLElement>(
  forwardedRef: Ref<Element> | undefined,
  options: LiquidGlassOptions,
): readonly [RefCallback<Element>, RefCallback<HTMLCanvasElement>, LiquidPulse] => {
  const elementRef = useRef<Element | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<LiquidMotionController | null>(null)

  const setElement = useCallback((element: Element | null) => {
    elementRef.current = element
    assignRef(forwardedRef, element)
  }, [forwardedRef])

  const setCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas
  }, [])

  // Fires the motion controller's release overshoot on demand — used by inputs
  // to purun on keystrokes, selects on open, chips on hover, and so on.
  const pulse = useCallback<LiquidPulse>((strength) => {
    controllerRef.current?.pulse(strength)
  }, [])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return undefined

    const motionController = options.motion === false
      ? null
      : attachLiquidMotion(element, canvasRef.current, options)
    const lensController = options.lens === false
      ? null
      : attachLiquidLens(element, {
        bezel: options.bezel,
        blur: options.lensBlur,
        curve: options.curve,
        saturation: options.saturation,
        strength: options.lensStrength,
      })
    controllerRef.current = motionController

    return () => {
      controllerRef.current = null
      motionController?.destroy()
      lensController?.destroy()
    }
    // Every option is listed individually rather than depending on the object,
    // which a caller rebuilds on each render. The cost is that this list is the
    // real contract: an option missing from it is read once on mount and then
    // silently ignored for the rest of the component's life.
  }, [
    options.bezel,
    options.bounce,
    options.curve,
    options.disabled,
    options.glow,
    options.intensity,
    options.lens,
    options.lensBlur,
    options.lensStrength,
    options.motion,
    options.reach,
    options.respectReducedMotion,
    options.ripple,
    options.saturation,
    options.shimmer,
    options.sparkle,
    options.tilt,
    options.tint,
    options.webgl,
    options.wobbliness,
  ])

  return [setElement, setCanvas, pulse]
}
