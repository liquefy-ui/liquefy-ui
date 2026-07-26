export type SpringOptions = {
  damping?: number
  mass?: number
  stiffness?: number
}

export class SpringValue {
  public current: number
  public target: number
  public velocity = 0

  private readonly damping: number
  private readonly mass: number
  private readonly stiffness: number

  public constructor(initialValue = 0, options: SpringOptions = {}) {
    this.current = initialValue
    this.target = initialValue
    this.damping = options.damping ?? 21
    this.mass = options.mass ?? 1
    this.stiffness = options.stiffness ?? 210
  }

  public set(value: number): void {
    this.current = value
    this.target = value
    this.velocity = 0
  }

  public setTarget(value: number): void {
    this.target = value
  }

  public step(deltaSeconds: number): boolean {
    const frameDelta = clampDelta(deltaSeconds)
    const stepCount = Math.max(1, Math.ceil(frameDelta / (1 / 120)))
    const delta = frameDelta / stepCount

    for (let index = 0; index < stepCount; index += 1) {
      const displacement = this.current - this.target
      const springForce = -this.stiffness * displacement
      const dampingForce = -this.damping * this.velocity
      const acceleration = (springForce + dampingForce) / this.mass

      this.velocity += acceleration * delta
      this.current += this.velocity * delta
    }

    const remainingDistance = this.current - this.target
    if (Math.abs(this.velocity) > 0.001 || Math.abs(remainingDistance) > 0.001) return true

    this.current = this.target
    this.velocity = 0
    return false
  }
}

const clampDelta = (deltaSeconds: number): number => {
  if (!Number.isFinite(deltaSeconds)) return 1 / 60
  return Math.min(Math.max(deltaSeconds, 1 / 240), 1 / 15)
}
