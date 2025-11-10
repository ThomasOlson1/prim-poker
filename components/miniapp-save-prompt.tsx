"use client"

import { useEffect, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bell, Star, X } from "lucide-react"

export function MiniappSavePrompt() {
  const [isOpen, setIsOpen] = useState(false)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    // Check if running in Farcaster miniapp
    sdk.isInMiniApp().then(inMiniApp => {
      setIsInMiniApp(inMiniApp)

      if (!inMiniApp) return

      // Check if user has already seen the prompt
      const hasSeenPrompt = localStorage.getItem("miniapp-add-prompt-seen")

      if (!hasSeenPrompt) {
        // Show prompt after a short delay
        const timer = setTimeout(() => {
          setIsOpen(true)
        }, 3000)

        return () => clearTimeout(timer)
      }
    })

    // Listen for miniAppAdded event (user successfully added the miniapp)
    const handleMiniAppAdded = () => {
      console.log('Mini app added!')
      localStorage.setItem("miniapp-add-prompt-seen", "true")
      setIsOpen(false)
    }

    // Listen for miniAppAddRejected event
    const handleMiniAppAddRejected = ({ reason }: { reason: string }) => {
      console.log('Mini app add rejected:', reason)
      setIsAdding(false)
    }

    sdk.on('miniAppAdded', handleMiniAppAdded)
    sdk.on('miniAppAddRejected', handleMiniAppAddRejected)

    return () => {
      sdk.off('miniAppAdded', handleMiniAppAdded)
      sdk.off('miniAppAddRejected', handleMiniAppAddRejected)
    }
  }, [])

  const handleAddMiniApp = async () => {
    setIsAdding(true)
    try {
      // This triggers the native Farcaster "Add Mini App" dialog
      await sdk.actions.addFrame()
      // Note: Don't close here - wait for the miniAppAdded event
    } catch (error) {
      console.error('Failed to add miniapp:', error)
      setIsAdding(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem("miniapp-add-prompt-seen", "true")
    setIsOpen(false)
  }

  // Only show if in Farcaster miniapp
  if (!isInMiniApp) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-purple-500/30 text-white">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2 flex items-center justify-center gap-2">
            <span className="text-3xl">♠</span>
            Add Prim&apos;s Poker
          </DialogTitle>
          <DialogDescription className="text-gray-300 space-y-4">
            <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-purple-600 rounded-full p-2 mt-1">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Turn Notifications</h3>
                  <p className="text-sm text-gray-300">
                    Get notified when it&apos;s your turn to act. Never miss a hand!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-600 rounded-full p-2 mt-1">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Quick Access</h3>
                  <p className="text-sm text-gray-300">
                    Add to your Farcaster mini apps for easy access to your games.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400 bg-slate-800 rounded-lg p-4">
              <p className="text-white mb-1">
                Adding this mini app will enable notifications so you never miss your turn in a poker hand.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={handleAddMiniApp}
            disabled={isAdding}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
          >
            {isAdding ? 'Adding...' : 'Add Mini App'}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-slate-800"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
