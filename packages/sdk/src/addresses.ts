import type { Address } from 'viem';
import type { ChainContractAddresses, CollateralMetadata } from './types';

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const DEFAULT_ORACLE_STAKE = 10n ** 18n;
export const DEFAULT_DISPUTE_WINDOW_SECONDS = 5n * 60n;

export const MARKET_TYPE_LABELS = ['BINARY', 'CATEGORICAL'] as const;
export const MARKET_STATE_LABELS = [
  'ACTIVE',
  'EXPIRED',
  'RESOLUTION_OPEN',
  'ESCALATED',
  'FINALIZED',
] as const;

export function getContractAddresses(
  chainId: number | undefined,
  configuredAddresses: Record<number, ChainContractAddresses>,
): ChainContractAddresses | null {
  if (!chainId) {
    return null;
  }

  return configuredAddresses[chainId] ?? null;
}

export function getCollateralMetadata(
  collateralToken: Address,
  addresses?: ChainContractAddresses | null,
): CollateralMetadata {
  if (collateralToken.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase()) {
    return {
      symbol: 'ETH',
      decimals: 18,
      isNative: true,
    };
  }

  if (addresses?.usdc && collateralToken.toLowerCase() === addresses.usdc.toLowerCase()) {
    return {
      symbol: 'USDC',
      decimals: 6,
      isNative: false,
    };
  }

  return {
    symbol: 'TOKEN',
    decimals: 18,
    isNative: false,
  };
}

export function requirePredictionMarketAddress(addresses: ChainContractAddresses): Address {
  if (!addresses.predictionMarket) {
    throw new Error('PredictionMarket is not configured for the current chain.');
  }

  return addresses.predictionMarket;
}
