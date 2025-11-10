"use client"

import { useState } from "react"
import { PokerTableView } from "./poker-table-view"
import { GameLobby } from "./game-lobby"
import { MyGamesScreen } from "./my-games-screen"
import { CreateGameModal } from "./create-game-modal"
import { useCreateTable } from "@/hooks/use-poker-contract"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"

type Screen = "home" | "game" | "myGames"

export function PokerGameApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { createTable, loading: creatingTable } = useCreateTable()
  const { toast } = useToast()

  const handlePlayGame = (gameId: string) => {
    setSelectedGameId(gameId)
    setCurrentScreen("game")
  }

  const handleCreateGame = async (gameData: {
    name: string
    buyInEth: number
    blindLevel: string
    turnTimeMinutes: number
    maxPlayers: number
  }) => {
    try {
      // Parse blinds (e.g., "0.5/1" -> smallBlind: 0.5, bigBlind: 1)
      const [smallBlindStr, bigBlindStr] = gameData.blindLevel.split("/")
      const smallBlind = ethers.parseEther(smallBlindStr.trim())
      const bigBlind = ethers.parseEther(bigBlindStr.trim())

      console.log("🎲 Creating table on contract...")
      console.log(`   Blinds: ${smallBlindStr}/${bigBlindStr} ETH`)

      // Call smart contract to create table
      const tableId = await createTable(smallBlind, bigBlind)

      if (tableId) {
        console.log(`✅ Table created with ID: ${tableId}`)

        toast({
          title: "Table Created!",
          description: `Table ${tableId} created successfully. You can now join it.`,
        })

        setShowCreateModal(false)
        setSelectedGameId(tableId)
        setCurrentScreen("game")
      } else {
        throw new Error("Failed to create table")
      }
    } catch (error) {
      console.error("Failed to create table:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create table",
        variant: "destructive",
      })
    }
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
        <MyGamesScreen games={[]} onPlayGame={handlePlayGame} onNavigateHome={() => setCurrentScreen("home")} />
      ) : (
        <GameLobby
          onPlayGame={handlePlayGame}
          onNavigateToMyGames={() => setCurrentScreen("myGames")}
          onCreateGame={() => setShowCreateModal(true)}
        />
      )}

      {showCreateModal && (
        <CreateGameModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGame}
          loading={creatingTable}
        />
      )}
    </>
  )
}
