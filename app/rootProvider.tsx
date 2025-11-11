"use client";
import { ReactNode } from "react";
import { base, localhost } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { FarcasterSDKInit } from "@/components/farcaster-sdk-init";
import "@coinbase/onchainkit/styles.css";

// Select chain based on environment variable
const getChain = () => {
  const chainEnv = process.env.NEXT_PUBLIC_CHAIN;
  if (chainEnv === "localhost") {
    return localhost;
  }
  return base; // Default to Base mainnet
};

export function RootProvider({ children }: { children: ReactNode }) {
  const chain = getChain();

  console.log("🔗 RootProvider: Using chain:", chain.name, "Chain ID:", chain.id);

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={chain}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      <FarcasterSDKInit />
      {children}
    </OnchainKitProvider>
  );
}
