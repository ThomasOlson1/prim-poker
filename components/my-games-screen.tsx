"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MyGame {
  id: string
  name: string
  buyIn: number
  blinds: string
  players: number
  maxPlayers: number
  timeRemaining: string
  myStack: number
}

interface MyGamesScreenProps {
  games: MyGame[]
  onPlayGame: (gameId: string) => void
  onNavigateHome: () => void
}

export function MyGamesScreen({ games = [], onPlayGame, onNavigateHome }: MyGamesScreenProps) {
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">My Games</h1>
          <p className="text-gray-400 text-sm">Your active tables</p>
        </div>

        {/* Games List */}
        {games.length > 0 ? (
          <div className="space-y-3 flex-1">
            {games.map((game) => (
              <Card key={game.id} className="bg-slate-800 border-purple-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{game.name}</h3>
                    <p className="text-xs text-gray-400">Blinds: {game.blinds} ETH</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{game.myStack} ETH</div>
                    <p className="text-xs text-gray-400">your stack</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-300 mb-3">
                  <div>
                    👥 {game.players}/{game.maxPlayers}
                  </div>
                  <div>⏱ {game.timeRemaining}</div>
                </div>

                <Button
                  onClick={() => onPlayGame(game.id)}
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-xs mb-2"
                >
                  Resume Playing
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">No active games</p>
              <p className="text-gray-500 text-xs mb-4">Connect your backend to see your games</p>
              <Button onClick={onNavigateHome} className="bg-purple-600 hover:bg-purple-700 text-xs">
                Browse Games
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-purple-500/20 p-3 flex gap-2 max-w-md mx-auto w-full">
        <Button
          variant="outline"
          className="flex-1 text-gray-300 border-gray-500/30 text-xs bg-transparent"
          onClick={onNavigateHome}
        >
          Home
        </Button>
        <Button variant="ghost" className="flex-1 text-white text-xs" onClick={() => {}}>
          My Games
        </Button>
      </div>
    </div>
  )
}
