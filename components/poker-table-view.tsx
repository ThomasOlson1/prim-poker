"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useTurnNotifications } from "@/hooks/use-turn-notifications"
import { useGameWebSocket } from "@/hooks/use-game-websocket"
import { useTableInfo, usePlayerInfo, useJoinTable } from "@/hooks/use-poker-contract"
import { useAccount } from "wagmi"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"

export function PokerTableView({
  gameId,
  onLeaveGame,
  onExit,
}: {
  gameId: string
  onLeaveGame: () => void
  onExit: () => void
}) {
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [hasJoined, setHasJoined] = useState(false)

  const { address } = useAccount()
  const { toast } = useToast()

  // Fetch table info from contract
  const { tableInfo, loading: loadingTableInfo } = useTableInfo(gameId)

  // Fetch player info from contract
  const { playerInfo, loading: loadingPlayerInfo } = usePlayerInfo(gameId, address)

  // WebSocket connection for real-time game state
  const { gameState: wsGameState, isMyTurn, isConnected, sendAction } = useGameWebSocket(gameId)

  // Join table hook
  const { joinTable, loading: joiningTable } = useJoinTable()

  // Enable turn notifications
  const { notificationsEnabled, requestNotificationPermission } = useTurnNotifications({
    gameId,
    tableName: `Table #${gameId}`,
    enabled: true,
  })

  // Auto-join table when player info shows they're not seated
  useEffect(() => {
    if (playerInfo && !playerInfo.isSeated && !hasJoined && tableInfo && address) {
      console.log("Player not seated, need to join table")
    }
  }, [playerInfo, hasJoined, tableInfo, address])

  const handleJoinTable = async () => {
    if (!tableInfo || !address) return

    try {
      // Join with minimum buy-in
      const buyIn = tableInfo.minBuyIn
      console.log(`💰 Joining table ${gameId} with ${ethers.formatEther(buyIn)} ETH`)

      const success = await joinTable(gameId, buyIn)

      if (success) {
        setHasJoined(true)
        toast({
          title: "Joined Table!",
          description: `You've joined table ${gameId}`,
        })
      }
    } catch (error) {
      console.error("Failed to join table:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join table",
        variant: "destructive",
      })
    }
  }

  const isLoading = loadingTableInfo || loadingPlayerInfo

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 safe-area-inset items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-lg mb-4">Loading table...</div>
          <div className="text-sm">Fetching data from blockchain...</div>
        </div>
      </div>
    )
  }

  // If player is not seated, show join prompt
  if (playerInfo && !playerInfo.isSeated && tableInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 safe-area-inset items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg border border-purple-500/20 max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Join Table #{gameId}</h2>
          <div className="space-y-2 text-gray-300 mb-6">
            <div>Blinds: {ethers.formatEther(tableInfo.smallBlind)}/{ethers.formatEther(tableInfo.bigBlind)} ETH</div>
            <div>Players: {tableInfo.numPlayers}/9</div>
            <div>Buy-in: {ethers.formatEther(tableInfo.minBuyIn)} ETH</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onExit} variant="outline" className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleJoinTable}
              disabled={joiningTable}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {joiningTable ? "Joining..." : "Join Table"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Create a combined game state from WebSocket data and contract data
  const pot = wsGameState?.pot || (tableInfo ? Number(ethers.formatEther(tableInfo.pot)) : 0)
  const communityCards = wsGameState?.communityCards || []
  const stage = wsGameState?.stage || 'waiting'
  const players = wsGameState?.players ? Object.values(wsGameState.players) : []
  const dealerIndex = wsGameState?.dealerIndex || 0

  // Show waiting screen if no game state yet
  if (!wsGameState && playerInfo?.isSeated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 safe-area-inset items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-lg mb-4">Waiting for game to start...</div>
          <div className="text-sm">WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</div>
          {players.length < 2 && <div className="text-sm mt-2">Waiting for more players...</div>}
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
    if (playerIndex === dealerIndex) {
      return (
        <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          D
        </span>
      )
    }
    // SB and BB positions calculated from dealer (for now, simplified)
    const sbIndex = (dealerIndex + 1) % 9
    const bbIndex = (dealerIndex + 2) % 9
    if (playerIndex === sbIndex) {
      return (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          SB
        </span>
      )
    }
    if (playerIndex === bbIndex) {
      return (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          BB
        </span>
      )
    }
    return null
  }

  const handleCall = () => {
    if (!isMyTurn) {
      toast({
        title: "Not Your Turn",
        description: "Please wait for your turn to act",
        variant: "destructive",
      })
      return
    }

    // Check if there's a bet to call
    const currentBet = wsGameState?.players[address!]?.bet || 0
    const highestBet = Math.max(...Object.values(wsGameState?.players || {}).map(p => p.bet))

    if (highestBet > currentBet) {
      // There's a bet to call
      const callAmount = highestBet - currentBet
      console.log("📞 Calling bet of:", callAmount)
      sendAction('call', callAmount)
    } else {
      // No bet, so check
      console.log("✓ Checking")
      sendAction('check')
    }
    setSelectedBet(null)
  }

  const handleRaise = () => {
    if (!isMyTurn) {
      toast({
        title: "Not Your Turn",
        description: "Please wait for your turn to act",
        variant: "destructive",
      })
      return
    }

    if (!selectedBet || selectedBet <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please select a bet amount",
        variant: "destructive",
      })
      return
    }

    console.log("📈 Raising to:", selectedBet)
    sendAction('raise', selectedBet)
    setSelectedBet(null)
  }

  const handleFold = () => {
    if (!isMyTurn) {
      toast({
        title: "Not Your Turn",
        description: "Please wait for your turn to act",
        variant: "destructive",
      })
      return
    }

    console.log("🚫 Folding")
    sendAction('fold')
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
          <div>⏱ {isMyTurn ? '30s' : '--'}</div>
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
              {communityCards.map((card, idx) => (
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
            <div className="text-2xl font-bold text-amber-400">{pot.toFixed(4)} ETH</div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {players.map((player, idx) => (
              <div key={player.address} className="relative bg-slate-800/50 border border-purple-500/20 rounded-lg p-2">
                {/* Position Badge */}
                {renderPositionBadge(idx)}

                <div className="flex items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border flex-shrink-0 ${
                      wsGameState?.currentPlayer === player.address
                        ? "border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400/50"
                        : player.folded
                          ? "border-gray-600 bg-gray-600/10 opacity-50"
                          : "border-purple-400 bg-purple-400/10"
                    }`}
                  >
                    {player.address.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {player.address === address ? 'You' : `${player.address.slice(0, 6)}...${player.address.slice(-4)}`}
                    </div>
                    <div className="text-xs text-amber-400">{player.stack} ETH</div>
                  </div>
                </div>
                {player.bet > 0 && <div className="text-xs text-red-400 font-bold mt-1">Bet: {player.bet} ETH</div>}
                {player.address === address && (
                  <div className="text-xs text-blue-400 mt-1">Your seat</div>
                )}
                {player.folded && (
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
            <div className="text-sm font-semibold text-purple-400">{stage.toUpperCase()}</div>
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
