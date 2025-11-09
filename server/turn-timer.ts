export class TurnTimer {
  private duration: number
  private timeLeft: number
  private intervalId: NodeJS.Timeout | null = null
  private onTick: (timeLeft: number) => void
  private onExpire: () => void

  constructor(
    duration: number,
    onTick: (timeLeft: number) => void,
    onExpire: () => void
  ) {
    this.duration = duration
    this.timeLeft = duration
    this.onTick = onTick
    this.onExpire = onExpire
  }

  start() {
    if (this.intervalId) {
      this.stop()
    }

    this.timeLeft = this.duration

    // Send initial tick
    this.onTick(this.timeLeft)

    this.intervalId = setInterval(() => {
      this.timeLeft--
      this.onTick(this.timeLeft)

      if (this.timeLeft <= 0) {
        this.stop()
        this.onExpire()
      }
    }, 1000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getTimeLeft(): number {
    return this.timeLeft
  }

  addTime(seconds: number) {
    this.timeLeft += seconds
    if (this.timeLeft > this.duration) {
      this.timeLeft = this.duration
    }
  }
}
