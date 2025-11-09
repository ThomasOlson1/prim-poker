"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, TrendingUp } from "lucide-react"

interface GameCardProps {
  game: {
    id: string
    name: string
    buyIn: number
    blinds: string
    players: number
    maxPlayers: number
    status: "waiting" | "running" | "finishing"
    avgPot: number
    speed: "slow" | "medium" | "fast"
    minStack: number
  }
  onJoin: (gameId: string) => void
  onWatch: (gameId: string) => void
}

export function GameCard({ game, onJoin, onWatch }: GameCardProps) {
  const isFull = game.players >= game.maxPlayers
  const isRunning = game.status === "running"

  return (
    <Card className="bg-slate-800 border-purple-500/20 hover:border-purple-500/50 transition-all hover:shadow-lg p-6 cursor-pointer group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">{game.name}</h3>
          <p className="text-xs text-gray-500 mt-1">Game #{game.id}</p>
        </div>
        <Badge
          className={`${
            game.status === "waiting" ? "bg-yellow-600" : game.status === "running" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {game.status === "waiting" ? "Waiting" : game.status === "running" ? "Running" : "Finishing"}
        </Badge>
      </div>

      {/* Game Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Buy-in */}
        <div className="bg-slate-700/50 rounded p-2">
          <p className="text-xs text-gray-400">Buy-in</p>
          <p className="text-lg font-bold text-purple-400">${game.buyIn}</p>
        </div>

        {/* Blinds */}
        <div className="bg-slate-700/50 rounded p-2">
          <p className="text-xs text-gray-400">Blinds</p>
          <p className="text-sm font-mono text-white">{game.blinds}</p>
        </div>

        {/* Speed */}
        <div className="bg-slate-700/50 rounded p-2">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Speed
          </p>
          <p className="text-sm font-semibold text-white capitalize">{game.speed}</p>
        </div>

        {/* Avg Pot */}
        <div className="bg-slate-700/50 rounded p-2">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Avg Pot
          </p>
          <p className="text-lg font-bold text-yellow-400">${game.avgPot}</p>
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between mb-4 p-2 bg-slate-700/30 rounded">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-white">
            {game.players}/{game.maxPlayers} players
          </span>
        </div>
        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-purple-600" style={{ width: `${(game.players / game.maxPlayers) * 100}%` }} />
        </div>
      </div>

      {/* Minimum Stack Info */}
      <p className="text-xs text-gray-500 mb-4">Min stack: ${game.minStack}</p>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isRunning ? (
          <Button
            onClick={() => onWatch(game.id)}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
            size="sm"
          >
            Watch
          </Button>
        ) : (
          <Button
            onClick={() => onJoin(game.id)}
            disabled={isFull}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            size="sm"
          >
            {isFull ? "Table Full" : "Join Game"}
          </Button>
        )}
      </div>
    </Card>
  )
}
