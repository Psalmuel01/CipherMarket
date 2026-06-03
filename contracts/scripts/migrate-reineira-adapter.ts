/**
 * Deploy a new ReineiraDisputeEscrowAdapter while keeping the legacy adapter whitelisted.
 *
 * Usage:
 *   npx hardhat run scripts/migrate-reineira-adapter.ts --network arbitrum-sepolia
 */

import hre from 'hardhat';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const DEFAULT_ARBITRUM_SEPOLIA_REINEIRA_ESCROW =
  '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa';

function getLiveProvider(): ethers.JsonRpcProvider | null {
  const url = (hre.network.config as { url?: string }).url;
  return url ? new ethers.JsonRpcProvider(url) : null;
}

async function waitForTx(
  txHash: string,
  provider: ethers.JsonRpcProvider | null,
  label: string,
): Promise<void> {
  if (!provider) {
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new Error(`[${label}] Transaction failed: ${txHash}`);
    }
    return;
  }

  const pollMs = 4_000;
  const start = Date.now();
  while (Date.now() - start < 600_000) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      if (receipt.status !== 1) {
        throw new Error(`[${label}] Transaction reverted: ${txHash}`);
      }
      return;
    }
  }

  throw new Error(`[${label}] Timeout waiting for ${txHash}`);
}

async function main(): Promise<void> {
  const network = hre.network.name;
  const provider = getLiveProvider();
  const [deployer] = await hre.ethers.getSigners();
  const addressesPath = path.join(__dirname, '../deployed-addresses.json');
  const existing = JSON.parse(fs.readFileSync(addressesPath, 'utf8')) as {
    predictionMarket?: string;
    reineiraAdapter?: string;
    reineiraEscrow?: string;
  };

  const predictionMarketAddress =
    process.env.PREDICTION_MARKET_ADDRESS || existing.predictionMarket;
  const legacyAdapterAddress =
    process.env.LEGACY_REINEIRA_ADAPTER_ADDRESS || existing.reineiraAdapter;
  const reineiraEscrowAddress =
    process.env.REINEIRA_ESCROW_ADDRESS ||
    existing.reineiraEscrow ||
    DEFAULT_ARBITRUM_SEPOLIA_REINEIRA_ESCROW;

  if (!predictionMarketAddress) {
    throw new Error('PredictionMarket address is required.');
  }

  console.log('');
  console.log('Reineira adapter migration');
  console.log(`  Network:           ${network}`);
  console.log(`  Deployer:          ${deployer.address}`);
  console.log(`  PredictionMarket:  ${predictionMarketAddress}`);
  console.log(`  Legacy adapter:    ${legacyAdapterAddress ?? 'none'}`);
  console.log(`  Reineira escrow:   ${reineiraEscrowAddress}`);

  const factory = await hre.ethers.getContractFactory('ReineiraDisputeEscrowAdapter');
  const adapter = await factory.deploy(predictionMarketAddress, reineiraEscrowAddress);
  const deployTx = adapter.deploymentTransaction();
  if (!deployTx) {
    throw new Error('Adapter deployment transaction was not created.');
  }

  console.log(`  New adapter tx:    ${deployTx.hash}`);
  await waitForTx(deployTx.hash, provider, 'ReineiraDisputeEscrowAdapter');
  const newAdapterAddress = await adapter.getAddress();
  console.log(`  New adapter:       ${newAdapterAddress}`);

  const market = await hre.ethers.getContractAt('PredictionMarket', predictionMarketAddress);

  if (legacyAdapterAddress) {
    console.log(`  Keeping legacy adapter whitelisted: ${legacyAdapterAddress}`);
    const keepLegacyTx = await market.setDisputeAdapter(legacyAdapterAddress, true);
    await waitForTx(keepLegacyTx.hash, provider, 'setDisputeAdapter(legacy,true)');
  }

  console.log(`  Whitelisting new adapter: ${newAdapterAddress}`);
  const enableNewTx = await market.setDisputeAdapter(newAdapterAddress, true);
  await waitForTx(enableNewTx.hash, provider, 'setDisputeAdapter(new,true)');

  const nextAddresses = {
    ...existing,
    network,
    predictionMarket: predictionMarketAddress,
    reineiraAdapter: newAdapterAddress,
    reineiraAdapterLegacy: legacyAdapterAddress ?? null,
    reineiraEscrow: reineiraEscrowAddress,
  };

  fs.writeFileSync(addressesPath, `${JSON.stringify(nextAddresses, null, 2)}\n`);
  console.log('');
  console.log('Migration complete.');
  console.log(`  Updated ${addressesPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Set NEXT_PUBLIC_ARBITRUM_SEPOLIA_REINEIRA_DISPUTE_ESCROW_ADAPTER to the new adapter');
  console.log('  2. Settle any open escrows on the legacy adapter before disabling it');
  console.log('  3. Optionally call setDisputeAdapter(legacy,false) once legacy escrows are settled');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
