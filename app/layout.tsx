import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { NotificationsPanel } from "@/components/notifications-panel"
import './globals.css'

export const metadata: Metadata = {
  title: "Prim's Poker - Turn-Based Cash Games",
  description:
    "Play turn-based Texas Hold'em on Farcaster with variable timing (1 min to 3 hours per turn). Real-time notifications, cash games, and crypto-native gameplay.",
  generator: "v0.app",
  openGraph: {
    title: "Prim's Poker",
    description: "Turn-based Texas Hold'em mini dapp on Farcaster",
    url: "https://poker.farcaster.xyz",
    siteName: "Prim's Poker",
    images: [
      {
        url: "/hero-poker.jpg",
        width: 1200,
        height: 630,
        alt: "Prim's Poker",
      },
    ],
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <NotificationsPanel />
        <Analytics />
      </body>
    </html>
  )
}
