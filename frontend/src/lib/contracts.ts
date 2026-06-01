import type { Address } from 'viem';
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  DEFAULT_DISPUTE_WINDOW_SECONDS,
  DEFAULT_ORACLE_STAKE,
  ERC20_ABI,
  MARKET_STATE_LABELS,
  MARKET_TYPE_LABELS,
  NATIVE_ETH_ADDRESS,
  ORACLE_REGISTRY_ABI,
  PREDICTION_MARKET_ABI,
  REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
  formatContractError,
  getCollateralMetadata as getSdkCollateralMetadata,
  type ChainContractAddresses,
  type CollateralMetadata,
} from '@ciphermarket/sdk';

export type { ChainContractAddresses, CollateralMetadata };

export {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  DEFAULT_DISPUTE_WINDOW_SECONDS,
  DEFAULT_ORACLE_STAKE,
  ERC20_ABI,
  MARKET_STATE_LABELS,
  MARKET_TYPE_LABELS,
  NATIVE_ETH_ADDRESS,
  ORACLE_REGISTRY_ABI,
  PREDICTION_MARKET_ABI,
  REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
  formatContractError,
};

export const CONTRACT_ADDRESSES: Record<number, ChainContractAddresses> = {
  [ARBITRUM_SEPOLIA_CHAIN_ID]: {
    oracleRegistry: (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_ORACLE_REGISTRY as Address) ?? null,
    predictionMarket: (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_PREDICTION_MARKET as Address) ?? null,
    reineiraDisputeEscrowAdapter:
      (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_REINEIRA_DISPUTE_ESCROW_ADAPTER as Address) ?? null,
    usdc: (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_ADDRESS as Address) ?? null,
  },
};

export function getContractAddresses(chainId?: number): ChainContractAddresses | null {
  if (!chainId) {
    return null;
  }

  return CONTRACT_ADDRESSES[chainId] ?? null;
}

export function getCollateralMetadata(
  collateralToken: Address,
  chainId?: number,
): CollateralMetadata {
  return getSdkCollateralMetadata(collateralToken, getContractAddresses(chainId));
}
