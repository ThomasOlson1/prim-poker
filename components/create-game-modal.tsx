"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface CreateGameModalProps {
  onClose: () => void
  onCreate: (gameData: {
    name: string
    buyInEth: number
    blindLevel: string
    turnTimeMinutes: number
    maxPlayers: number
  }) => void
  loading?: boolean
}

export function CreateGameModal({ onClose, onCreate, loading }: CreateGameModalProps) {
  const [name, setName] = useState("My Game")
  const [buyInEth, setBuyInEth] = useState(0.5)
  const [blindLevel, setBlindLevel] = useState("1/2")
  const [turnTimeMinutes, setTurnTimeMinutes] = useState(3)
  const [maxPlayers, setMaxPlayers] = useState(6)

  const BLIND_LEVELS = [
    "0.01/0.02",
    "0.05/0.1",
    "0.1/0.2",
    "0.5/1",
    "1/2",
    "2/5",
    "5/10",
    "10/20",
    "25/50",
    "50/100",
    "100/200",
  ]

  const handleSubmit = () => {
    onCreate({
      name,
      buyInEth,
      blindLevel,
      turnTimeMinutes,
      maxPlayers,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="bg-slate-800 border-purple-500/20 p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-4">Create New Game</h2>

        <div className="space-y-4">
          {/* Game Name */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Game Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-purple-500/20 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          {/* Buy In ETH */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Buy In: {buyInEth.toFixed(3)} ETH</label>
            <input
              type="range"
              min="0.01"
              max="10"
              step="0.01"
              value={buyInEth}
              onChange={(e) => setBuyInEth(Number(e.target.value))}
              className="w-full mt-1"
            />
          </div>

          {/* Blind Level Selector */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Blind Level</label>
            <select
              value={blindLevel}
              onChange={(e) => setBlindLevel(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-purple-500/20 rounded px-3 py-2 text-white text-sm"
            >
              {BLIND_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Turn Time */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Turn Time: {turnTimeMinutes} min</label>
            <input
              type="range"
              min="1"
              max="180"
              step="1"
              value={turnTimeMinutes}
              onChange={(e) => setTurnTimeMinutes(Number(e.target.value))}
              className="w-full mt-1"
            />
            <div className="text-xs text-gray-500 mt-1">Range: 1 min - 3 hours</div>
          </div>

          {/* Max Players */}
          <div>
            <label className="text-xs text-gray-300 font-semibold">Max Players: {maxPlayers}</label>
            <input
              type="range"
              min="2"
              max="9"
              step="1"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-500/30 text-gray-300 bg-transparent"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Game"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
