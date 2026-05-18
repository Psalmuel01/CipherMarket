const { JsonRpcProvider, Wallet, formatEther } = require('ethers');
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

  console.log('Testing RPC connection...');
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  console.log('Connected to network:', network.name, 'Chain ID:', network.chainId.toString());

  const balance = await provider.getBalance(wallet.address);
  console.log('Wallet Address:', wallet.address);
  console.log('ETH Balance:', formatEther(balance));
}

main().catch(err => {
  console.error('RPC Test failed:', err);
});
