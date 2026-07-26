export const clamp = (value: number, minimum = 0, maximum = 1): number => {
  return Math.min(Math.max(value, minimum), maximum)
}

export const lerp = (from: number, to: number, progress: number): number => {
  return from + (to - from) * progress
}

export const mapRange = (
  value: number,
  inputMinimum: number,
  inputMaximum: number,
  outputMinimum: number,
  outputMaximum: number,
): number => {
  if (inputMaximum === inputMinimum) return outputMinimum

  const progress = (value - inputMinimum) / (inputMaximum - inputMinimum)
  return lerp(outputMinimum, outputMaximum, progress)
}

export const hexToRgb = (hex: string): readonly [number, number, number] => {
  const normalized = hex.trim().replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return [0.58, 0.78, 1]

  return [
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255,
  ]
}
