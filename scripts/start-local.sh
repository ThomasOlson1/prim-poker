#!/bin/bash

echo "🚀 Starting Prim Poker locally..."

# Start Hardhat node in background
echo "⛓️  Starting local blockchain..."
npx hardhat node &
HARDHAT_PID=$!
sleep 3

# Deploy contract
echo "📝 Deploying contract..."
npx hardhat run scripts/deploy.ts --network localhost

# Start WebSocket server in background
echo "🔌 Starting WebSocket server..."
cd server
npm run dev &
WS_PID=$!
cd ..

# Start frontend
echo "🌐 Starting frontend..."
npm run dev

# Cleanup on exit
trap "kill $HARDHAT_PID $WS_PID" EXIT
