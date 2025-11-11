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
    console.log('🔧 usePokerContract: walletClient:', walletClient ? 'Connected' : 'Not connected')
    console.log('🔧 usePokerContract: address:', address)

    if (!walletClient) {
      console.log('⚠️ No wallet client - contract not initialized')
      setContract(null)
      setIsInitialized(false)
      return
    }

    const initContract = async () => {
      try {
        console.log('🔧 Initializing contract...')
        // Convert wagmi WalletClient to ethers provider and signer
        const provider = new ethers.BrowserProvider(walletClient as any)
        const signer = await provider.getSigner()

        const pokerContract = new PokerContract(provider, signer)
        console.log('✅ Contract initialized successfully')
        setContract(pokerContract)
        setIsInitialized(true)
      } catch (error) {
        console.error('❌ Failed to initialize contract:', error)
        setContract(null)
        setIsInitialized(false)
      }
    }

    initContract()
  }, [walletClient, address])

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
      console.error('❌ Contract not initialized')
      setError('Contract not initialized')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      console.log('📝 Calling contract.createTable with:', { smallBlind: smallBlind.toString(), bigBlind: bigBlind.toString() })
      const tableId = await contract.createTable(smallBlind, bigBlind)
      console.log('✅ Table created successfully, ID:', tableId)
      return tableId
    } catch (err) {
      console.error('❌ Failed to create table - Full error:', err)
      console.error('❌ Error type:', err?.constructor?.name)
      console.error('❌ Error message:', err instanceof Error ? err.message : String(err))
      if (err && typeof err === 'object' && 'code' in err) {
        console.error('❌ Error code:', (err as any).code)
      }
      if (err && typeof err === 'object' && 'reason' in err) {
        console.error('❌ Error reason:', (err as any).reason)
      }
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

export function useCurrentGasFee() {
  const { contract, isInitialized } = usePokerContract()
  const [gasFee, setGasFee] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contract || !isInitialized) {
      return
    }

    const fetchGasFee = async () => {
      setLoading(true)
      setError(null)
      try {
        const fee = await contract.getCurrentGasFee()
        setGasFee(fee)
      } catch (err) {
        console.error('Failed to fetch gas fee:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch gas fee')
      } finally {
        setLoading(false)
      }
    }

    fetchGasFee()

    // Refresh every 30 seconds to catch gas price changes
    const interval = setInterval(fetchGasFee, 30000)
    return () => clearInterval(interval)
  }, [contract, isInitialized])

  return { gasFee, loading, error }
}

export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEthPrice = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        )
        if (!response.ok) {
          throw new Error('Failed to fetch ETH price')
        }
        const data = await response.json()
        setEthPrice(data.ethereum.usd)
      } catch (err) {
        console.error('Failed to fetch ETH price:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch ETH price')
        // Fallback to approximate price if API fails
        setEthPrice(3000)
      } finally {
        setLoading(false)
      }
    }

    fetchEthPrice()

    // Refresh every 60 seconds
    const interval = setInterval(fetchEthPrice, 60000)
    return () => clearInterval(interval)
  }, [])

  return { ethPrice, loading, error }
}
