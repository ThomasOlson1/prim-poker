"use client"

import { useState } from "react"
import { PokerTableView } from "./poker-table-view"
import { GameLobby } from "./game-lobby"
import { MyGamesScreen } from "./my-games-screen"
import { CreateGameModal } from "./create-game-modal"

type Screen = "home" | "game" | "myGames"

export function PokerGameApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [myGames, setMyGames] = useState([
    {
      id: "my1",
      name: "My Stakes Game",
      buyIn: 50,
      blinds: "0.5/1",
      players: 4,
      maxPlayers: 6,
      timeRemaining: "2h 15m",
      myStack: 450,
    },
  ])

  const handlePlayGame = (gameId: string) => {
    setSelectedGameId(gameId)
    setCurrentScreen("game")
  }

  const handleCreateGame = (gameData: {
    name: string
    buyInEth: number
    blindLevel: string
    turnTimeMinutes: number
    maxPlayers: number
  }) => {
    const newGame = {
      id: `game-${Date.now()}`,
      name: gameData.name,
      buyIn: gameData.buyInEth,
      blinds: gameData.blindLevel,
      players: 1,
      maxPlayers: gameData.maxPlayers,
      timeRemaining: "Just started",
      myStack: gameData.buyInEth,
    }
    setMyGames([newGame, ...myGames])
    setShowCreateModal(false)
    setSelectedGameId(newGame.id)
    setCurrentScreen("game")
  }

  const handleLeaveGame = () => {
    setCurrentScreen("home")
    setSelectedGameId(null)
  }

  return (
    <>
      {currentScreen === "game" && selectedGameId ? (
        <PokerTableView gameId={selectedGameId} onLeaveGame={handleLeaveGame} onExit={handleLeaveGame} />
      ) : currentScreen === "myGames" ? (
        <MyGamesScreen games={myGames} onPlayGame={handlePlayGame} onNavigateHome={() => setCurrentScreen("home")} />
      ) : (
        <GameLobby
          onPlayGame={handlePlayGame}
          onNavigateToMyGames={() => setCurrentScreen("myGames")}
          onCreateGame={() => setShowCreateModal(true)}
        />
      )}

      {showCreateModal && <CreateGameModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateGame} />}
    </>
  )
}
