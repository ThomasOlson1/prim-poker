const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment configuration...\n');

// Load .env file
require('dotenv').config();

const checks = {
  '✅ PRIVATE_KEY': !!process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length > 60,
  '✅ BASESCAN_API_KEY': !!process.env.BASESCAN_API_KEY && process.env.BASESCAN_API_KEY.length > 20,
  '✅ VRF_SUBSCRIPTION_ID': !!process.env.VRF_SUBSCRIPTION_ID && !isNaN(process.env.VRF_SUBSCRIPTION_ID),
  '✅ VRF_COORDINATOR': process.env.VRF_COORDINATOR === '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  '✅ VRF_KEY_HASH': !!process.env.VRF_KEY_HASH && process.env.VRF_KEY_HASH.startsWith('0x'),
  '✅ LINK_ETH_PRICE_FEED': process.env.LINK_ETH_PRICE_FEED === '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61',
};

let allGood = true;

for (const [check, passed] of Object.entries(checks)) {
  if (passed) {
    console.log(check);
  } else {
    console.log(check.replace('✅', '❌'));
    allGood = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('🎉 All required variables configured!');
  console.log('✅ Ready to deploy to Base Sepolia testnet\n');
  process.exit(0);
} else {
  console.log('⚠️  Some required variables are missing');
  console.log('Please fill out your .env file with the missing values\n');
  console.log('Required:');
  console.log('  - PRIVATE_KEY (from MetaMask)');
  console.log('  - BASESCAN_API_KEY (from basescan.org)');
  console.log('  - VRF_SUBSCRIPTION_ID (from vrf.chain.link)\n');
  process.exit(1);
}
