"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bell, Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function MiniappSavePrompt() {
  const [isOpen, setIsOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if user has already seen the prompt
    const hasSeenPrompt = localStorage.getItem("miniapp-save-prompt-seen")

    if (!hasSeenPrompt) {
      // Show prompt after a short delay to not overwhelm on first load
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 2000)

      return () => clearTimeout(timer)
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      }

      setDeferredPrompt(null)
    }

    handleDismiss()
  }

  const handleDismiss = () => {
    localStorage.setItem("miniapp-save-prompt-seen", "true")
    setIsOpen(false)
  }

  // Detect if running in standalone mode (already installed)
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Window['navigator'] & { standalone?: boolean }).standalone === true)

  // Don't show if already installed
  if (isStandalone) {
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
            Save Prim&apos;s Poker
          </DialogTitle>
          <DialogDescription className="text-gray-300 space-y-4">
            <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-purple-600 rounded-full p-2 mt-1">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Get Notifications</h3>
                  <p className="text-sm text-gray-300">
                    Receive instant alerts when it&apos;s your turn to play. Never miss a game!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-600 rounded-full p-2 mt-1">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Quick Access</h3>
                  <p className="text-sm text-gray-300">
                    Add to your home screen for instant access to your poker games.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400 bg-slate-800 rounded-lg p-4">
              <p className="font-semibold text-white mb-2">How to save:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>iOS: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></li>
                <li>Android: Tap <strong>Menu</strong> → <strong>Install App</strong></li>
                <li>Farcaster: Save this frame for quick access</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          {deferredPrompt && (
            <Button
              onClick={handleInstall}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              Install Now
            </Button>
          )}
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
