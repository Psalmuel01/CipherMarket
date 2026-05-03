#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const contractsEnvPath = path.join(rootDir, 'contracts', '.env');
const frontendEnvPath = path.join(rootDir, 'frontend', '.env.local');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveEnv(...keys) {
  for (const key of keys) {
    if (process.env[key]) {
      return { key, value: process.env[key] };
    }
  }

  return null;
}

async function main() {
  loadDotEnv(contractsEnvPath);
  loadDotEnv(frontendEnvPath);

  const required = [
    ['SEPOLIA_RPC_URL'],
    ['SEPOLIA_PREDICTION_MARKET', 'NEXT_PUBLIC_SEPOLIA_PREDICTION_MARKET'],
    ['SEPOLIA_ORACLE_REGISTRY', 'NEXT_PUBLIC_SEPOLIA_ORACLE_REGISTRY'],
    ['SEPOLIA_USDC_ADDRESS', 'NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS'],
  ];

  const resolved = required.map((group) => resolveEnv(...group));
  const missing = required.filter((_, index) => !resolved[index]);

  console.log('');
  console.log('CipherMarket Wave 3C Validation');
  console.log('================================');
  console.log('');
  console.log('Goal: validate whether Privara can hold dispute bonds while CipherMarket');
  console.log('remains the canonical source of final market state on Sepolia.');
  console.log('');

  if (missing.length > 0) {
    console.log('Missing environment values:');
    for (const group of missing) {
      console.log(`- ${group.join(' or ')}`);
    }
    console.log('');
    console.log('Add those first, then rerun:');
    console.log('  node scripts/validate-privara.mjs');
    process.exitCode = 1;
    return;
  }

  console.log('Resolved environment:');
  for (const item of resolved) {
    console.log(`- ${item.key}=${item.value}`);
  }

  console.log('');

  let sdk;
  try {
    sdk = await import('@reineira-os/sdk');
  } catch {
    console.log('Privara/Reineira SDK is not installed yet.');
    console.log('');
    console.log('Install it before running the actual Sepolia validation spike:');
    console.log('  pnpm add @reineira-os/sdk');
    console.log('');
    console.log('Validation checklist once installed:');
    printChecklist();
    process.exitCode = 1;
    return;
  }

  const exportedKeys = Object.keys(sdk).sort();
  console.log('SDK import succeeded.');
  console.log(`Export count: ${exportedKeys.length}`);
  console.log(`Sample exports: ${exportedKeys.slice(0, 10).join(', ') || '(none found)'}`);
  console.log('');
  console.log('Important fit check:');
  console.log('- The installed SDK is positioned around Reineira testnet/mainnet flows on Arbitrum.');
  console.log('- CipherMarket currently lives on Ethereum Sepolia.');
  console.log('- That means Wave 3C validation must confirm whether dispute bonds would stay on Sepolia, move cross-chain, or require a settlement relay design.');
  console.log('');
  console.log('Next manual validation steps:');
  printChecklist();
}

function printChecklist() {
  console.log('- Confirm escrow creation supports Sepolia USDC dispute bonds.');
  console.log('- Confirm release conditions can depend on finalized CipherMarket state.');
  console.log('- Confirm the flow can distinguish refund vs forfeiture.');
  console.log('- Confirm normal execution does not require manual operator intervention.');
  console.log('- Decide whether released forfeited funds go directly to a settlement receiver or route back through a protocol-owned distributor.');
  console.log('');
  console.log('Reference spec: docs/wave-3c-spec.md');
}

main().catch((error) => {
  console.error('');
  console.error('Wave 3C validation bootstrap failed.');
  console.error(error);
  process.exitCode = 1;
});
