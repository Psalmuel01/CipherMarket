/**
 * CipherMarket Deployment Script
 *
 * Deploys:
 *   1. OracleRegistry      – manages oracle stake/registration
 *   2. PredictionMarket    – singleton market + FHE bet mirroring
 *   3. MockUSDC            – testnet ERC-20 collateral
 *
 * Post-deploy wiring:
 *   - OracleRegistry.setPredictionMarket(PredictionMarket)
 *   - PredictionMarket.setAcceptedCollateral(MockUSDC, true)
 *
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts                  (local Hardhat node)
 *   npx hardhat run scripts/deploy.ts --network sepolia
 */

import hre from 'hardhat';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Deployed {
  name: string;
  address: string;
  txHash: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a raw ethers.JsonRpcProvider when running on a live network,
 * or null when running locally (Hardhat node).
 *
 * We need this because HardhatEthersProvider.waitForTransaction() is not
 * implemented in @nomicfoundation/hardhat-ethers@3.0.0, so we fall back to
 * polling via the underlying JSON-RPC directly.
 */
function getLiveProvider(runtime: HardhatRuntimeEnvironment): ethers.JsonRpcProvider | null {
  const url = (runtime.network.config as { url?: string }).url;
  return url ? new ethers.JsonRpcProvider(url) : null;
}

/**
 * Waits for a transaction to be confirmed.
 * - On live networks: uses raw ethers provider polling (avoids unimplemented method bug).
 * - On local Hardhat: uses the standard receipt wait — it mines instantly.
 */
async function waitForTx(
  txHash: string,
  provider: ethers.JsonRpcProvider | null,
  label: string,
  timeoutMs = 600_000,
): Promise<ethers.TransactionReceipt> {
  if (!provider) {
    // Hardhat local — getTransactionReceipt is immediate after mining
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    if (!receipt) throw new Error(`[${label}] Could not get receipt for ${txHash}`);
    return receipt as unknown as ethers.TransactionReceipt;
  }

  const pollMs = 4_000;
  const start = Date.now();
  process.stdout.write(`  ⏳ Waiting for confirmation`);

  while (true) {
    if (Date.now() - start > timeoutMs) {
      console.log('');
      throw new Error(`[${label}] Timeout (${timeoutMs / 1000}s) waiting for ${txHash}`);
    }

    await new Promise((r) => setTimeout(r, pollMs));
    const receipt = await provider.getTransactionReceipt(txHash);

    if (receipt) {
      console.log(` ✓ (block ${receipt.blockNumber})`);
      if (receipt.status !== 1) {
        throw new Error(`[${label}] Transaction reverted: ${txHash}`);
      }
      return receipt;
    }

    process.stdout.write('.');
  }
}

/**
 * Deploys a named contract, logs progress, and waits for confirmation.
 */
async function deploy(
  runtime: HardhatRuntimeEnvironment,
  provider: ethers.JsonRpcProvider | null,
  name: string,
  args: unknown[] = [],
): Promise<Deployed> {
  console.log(`\n[${name}]`);
  console.log(`  Getting factory...`);
  const factory = await runtime.ethers.getContractFactory(name);

  console.log(`  Sending deploy tx...`);
  const contract = await factory.deploy(...args);

  const deployTx = contract.deploymentTransaction();
  if (!deployTx) throw new Error(`[${name}] No deployment transaction found`);
  console.log(`  Tx hash: ${deployTx.hash}`);

  await waitForTx(deployTx.hash, provider, name);

  const address = await contract.getAddress();
  console.log(`  Address: ${address}`);

  return { name, address, txHash: deployTx.hash };
}

/**
 * Sends a post-deploy transaction and waits for confirmation.
 * Used for contract wiring (setPredictionMarket, setAcceptedCollateral).
 */
async function sendConfig(
  provider: ethers.JsonRpcProvider | null,
  label: string,
  txResponse: { hash: string },
): Promise<void> {
  console.log(`  Tx hash: ${txResponse.hash}`);
  await waitForTx(txResponse.hash, provider, label);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const network = hre.network.name;
  const isLocal = network === 'hardhat' || network === 'localhost';
  const provider = getLiveProvider(hre);
  const [deployer] = await hre.ethers.getSigners();

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  CipherMarket — Contract Deployment  ');
  console.log('══════════════════════════════════════');
  console.log(`  Network:  ${network}`);
  console.log(`  Deployer: ${deployer.address}`);
  if (isLocal) {
    console.log('  Mode:     Local (instant mining, FHE mocks active)');
  } else {
    console.log('  Mode:     Live testnet (CoFHE coprocessor active)');
    console.log('');
    console.log('     Its constructor requires the hardhat mock FHE plugin.');
  }
  console.log('');
  console.log('  Deploying contracts...');

  // ── 1. OracleRegistry ──────────────────────────────────────────────────────
  // Constructor arg: minimum oracle stake (1 ETH)
  const oracleRegistry = await deploy(hre, provider, 'OracleRegistry', [
    hre.ethers.parseEther('1'),
  ]);

  // ── 2. PredictionMarket ────────────────────────────────────────────────────
  // Constructor args: oracle registry address, dispute window in seconds (24h)
  const predictionMarket = await deploy(hre, provider, 'PredictionMarket', [
    oracleRegistry.address,
    24 * 60 * 60,
  ]);

  // ── 3. MockUSDC ────────────────────────────────────────────────────────────
  const mockUsdc = await deploy(hre, provider, 'MockUSDC');

  // ── 4. Wire: OracleRegistry → PredictionMarket ─────────────────────────────
  console.log('\n[Wiring]');
  console.log(`  OracleRegistry.setPredictionMarket(${predictionMarket.address})`);
  const registry = await hre.ethers.getContractAt('OracleRegistry', oracleRegistry.address);
  const setPMTx = await registry.setPredictionMarket(predictionMarket.address);
  await sendConfig(provider, 'setPredictionMarket', setPMTx);

  // ── 5. Wire: PredictionMarket.setAcceptedCollateral(MockUSDC) ───────────────
  console.log(`\n  PredictionMarket.setAcceptedCollateral(${mockUsdc.address}, true)`);
  const market = await hre.ethers.getContractAt('PredictionMarket', predictionMarket.address);
  const setColTx = await market.setAcceptedCollateral(mockUsdc.address, true);
  await sendConfig(provider, 'setAcceptedCollateral', setColTx);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('       Deployment Summary             ');
  console.log('══════════════════════════════════════');
  console.log('');

  const rows: Deployed[] = [oracleRegistry, predictionMarket, mockUsdc];

  for (const c of rows) {
    console.log(`  ${c.name}`);
    console.log(`    Address: ${c.address}`);
    console.log(`    Tx:      ${c.txHash}`);
    console.log('');
  }

  // Etherscan links on live networks
  if (!isLocal) {
    console.log('  Etherscan links:');
    for (const c of rows) {
      console.log(`    ${c.name}: https://sepolia.etherscan.io/address/${c.address}`);
    }
    console.log('');
  }

  console.log('  ✅ Deployment complete!');
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Copy the addresses above into your frontend .env');
  console.log('  2. Fund test wallets with testnet ETH and MockUSDC');
  console.log('  3. Register an oracle via OracleRegistry.register()');
  console.log('══════════════════════════════════════');
}

main().catch((error: unknown) => {
  console.error('\n❌ Deployment failed:\n', error);
  process.exitCode = 1;
});
