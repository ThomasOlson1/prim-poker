"use client"

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { usePokerContract, useEthPrice } from './use-poker-contract'
import { ethers } from 'ethers'

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

export function usePlayerGames() {
  const { contract, isInitialized } = usePokerContract()
  const { address } = useAccount()
  const { ethPrice } = useEthPrice()
  const [games, setGames] = useState<MyGame[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contract || !isInitialized || !address) {
      setGames([])
      return
    }

    const fetchPlayerGames = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get all active tables
        const activeTables = await contract.getAllActiveTables()

        // Filter for tables where this player is seated
        const playerGames: MyGame[] = []

        for (const table of activeTables) {
          try {
            const playerInfo = await contract.getPlayerInfo(table.tableId.toString(), address)

            // Only include tables where player is seated
            if (playerInfo.isSeated) {
              const smallBlindEth = Number(ethers.formatEther(table.tableInfo.smallBlind))
              const bigBlindEth = Number(ethers.formatEther(table.tableInfo.bigBlind))
              const buyInEth = Number(ethers.formatEther(table.tableInfo.minBuyIn))
              const myStackEth = Number(ethers.formatEther(playerInfo.chips))

              const smallBlindUsd = ethPrice ? smallBlindEth * ethPrice : smallBlindEth * 3000
              const bigBlindUsd = ethPrice ? bigBlindEth * ethPrice : bigBlindEth * 3000
              const buyInUsd = ethPrice ? buyInEth * ethPrice : buyInEth * 3000
              const myStackUsd = ethPrice ? myStackEth * ethPrice : myStackEth * 3000

              playerGames.push({
                id: table.tableId.toString(),
                name: `Table #${table.tableId}`,
                buyIn: Math.round(buyInUsd),
                blinds: `${smallBlindUsd.toFixed(2)}/${bigBlindUsd.toFixed(2)}`,
                players: table.tableInfo.numPlayers,
                maxPlayers: 9,
                timeRemaining: 'Active', // TODO: Calculate from WebSocket game state
                myStack: Math.round(myStackUsd),
              })
            }
          } catch (err) {
            console.error(`Failed to fetch player info for table ${table.tableId}:`, err)
            // Continue with other tables even if one fails
          }
        }

        setGames(playerGames)
      } catch (err) {
        console.error('Failed to fetch player games:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch player games')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerGames()

    // Refresh every 10 seconds to stay in sync
    const interval = setInterval(fetchPlayerGames, 10000)
    return () => clearInterval(interval)
  }, [contract, isInitialized, address, ethPrice])

  return { games, loading, error }
}
