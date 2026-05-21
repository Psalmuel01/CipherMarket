import { ReineiraSDK } from '@reineira-os/sdk';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

  console.log('Initializing Reineira SDK...');
  console.log('- RPC URL:', rpcUrl);
  console.log('- Private Key length:', privateKey?.length);

  const sdk = ReineiraSDK.create({
    network: 'testnet',
    rpcUrl,
    privateKey
  });

  await sdk.initialize();
  console.log('SDK Initialized successfully!');

  const address = await sdk.signer.getAddress();
  console.log('Wallet Address:', address);

  console.log('Fetching balances...');
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
