"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useTurnNotifications } from "@/hooks/use-turn-notifications"

interface Player {
  id: string
  name: string
  avatar: string
  stack: number
  bet: number
  hole: [string, string] | null
  position: number
  isActive: boolean
  isFolded: boolean
}

interface GameState {
  id: string
  pot: number
  communityCards: string[]
  street: "preflop" | "flop" | "turn" | "river" | "showdown"
  players: Player[]
  activePlayerIndex: number
  timeLeft: number
  myStack: number
  myHole: [string, string]
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
}

export function PokerTableView({
  gameId,
  onLeaveGame,
  onExit,
  gameState,
}: {
  gameId: string
  onLeaveGame: () => void
  onExit: () => void
  gameState?: GameState | null
}) {
  const [selectedBet, setSelectedBet] = useState<number | null>(null)

  // Enable turn notifications
  const { notificationsEnabled, requestNotificationPermission } = useTurnNotifications({
    gameId,
    tableName: `Table #${gameId}`,
    enabled: true,
  })

  if (!gameState) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 safe-area-inset items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-lg mb-4">Loading game...</div>
          <div className="text-sm">Connect your backend to load game data</div>
        </div>
      </div>
    )
  }

  const renderCard = (card: string) => {
    if (!card) return "?"
    const suit = card.slice(-1)
    const rank = card.slice(0, -1)
    const suitSymbols: { [key: string]: string } = {
      S: "♠",
      H: "♥",
      D: "♦",
      C: "♣",
    }
    return `${rank}${suitSymbols[suit] || suit}`
  }

  const renderPositionBadge = (playerIndex: number) => {
    if (playerIndex === gameState.dealerIndex) {
      return (
        <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          D
        </span>
      )
    }
    if (playerIndex === gameState.smallBlindIndex) {
      return (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          SB
        </span>
      )
    }
    if (playerIndex === gameState.bigBlindIndex) {
      return (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          BB
        </span>
      )
    }
    return null
  }

  const handleCall = () => {
    console.log("[v0] Call/Check action triggered")
    setSelectedBet(null)
  }

  const handleRaise = () => {
    console.log("[v0] Raise action triggered with bet:", selectedBet)
    setSelectedBet(null)
  }

  const handleFold = () => {
    console.log("[v0] Fold action triggered")
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 safe-area-inset">
      <div className="sticky top-0 bg-gradient-to-b from-slate-900 to-transparent p-3 flex items-center justify-between border-b border-purple-500/20 z-10">
        <div className="flex gap-2">
          <Button
            onClick={onLeaveGame}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 text-xs h-8"
          >
            Leave Table
          </Button>
          <Button onClick={onExit} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300 text-xs h-8">
            Exit
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          {!notificationsEnabled && (
            <Button
              onClick={requestNotificationPermission}
              variant="ghost"
              size="sm"
              className="text-yellow-400 hover:text-yellow-300 text-xs h-8"
              title="Enable turn notifications"
            >
              🔔
            </Button>
          )}
          <div>👥 6P</div>
          <div>⏱ {gameState.timeLeft}s</div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-4 pb-40 md:pb-8">
        {/* Poker Table - Responsive */}
        <div className="w-full max-w-sm mx-auto">
          {/* Community Cards */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 text-center mb-2">Community Cards</div>
            <div className="flex justify-center gap-1">
              {gameState.communityCards.map((card, idx) => (
                <div
                  key={idx}
                  className="w-10 h-14 bg-white rounded border border-gray-800 flex items-center justify-center text-xs font-bold text-black"
                >
                  {renderCard(card)}
                </div>
              ))}
              <div className="w-10 h-14 bg-gradient-to-br from-gray-400 to-gray-600 rounded border border-gray-800 flex items-center justify-center text-sm font-bold text-gray-800">
                ?
              </div>
            </div>
          </div>

          {/* Pot Display */}
          <div className="bg-green-900/50 rounded-lg p-3 mb-4 text-center border border-green-700/30">
            <div className="text-xs text-gray-300 mb-1">Current Pot</div>
            <div className="text-2xl font-bold text-amber-400">${gameState.pot}</div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {gameState.players.map((player) => (
              <div key={player.id} className="relative bg-slate-800/50 border border-purple-500/20 rounded-lg p-2">
                {/* Position Badge */}
                {renderPositionBadge(player.position)}

                <div className="flex items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border flex-shrink-0 ${
                      player.isActive
                        ? "border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400/50"
                        : player.isFolded
                          ? "border-gray-600 bg-gray-600/10 opacity-50"
                          : "border-purple-400 bg-purple-400/10"
                    }`}
                  >
                    {player.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{player.name}</div>
                    <div className="text-xs text-amber-400">${player.stack}</div>
                  </div>
                </div>
                {player.bet > 0 && <div className="text-xs text-red-400 font-bold mt-1">Bet: ${player.bet}</div>}
                {player.id === "p1" && player.hole && (
                  <div className="flex gap-1 mt-2">
                    {player.hole.map((card, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-8 bg-white rounded border border-gray-800 flex items-center justify-center text-xs font-bold text-black"
                      >
                        {renderCard(card)}
                      </div>
                    ))}
                  </div>
                )}
                {player.isFolded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <span className="text-xs font-bold text-gray-400">FOLDED</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Game Status */}
          <div className="text-center mb-4">
            <div className="text-xs text-gray-400 mb-1">$1/$2 Blinds</div>
            <div className="text-sm font-semibold text-purple-400">{gameState.street.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent p-3 border-t border-purple-500/20 safe-area-inset-bottom">
        <div className="max-w-sm mx-auto space-y-2">
          {/* Bet Slider */}
          <div className="bg-slate-700/50 rounded px-3 py-2">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-gray-300">Bet Amount</label>
              <span className="text-sm font-bold text-amber-400">${selectedBet || 0}</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={selectedBet || 0}
              onChange={(e) => setSelectedBet(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              onClick={handleFold}
              variant="outline"
              className="text-red-500 border-red-500/50 hover:bg-red-500/10 bg-transparent text-xs h-10 font-semibold"
            >
              Fold
            </Button>
            <Button
              onClick={handleCall}
              variant="outline"
              className="text-blue-400 border-blue-500/50 hover:bg-blue-500/10 bg-transparent text-xs h-10 font-semibold"
            >
              Call/Check
            </Button>
            <Button onClick={handleRaise} className="bg-green-600 hover:bg-green-700 text-xs h-10 font-semibold">
              Raise
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
