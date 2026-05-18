const { ReineiraSDK } = require('@reineira-os/sdk');
const { JsonRpcProvider, Wallet } = require('ethers');
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const rootDir = process.cwd();
const contractsEnvPath = path.join(rootDir, 'contracts', '.env');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadDotEnv(contractsEnvPath);

  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  console.log('Initializing Reineira SDK (Cross-chain FHE configuration)...');
  console.log('- Arbitrum Sepolia RPC:', rpcUrl);

  const sdk = ReineiraSDK.create({
    network: 'testnet',
    rpcUrl,
    privateKey
  });

  // Configure FHE Client to use Fhenix Helium Testnet for key retrieval and encryption
  console.log('Configuring FHE Client to use Fhenix Helium Testnet...');
  const fhenixProvider = new JsonRpcProvider('https://api.helium.fhenix.zone');
  const fhenixWallet = new Wallet(privateKey, fhenixProvider);
  
  sdk.fhe.configure(fhenixProvider, fhenixWallet);

  console.log('Initializing FHE Client...');
  await sdk.initialize();
  console.log('FHE Client initialized successfully!');

  const address = await sdk.signer.getAddress();
  console.log('Wallet Address:', address);

  console.log('Fetching balances on Arbitrum Sepolia...');
  const bals = await sdk.balances(address);
  console.log('Balances:', {
    eth: bals.eth.toString(),
    usdc: bals.usdc.toString(),
    confidentialUSDC: bals.confidentialUSDC.toString()
  });
}

main().catch((err) => {
  console.error('Initialization failed:', err);
  process.exitCode = 1;
});
