"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign } from "lucide-react"
import { BettingControls } from "./betting-controls"
import { PokerTableVisualization } from "./poker-table-visualization"

interface GameTableProps {
  gameId: string
  isCreator: boolean
}

interface Player {
  id: string
  name: string
  stack: number
  position: string
  bet: number
  isActive: boolean
  isCurrentPlayer: boolean
  hole?: string[]
}

export function GameTable({ gameId: _gameId, isCreator: _isCreator }: GameTableProps) {
  const [gameStatus, _setGameStatus] = useState<"waiting" | "running" | "completed">("waiting")
  const [gameStage, setGameStage] = useState<"preflop" | "flop" | "turn" | "river" | "showdown">("preflop")
  const [players, setPlayers] = useState<Player[]>([
    {
      id: "1",
      name: "You",
      stack: 1000,
      position: "BTN",
      bet: 0,
      isActive: true,
      isCurrentPlayer: true,
      hole: ["AH", "KS"],
    },
    {
      id: "2",
      name: "Player 2",
      stack: 800,
      position: "SB",
      bet: 50,
      isActive: true,
      isCurrentPlayer: false,
    },
    {
      id: "3",
      name: "Player 3",
      stack: 1200,
      position: "BB",
      bet: 100,
      isActive: true,
      isCurrentPlayer: false,
    },
  ])
  const [pot, setPot] = useState(150)
  const [community, setCommunity] = useState<string[]>([])
  const [turnTimer, _setTurnTimer] = useState(3600)
  const [currentBet, setCurrentBet] = useState(100)

  const handleFold = () => {
    console.log("[v0] Player folded")
    handleNextPlayer()
  }

  const handleCheck = () => {
    console.log("[v0] Player checked")
    handleNextPlayer()
  }

  const handleCall = (amount: number) => {
    console.log("[v0] Player called", amount)
    setPot((prev) => prev + amount)
    handleNextPlayer()
  }

  const handleRaise = (amount: number) => {
    console.log("[v0] Player raised to", amount)
    setPot((prev) => prev + amount)
    setCurrentBet(amount)
    handleNextPlayer()
  }

  const handleNextPlayer = () => {
    // Move to next active player
    setPlayers((prev) => {
      const currentIndex = prev.findIndex((p) => p.isCurrentPlayer)
      const nextIndex = (currentIndex + 1) % prev.length
      return prev.map((p, i) => ({
        ...p,
        isCurrentPlayer: i === nextIndex,
      }))
    })
  }

  const _handleProgressStage = () => {
    switch (gameStage) {
      case "preflop":
        setCommunity(["2H", "3D", "5C"])
        setGameStage("flop")
        break
      case "flop":
        setCommunity((prev) => [...prev, "7S"])
        setGameStage("turn")
        break
      case "turn":
        setCommunity((prev) => [...prev, "KH"])
        setGameStage("river")
        break
      case "river":
        setGameStage("showdown")
        break
    }
    setCurrentBet(0)
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        bet: 0,
      })),
    )
  }

  // Game stage display
  const stageLabels = {
    preflop: "Pre-Flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Table */}
      <div className="lg:col-span-2 space-y-6">
        <PokerTableVisualization players={players} pot={pot} community={community} dealerButton={0} />

        {/* Game Status Bar */}
        <Card className="bg-slate-800 border-purple-500/20 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <Badge className="mt-1 bg-purple-600">{gameStatus.charAt(0).toUpperCase() + gameStatus.slice(1)}</Badge>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Stage</p>
              <p className="text-white font-bold text-lg mt-1">{stageLabels[gameStage]}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Players</p>
              <p className="text-white font-bold text-lg mt-1">{players.filter((p) => p.isActive).length}/6</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Turn Time</p>
              <p className="text-purple-400 font-mono text-lg mt-1">
                {Math.floor(turnTimer / 60)}:{String(turnTimer % 60).padStart(2, "0")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Betting Controls & Info Sidebar */}
      <div className="space-y-4">
        <BettingControls
          playerStack={1000}
          currentBet={currentBet}
          minBet={currentBet === 0 ? 100 : currentBet}
          maxBet={1000}
          onFold={handleFold}
          onCheck={handleCheck}
          onCall={handleCall}
          onRaise={handleRaise}
          isYourTurn={true}
        />

        {/* Game Info */}
        <Card className="bg-slate-800 border-purple-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Texas Hold&apos;em Info
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Buy-in</span>
              <span className="text-white font-medium">$100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Small Blind</span>
              <span className="text-white font-medium">$0.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Big Blind</span>
              <span className="text-white font-medium">$1.00</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-gray-400">Max Players</span>
              <span className="text-white font-medium">6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Game Type</span>
              <span className="text-white font-medium">Cash Game</span>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-purple-600/10 border-purple-500/20 p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Your Stats</h3>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex justify-between">
              <span>Current Stack</span>
              <span className="text-green-400 font-bold">$950</span>
            </div>
            <div className="flex justify-between">
              <span>Total Bets</span>
              <span className="text-yellow-400 font-bold">$50</span>
            </div>
            <div className="flex justify-between">
              <span>Hands Played</span>
              <span className="text-blue-400 font-bold">3</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
