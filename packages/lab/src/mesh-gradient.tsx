import { useLiquefyConfig, useLiquidStyles, type LiquidStyleProps } from '@liquefy-ui/react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createBackdropContext, watchContextLoss } from './backdrop-gl'
import { useBackdropLoop } from './backdrop-loop'
import { MeshRenderer } from './mesh-gl'
import {
  meshColorGrid,
  meshColors,
  meshFallbackCss,
  MeshMotion,
  meshPositions,
  rasterizeMesh,
  resolveMeshOptions,
  tessellateMesh,
  type MeshOptions,
} from './mesh-motion'
import { cssPalette, useBackdropPalette } from './use-backdrop-palette'
import { useBeforePaint } from './use-before-paint'

export type MeshGradientProps = Omit<HTMLAttributes<HTMLDivElement>, 'color'> & LiquidStyleProps & Partial<MeshOptions> & {
  /** Laid over the gradient: the glass and whatever else the gradient is behind. */
  children?: ReactNode
  /**
   * One CSS colour per point, row by row. A shorter list is repeated, each
   * row starting further along, so neighbours differ. Defaults to the tint
   * spread into neighbouring hues.
   */
  colors?: readonly string[]
  /** The colour the palette is spread from when there are no `colors`. Defaults to the provider's tint. */
  tint?: string
}

/** How the gradient is being drawn. */
type MeshMode = 'canvas' | 'webgl'

/** Pixels on the long side of the 2D canvas stand-in, which the browser scales up. */
const CANVAS_SIDE = 160

/**
 * A gradient in the manner of SwiftUI's `MeshGradient`: colours pinned to a
 * grid of points, blended smoothly between them, and the points drifting
 * slowly round their places so the colour flows. Edge points slide along
 * their edge and corners stay put, so the colour always reaches every side.
 * Made to sit behind glass, and far lighter than `FluidBackdrop`: one draw
 * of a few thousand triangles a frame, nothing simulated.
 *
 * It draws with WebGL2 where it can and otherwise on a small 2D canvas the
 * browser scales up; on the server and before its first frame it is a CSS
 * stand-in in the same colours. With `motion={false}` on the provider the
 * points hold still. Like the rest of liquefy-ui it does not read
 * prefers-reduced-motion itself.
 */
export const MeshGradient = forwardRef<HTMLDivElement, MeshGradientProps>(({
  children,
  className,
  colors,
  columns,
  maxPixelRatio,
  rows,
  speed,
  style,
  styles,
  tint,
  wander,
  ...props
}, forwardedRef) => {
  const config = useLiquefyConfig()
  const animated = config.motion
  const options = useMemo(
    () => resolveMeshOptions({ columns, maxPixelRatio, rows, speed, wander }),
    [columns, maxPixelRatio, rows, speed, wander],
  )
  const tintColor = tint ?? config.tint

  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const timeRef = useRef(0)
  const [mode, setMode] = useState<MeshMode | null>(null)
  const [drawn, setDrawn] = useState(false)

  const palette = useBackdropPalette(canvasRef, colors, tintColor, 4)
  const motion = useMemo(
    () => new MeshMotion(options.columns, options.rows, options.wander),
    [options.columns, options.rows, options.wander],
  )
  // Finer for the GPU; for the 2D stand-in, about as fine as its pixels.
  const mesh = useMemo(
    () => tessellateMesh(options.columns, options.rows, mode === 'canvas' ? 24 : 48),
    [mode, options.columns, options.rows],
  )
  const vertexColors = useMemo(
    () => (palette ? meshColors(mesh, meshColorGrid(palette, options.columns, options.rows)) : null),
    [mesh, options.columns, options.rows, palette],
  )

  const glRef = useRef<MeshRenderer | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const pixelsRef = useRef<ImageData | null>(null)
  const pointsRef = useRef<Float32Array | null>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const meshRef = useRef(mesh)
  meshRef.current = mesh
  const colorsRef = useRef(vertexColors)
  colorsRef.current = vertexColors
  const motionRef = useRef(motion)
  motionRef.current = motion
  const refitRef = useRef<(() => void) | null>(null)

  const setRoot = useCallback((element: HTMLDivElement | null) => {
    rootRef.current = element
    if (typeof forwardedRef === 'function') forwardedRef(element)
    else if (forwardedRef) forwardedRef.current = element
  }, [forwardedRef])

  /**
   * Draws the gradient as it is at the clock's current time. Everything it
   * reads is a ref, so it never changes, and the drawing surface built
   * around it is not torn down when the grid does.
   */
  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const current = meshRef.current
    const drift = motionRef.current
    const tint = colorsRef.current
    if (!canvas || !tint) return
    const count = drift.columns * drift.rows * 2
    const points = drift.points(timeRef.current, pointsRef.current?.length === count ? pointsRef.current : undefined)
    pointsRef.current = points
    const size = current.vertexColumns * current.vertexRows * 2
    const positions = meshPositions(
      current,
      points,
      positionsRef.current?.length === size ? positionsRef.current : undefined,
    )
    positionsRef.current = positions
    if (glRef.current?.supported) {
      glRef.current.render(positions)
      return
    }
    const context = contextRef.current
    if (!context) return
    if (pixelsRef.current?.width !== canvas.width || pixelsRef.current.height !== canvas.height) {
      pixelsRef.current = context.createImageData(canvas.width, canvas.height)
    }
    const image = pixelsRef.current
    rasterizeMesh(current, positions, tint, image.width, image.height, image.data)
    context.putImageData(image, 0, 0)
  }, [])

  // The drawing surface, once per canvas: WebGL2, else a small 2D canvas.
  useBeforePaint(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root) return undefined
    const fit = () => {
      let width: number
      let height: number
      if (glRef.current?.supported) {
        const density = Math.min(window.devicePixelRatio || 1, optionsRef.current.maxPixelRatio)
        width = Math.max(1, Math.round(root.clientWidth * density))
        height = Math.max(1, Math.round(root.clientHeight * density))
      } else {
        const longest = Math.max(1, root.clientWidth, root.clientHeight)
        const scale = Math.min(1, CANVAS_SIDE / longest)
        width = Math.max(2, Math.round(root.clientWidth * scale))
        height = Math.max(2, Math.round(root.clientHeight * scale))
      }
      if (canvas.width === width && canvas.height === height) return false
      canvas.width = width
      canvas.height = height
      return true
    }

    const gl = config.webgl ? new MeshRenderer(createBackdropContext(canvas)) : null
    if (gl?.supported) {
      glRef.current = gl
      setMode('webgl')
    } else {
      gl?.destroy()
      contextRef.current = canvas.getContext('2d')
      if (!contextRef.current) return undefined
      setMode('canvas')
    }
    fit()

    const refit = () => {
      if (fit()) paint()
    }
    refitRef.current = refit
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refit)
    observer?.observe(root)
    const unwatch = glRef.current
      ? watchContextLoss(canvas, () => setDrawn(false), () => {
        glRef.current?.restore()
        const tint = colorsRef.current
        if (tint) glRef.current?.setMesh(meshRef.current, tint)
        paint()
        setDrawn(true)
      })
      : () => undefined

    return () => {
      observer?.disconnect()
      unwatch()
      glRef.current?.destroy()
      glRef.current = null
      contextRef.current = null
      refitRef.current = null
      setMode(null)
      setDrawn(false)
    }
  }, [config.webgl, paint])

  useEffect(() => {
    refitRef.current?.()
  }, [options.maxPixelRatio])

  // A new mesh or new colours: hand them over and draw at once.
  useBeforePaint(() => {
    if (!mode || !vertexColors) return
    glRef.current?.setMesh(mesh, vertexColors)
    paint()
    setDrawn(true)
  }, [mesh, mode, paint, vertexColors])

  useBackdropLoop(rootRef, animated && drawn && options.speed > 0, (step) => {
    timeRef.current += step * optionsRef.current.speed
    paint()
  })

  const grid = meshColorGrid(cssPalette(colors, tintColor, 4), options.columns, options.rows, tintColor)
  const root = useLiquidStyles('lq-mesh-gradient', {
    className,
    style: {
      backgroundImage: meshFallbackCss(grid, options.columns, options.rows),
      isolation: 'isolate',
      position: 'relative',
      ...style,
    },
    styles,
  })
  const canvasStyle: CSSProperties = {
    borderRadius: 'inherit',
    display: 'block',
    height: '100%',
    inset: 0,
    pointerEvents: 'none',
    position: 'absolute',
    visibility: drawn ? 'visible' : 'hidden',
    width: '100%',
    zIndex: -1,
  }

  return (
    <div
      {...props}
      className={root.className}
      data-mesh-mode={drawn && mode ? mode : 'fallback'}
      ref={setRoot}
      style={root.style}
    >
      <canvas aria-hidden="true" ref={canvasRef} style={canvasStyle} />
      {children}
    </div>
  )
})

MeshGradient.displayName = 'MeshGradient'
