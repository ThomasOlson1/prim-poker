#!/bin/bash

echo "🎴 Setting up Prim Poker..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your configuration"
else
    echo "✅ .env file already exists"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Compile contracts
echo "🔨 Compiling smart contracts..."
npx hardhat compile

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your configuration"
echo "2. Deploy contract: npx hardhat run scripts/deploy.ts --network localhost"
echo "3. Start WebSocket server: cd server && npm run dev"
echo "4. Start frontend: npm run dev"
echo ""
echo "For more info, see README.md"
