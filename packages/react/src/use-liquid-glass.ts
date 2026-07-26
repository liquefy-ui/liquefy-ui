import {
  attachLiquidLens,
  attachLiquidMotion,
  type LiquidMotionController,
  type LiquidMotionOptions,
} from '@liquefy-ui/core'
import { useCallback, useEffect, useRef, type Ref, type RefCallback } from 'react'

export type LiquidGlassOptions = LiquidMotionOptions & {
  lens?: boolean
  lensStrength?: number
  motion?: boolean
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
      : attachLiquidLens(element, { strength: options.lensStrength })
    controllerRef.current = motionController

    return () => {
      controllerRef.current = null
      motionController?.destroy()
      lensController?.destroy()
    }
  }, [
    options.bounce,
    options.disabled,
    options.intensity,
    options.lens,
    options.lensStrength,
    options.motion,
    options.respectReducedMotion,
    options.tilt,
    options.tint,
    options.webgl,
    options.wobbliness,
  ])

  return [setElement, setCanvas, pulse]
}
