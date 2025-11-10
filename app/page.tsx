"use client"

import { useEffect, useState } from "react"
import { PokerGameApp } from "@/components/poker-game-app"
import { MiniappSavePrompt } from "@/components/miniapp-save-prompt"

export default function Home() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block mb-4">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-white rounded-full"></div>
          </div>
          <p className="text-white text-lg">Loading Poker...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <PokerGameApp />
      <MiniappSavePrompt />
    </div>
  )
}
