"use client"

import { useState } from "react"
import { PokerTableView } from "./poker-table-view"
import { GameLobby } from "./game-lobby"
import { MyGamesScreen } from "./my-games-screen"
import { CreateGameModal } from "./create-game-modal"
import { useCreateTable, useEthPrice } from "@/hooks/use-poker-contract"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"

type Screen = "home" | "game" | "myGames"

export function PokerGameApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { createTable, loading: creatingTable } = useCreateTable()
  const { ethPrice } = useEthPrice()
  const { toast } = useToast()

  const handlePlayGame = (gameId: string) => {
    setSelectedGameId(gameId)
    setCurrentScreen("game")
  }

  const handleCreateGame = async (gameData: {
    name: string
    buyInDollars: number
    blindLevel: string
    turnTimeMinutes: number
    maxPlayers: number
  }) => {
    try {
      // Check if contract address is configured
      const contractAddress = process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS
      if (!contractAddress) {
        toast({
          title: "⚠️ Setup Required",
          description: "Contract not deployed. Please check the console or QUICKSTART guide for setup instructions.",
          variant: "destructive",
          duration: 8000,
        })
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.error("❌ CONTRACT NOT CONFIGURED")
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.error("")
        console.error("To fix this, you need to:")
        console.error("1. Deploy the contract (see QUICKSTART_TESTNET.md)")
        console.error("2. Create .env.local file with:")
        console.error("   NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=<your_contract_address>")
        console.error("")
        console.error("Quick setup:")
        console.error("  npm run deploy:base-sepolia")
        console.error("")
        console.error("Then copy the contract address to .env.local")
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        throw new Error(
          "Contract address not configured. Please set NEXT_PUBLIC_POKER_CONTRACT_ADDRESS in .env.local"
        )
      }

      if (!ethPrice) {
        throw new Error("ETH price not loaded. Please wait a moment and try again.")
      }

      // Parse blinds (e.g., "0.5/1" -> smallBlind: $0.5, bigBlind: $1)
      const [smallBlindUsd, bigBlindUsd] = gameData.blindLevel.split("/").map(s => parseFloat(s.trim()))

      // Convert USD to ETH
      const smallBlindEth = smallBlindUsd / ethPrice
      const bigBlindEth = bigBlindUsd / ethPrice
      const buyInEth = gameData.buyInDollars / ethPrice

      // Convert to Wei (smallest ETH unit)
      const smallBlind = ethers.parseEther(smallBlindEth.toString())
      const bigBlind = ethers.parseEther(bigBlindEth.toString())

      console.log("🎲 Creating table on contract...")
      console.log(`   Blinds: $${smallBlindUsd}/$${bigBlindUsd} (${smallBlindEth.toFixed(6)}/${bigBlindEth.toFixed(6)} ETH)`)
      console.log(`   Buy-in: $${gameData.buyInDollars} (${buyInEth.toFixed(6)} ETH)`)

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
