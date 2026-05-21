const sdkModule = require('@reineira-os/sdk');
const { ReineiraSDK, injectCofhe } = sdkModule;
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

// Mock CoFHE FHE Client so we can perform off-chain encryption mock
const mockCofhe = {
  cofhejs: {
    initializeWithEthers: async (config) => {
      console.log('[Mock CoFHE] initializeWithEthers successfully called');
      return { success: true };
    },
    encrypt: async (arr) => {
      console.log('[Mock CoFHE] encrypt called for:', arr.map(x => ({ type: x.type, value: x.value.toString() })));
      // Returns the expected tuple representation: tuple(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature)
      return {
        success: true,
        data: arr.map(item => ({
          ctHash: BigInt(item.value),
          securityZone: 0,
          utype: 0,
          signature: '0x'
        }))
      };
    }
  },
  Encryptable: {
    address: (addr) => {
      return { type: 'address', value: BigInt(addr) };
    },
    uint64: (val) => {
      return { type: 'uint64', value: BigInt(val) };
    }
  }
};

async function main() {
  loadDotEnv(contractsEnvPath);

  injectCofhe(mockCofhe);

  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  console.log('Initializing Reineira SDK...');
  const sdk = ReineiraSDK.create({
    network: 'testnet',
    rpcUrl,
    privateKey
  });

  await sdk.initialize();
  const address = await sdk.signer.getAddress();
  console.log('Wallet Address:', address);

  console.log('\nBuilding test escrow...');
  const amount = sdk.usdc(1.0); // 1.0 USDC = 1_000_000 base units
  console.log('- Amount:', amount.toString());

  const resolver = sdk.addresses.simpleCondition;
  console.log('- Resolver Address:', resolver);

  console.log('Executing sdk.escrow.create(...) on Arbitrum Sepolia...');
  const escrowInstance = await sdk.escrow.create({
    amount,
    owner: address,
    resolver,
    resolverData: '0x'
  });

  console.log('\nEscrow successfully created on-chain!');
  console.log('- Escrow ID:', escrowInstance.id.toString());
  if (escrowInstance.createTx) {
    console.log('- Transaction Hash:', escrowInstance.createTx.hash);
    console.log('- Block Number:', escrowInstance.createTx.blockNumber);
    console.log('- Gas Used:', escrowInstance.createTx.gasUsed.toString());
  }

  console.log('\nChecking if escrow exists on-chain...');
  const exists = await escrowInstance.exists();
  console.log('- Exists:', exists);
}

main().catch((err) => {
  console.error('\nEscrow creation failed:', err);
  process.exitCode = 1;
});
