import { vi } from 'vitest'

/**
 * A stand-in for a WebGL2 context, for jsdom, which has none. Every call is
 * a spy that does nothing; constants are distinct numbers; shaders compile,
 * programs link and framebuffers complete. It cannot say whether the
 * picture is right — only that the backdrop drives the context the way it
 * means to: which programs it builds, how many passes a frame takes, when it
 * stops asking for frames.
 */
export const fakeWebGL2 = (canvas: HTMLCanvasElement, extensions: readonly string[] = ['EXT_color_buffer_float']) => {
  const calls = new Map<string, ReturnType<typeof vi.fn>>()
  const constants = new Map<string, number>()
  let lost = false
  const overrides: Record<string, unknown> = {
    canvas,
    checkFramebufferStatus: () => constant('FRAMEBUFFER_COMPLETE'),
    getExtension: (name: string) => (extensions.includes(name) ? {} : null),
    getProgramParameter: () => true,
    getShaderParameter: () => true,
    isContextLost: () => lost,
  }
  const constant = (name: string) => {
    if (!constants.has(name)) constants.set(name, 0x1000 + constants.size)
    return constants.get(name) as number
  }
  const gl = new Proxy({}, {
    get(_, property) {
      if (typeof property !== 'string') return undefined
      if (property === 'drawingBufferWidth') return canvas.width
      if (property === 'drawingBufferHeight') return canvas.height
      if (property in overrides) {
        const override = overrides[property]
        if (typeof override !== 'function') return override
        if (!calls.has(property)) calls.set(property, vi.fn(override as (...args: unknown[]) => unknown))
        return calls.get(property)
      }
      if (/^[A-Z0-9_]+$/.test(property)) return constant(property)
      if (!calls.has(property)) calls.set(property, vi.fn(() => ({ name: property })))
      return calls.get(property)
    },
  }) as WebGL2RenderingContext
  return {
    gl,
    count: (name: string) => calls.get(name)?.mock.calls.length ?? 0,
    lose: () => {
      lost = true
    },
    restore: () => {
      lost = false
    },
    reset: () => calls.forEach((spy) => spy.mockClear()),
  }
}
