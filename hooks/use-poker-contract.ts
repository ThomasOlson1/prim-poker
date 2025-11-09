"use client"

import { useEffect, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { PokerContract, TableInfo, PlayerInfo } from '@/lib/contracts/poker-contract'
import { ethers } from 'ethers'

export function usePokerContract() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [contract, setContract] = useState<PokerContract | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!walletClient) {
      setContract(null)
      setIsInitialized(false)
      return
    }

    const initContract = async () => {
      try {
        // Convert wagmi WalletClient to ethers provider and signer
        const provider = new ethers.BrowserProvider(walletClient as any)
        const signer = await provider.getSigner()

        const pokerContract = new PokerContract(provider, signer)
        setContract(pokerContract)
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize contract:', error)
        setContract(null)
        setIsInitialized(false)
      }
    }

    initContract()
  }, [walletClient])

  return {
    contract,
    isInitialized,
    address,
  }
}

export function useTableInfo(tableId: string | null) {
  const { contract, isInitialized } = usePokerContract()
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contract || !isInitialized || !tableId) {
      return
    }

    const fetchTableInfo = async () => {
      setLoading(true)
      setError(null)
      try {
        const info = await contract.getTableInfo(tableId)
        setTableInfo(info)
      } catch (err) {
        console.error('Failed to fetch table info:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch table info')
      } finally {
        setLoading(false)
      }
    }

    fetchTableInfo()

    // Refresh every 10 seconds
    const interval = setInterval(fetchTableInfo, 10000)
    return () => clearInterval(interval)
  }, [contract, isInitialized, tableId])

  return { tableInfo, loading, error }
}

export function usePlayerInfo(tableId: string | null, playerAddress: string | undefined) {
  const { contract, isInitialized } = usePokerContract()
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contract || !isInitialized || !tableId || !playerAddress) {
      return
    }

    const fetchPlayerInfo = async () => {
      setLoading(true)
      setError(null)
      try {
        const info = await contract.getPlayerInfo(tableId, playerAddress)
        setPlayerInfo(info)
      } catch (err) {
        console.error('Failed to fetch player info:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch player info')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerInfo()

    // Refresh every 5 seconds
    const interval = setInterval(fetchPlayerInfo, 5000)
    return () => clearInterval(interval)
  }, [contract, isInitialized, tableId, playerAddress])

  return { playerInfo, loading, error }
}

export function useCreateTable() {
  const { contract } = usePokerContract()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTable = async (smallBlind: bigint, bigBlind: bigint): Promise<string | null> => {
    if (!contract) {
      setError('Contract not initialized')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const tableId = await contract.createTable(smallBlind, bigBlind)
      return tableId
    } catch (err) {
      console.error('Failed to create table:', err)
      setError(err instanceof Error ? err.message : 'Failed to create table')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createTable, loading, error }
}

export function useJoinTable() {
  const { contract } = usePokerContract()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const joinTable = async (tableId: string, buyIn: bigint): Promise<boolean> => {
    if (!contract) {
      setError('Contract not initialized')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      await contract.joinTable(tableId, buyIn)
      return true
    } catch (err) {
      console.error('Failed to join table:', err)
      setError(err instanceof Error ? err.message : 'Failed to join table')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { joinTable, loading, error }
}
