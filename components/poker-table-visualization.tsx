"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Zap } from "lucide-react"

interface Player {
  id: string
  name: string
  stack: number
  position: string
  hole?: string[] // e.g., ['AH', 'KS']
  bet: number
  isActive: boolean
  isCurrentPlayer: boolean
}

interface PokerTableVisualizationProps {
  players: Player[]
  pot: number
  community: string[]
  dealerButton: number
}

export function PokerTableVisualization({ players, pot, community, dealerButton: _dealerButton }: PokerTableVisualizationProps) {
  const _positions = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP"]

  return (
    <Card className="bg-gradient-to-br from-green-900/20 to-slate-900/20 border-green-700/30 p-8 aspect-video">
      <div className="h-full flex flex-col">
        {/* Pot Display */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-1">Pot</p>
          <p className="text-4xl font-bold text-yellow-400">${pot}</p>
        </div>

        {/* Community Cards */}
        {community.length > 0 && (
          <div className="flex justify-center gap-2 mb-8">
            {community.map((card, idx) => (
              <div
                key={idx}
                className="w-12 h-16 bg-white rounded border-2 border-gray-300 flex items-center justify-center font-bold text-sm"
              >
                {card}
              </div>
            ))}
          </div>
        )}

        {/* Players at Table */}
        <div className="flex-1 flex items-center justify-around">
          {players.map((player, _idx) => (
            <div
              key={player.id}
              className={`flex flex-col items-center gap-2 transition-all ${
                player.isCurrentPlayer ? "ring-2 ring-yellow-400 p-2 rounded" : ""
              }`}
            >
              {/* Player Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>

              {/* Player Name & Position */}
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{player.name}</p>
                <Badge variant="outline" className="text-xs">
                  {player.position}
                </Badge>
              </div>

              {/* Stack */}
              <p className="text-xs text-gray-400">Stack: ${player.stack}</p>

              {/* Current Bet */}
              {player.bet > 0 && <div className="text-sm font-bold text-yellow-400">Bet: ${player.bet}</div>}

              {/* Status */}
              {player.isCurrentPlayer && (
                <div className="flex items-center gap-1 text-xs text-yellow-400 font-semibold animate-pulse">
                  <Zap className="w-3 h-3" />
                  Acting
                </div>
              )}

              {!player.isActive && (
                <Badge variant="secondary" className="text-xs bg-red-600">
                  Folded
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
