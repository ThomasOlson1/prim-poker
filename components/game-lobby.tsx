"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet'
import { Address, Avatar, Name, Identity } from '@coinbase/onchainkit/identity'
import { useCurrentGasFee, useEthPrice } from '@/hooks/use-poker-contract'
import { ethers } from 'ethers'

interface GameLobbyProps {
  games?: Array<{
    id: string
    name: string
    buyIn: number
    blinds: string
    players: number
    maxPlayers: number
    avgPot: number
  }>
  onPlayGame: (gameId: string) => void
  onNavigateToMyGames: () => void
  onCreateGame: () => void
}

export function GameLobby({ games = [], onPlayGame, onNavigateToMyGames, onCreateGame }: GameLobbyProps) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const { gasFee } = useCurrentGasFee()
  const { ethPrice } = useEthPrice()

  const handleJoinGame = (gameId: string) => {
    setSelectedGameId(gameId)
    setIsJoining(true)
    setTimeout(() => {
      onPlayGame(gameId)
      setIsJoining(false)
    }, 500)
  }

  // Format gas fee for display
  const formatGasFee = () => {
    if (!gasFee || !ethPrice) return 'Loading...' // Loading state
    try {
      const ethAmount = ethers.formatEther(gasFee)
      const dollarAmount = parseFloat(ethAmount) * ethPrice
      return `$${dollarAmount.toFixed(2)}`
    } catch {
      return 'Error' // Fallback on error
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl">♠</span>
            <h1 className="text-3xl font-bold text-white">Prim&apos;s Poker</h1>
          </div>
          <p className="text-gray-400 text-sm">Texas Hold&apos;em Cash Games</p>
        </div>

        <div className="bg-amber-900/40 border border-amber-600/50 rounded-lg p-3 mb-6 text-center">
          <div className="text-xs text-amber-200 font-semibold">Dynamic Gas-Based Rake</div>
          <div className="text-sm text-amber-100 mt-1">{formatGasFee()} per hand (adjusts with network fees)</div>
        </div>

        {/* Wallet Connection */}
        <div className="bg-slate-800 border border-purple-500/20 rounded-lg p-4 mb-6">
          <Wallet>
            <ConnectWallet className="w-full">
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
              </Identity>
              <WalletDropdownBasename />
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>

        {/* Create Game Button */}
        <Button onClick={onCreateGame} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold mb-4">
          + Create New Game
        </Button>

        {/* Games List */}
        <div className="space-y-3 mb-6 flex-1">
          <h2 className="text-sm font-semibold text-white px-2">Available Games</h2>
          {games.length > 0 ? (
            games.map((game) => (
              <Card
                key={game.id}
                className="bg-slate-800 border-purple-500/20 p-4 cursor-pointer hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{game.name}</h3>
                    <p className="text-xs text-gray-400">Blinds: ${game.blinds}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-400">${game.buyIn}</div>
                    <p className="text-xs text-gray-400">buy-in</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-300 mb-3">
                  <div>
                    👥 {game.players}/{game.maxPlayers}
                  </div>
                  <div>📈 Avg Pot: ${game.avgPot}</div>
                </div>

                <Button
                  onClick={() => handleJoinGame(game.id)}
                  disabled={isJoining && selectedGameId === game.id}
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-xs"
                >
                  {isJoining && selectedGameId === game.id ? "Joining..." : "Join Game"}
                </Button>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No games available</p>
              <p className="text-gray-500 text-xs mt-2">Connect your backend to load games</p>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-purple-500/10">
          <div className="text-xs text-gray-400">
            <div className="font-semibold text-purple-300 mb-2">Lobby Stats</div>
            <div className="space-y-1">
              <div>💰 Total Volume: TBD</div>
              <div>👥 Active Players: TBD</div>
              <div>⚡ Games Running: TBD</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-purple-500/20 p-3 flex gap-2 max-w-md mx-auto w-full">
        <Button variant="ghost" className="flex-1 text-white text-xs" onClick={() => {}}>
          Home
        </Button>
        <Button
          variant="outline"
          className="flex-1 text-gray-300 border-gray-500/30 text-xs bg-transparent"
          onClick={onNavigateToMyGames}
        >
          My Games
        </Button>
      </div>
    </div>
  )
}
