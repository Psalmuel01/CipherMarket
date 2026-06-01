import type { Address } from 'viem';
import { getAddress } from 'viem';
import { ARBITRUM_SEPOLIA_CHAIN_ID, type ChainContractAddresses } from '@ciphermarket/sdk';

function optionalAddress(value: string | undefined): Address | null {
  if (!value) return null;
  return getAddress(value);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export interface BotConfig {
  telegramToken: string;
  rpcUrl: string;
  appUrl: string;
  chainId: number;
  addresses: ChainContractAddresses;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  alertPollIntervalMs: number;
}

export function loadConfig(): BotConfig {
  return {
    telegramToken: requiredEnv('TELEGRAM_BOT_TOKEN'),
    rpcUrl: requiredEnv('ARBITRUM_SEPOLIA_RPC_URL'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    addresses: {
      predictionMarket: optionalAddress(process.env.PREDICTION_MARKET_ADDRESS),
      oracleRegistry: optionalAddress(process.env.ORACLE_REGISTRY_ADDRESS),
      reineiraDisputeEscrowAdapter: optionalAddress(process.env.REINEIRA_DISPUTE_ESCROW_ADAPTER_ADDRESS),
      usdc: optionalAddress(process.env.USDC_ADDRESS),
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    alertPollIntervalMs: Number(process.env.ALERT_POLL_INTERVAL_MS ?? 60_000),
  };
}
