"use client"

import { useEffect, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Wallet } from "lucide-react"

interface WalletState {
  address: string | null
  balance: string | null
  isConnected: boolean
}

export function WalletManager() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: null,
    isConnected: false,
  })

  useEffect(() => {
    const connectWallet = async () => {
      try {
        // Request wallet connection through Farcaster SDK
        const walletAddress = await sdk.actions.requestAddressSignMessage("Sign in to Poker Dapp")

        if (walletAddress) {
          setWallet({
            address: walletAddress,
            balance: "0.00", // Fetch actual balance from blockchain
            isConnected: true,
          })
        }
      } catch (error) {
        console.error("Wallet connection failed:", error)
      }
    }

    connectWallet()
  }, [])

  return (
    <Card className="bg-slate-800 border-purple-500/20 p-4">
      <div className="flex items-center gap-3">
        <Wallet className="w-5 h-5 text-purple-400" />
        {wallet.isConnected ? (
          <div>
            <p className="text-sm text-gray-400">Connected Wallet</p>
            <p className="text-white font-mono text-sm">
              {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
            </p>
          </div>
        ) : (
          <Button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-700">
            Connect Wallet
          </Button>
        )}
      </div>
    </Card>
  )
}
