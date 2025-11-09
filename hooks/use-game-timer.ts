"use client"

import { useEffect, useState } from "react"

interface UseGameTimerProps {
  duration: number // in seconds
  onExpire: () => void
  isActive: boolean
  serverTimeLeft?: number // Sync with server
}

export function useGameTimer({ duration, onExpire, isActive, serverTimeLeft }: UseGameTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)

  // Sync with server time when received
  useEffect(() => {
    if (serverTimeLeft !== undefined) {
      setTimeRemaining(serverTimeLeft)
    }
  }, [serverTimeLeft])

  useEffect(() => {
    if (!isActive) {
      setTimeRemaining(duration)
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onExpire()
          return duration
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [duration, isActive, onExpire])

  return {
    timeRemaining,
    timeRemainingFormatted: `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, "0")}`,
    progress: ((duration - timeRemaining) / duration) * 100,
  }
}
