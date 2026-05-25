import type { Abi, Address } from 'viem';
import { erc20Abi } from 'viem';
import OracleRegistryArtifact from './abi/OracleRegistry.json';
import PredictionMarketArtifact from './abi/PredictionMarket.json';
import PrivaraDisputeEscrowAdapterArtifact from './abi/PrivaraDisputeEscrowAdapter.json';

export interface ChainContractAddresses {
  oracleRegistry: Address | null;
  predictionMarket: Address | null;
  privaraDisputeEscrowAdapter: Address | null;
  usdc: Address | null;
}

// export const SEPOLIA_CHAIN_ID = 11155111;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const DEFAULT_ORACLE_STAKE = 10n ** 18n;
export const DEFAULT_DISPUTE_WINDOW_SECONDS = 5n * 60n;

export const CONTRACT_ADDRESSES: Record<number, ChainContractAddresses> = {
  // [SEPOLIA_CHAIN_ID]: {
  //   oracleRegistry: (process.env.NEXT_PUBLIC_SEPOLIA_ORACLE_REGISTRY as Address) ?? null,
  //   predictionMarket: (process.env.NEXT_PUBLIC_SEPOLIA_PREDICTION_MARKET as Address) ?? null,
  //   usdc: (process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS as Address) ?? null,
  // },
  [ARBITRUM_SEPOLIA_CHAIN_ID]: {
    oracleRegistry: (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_ORACLE_REGISTRY as Address) ?? null,
    predictionMarket: (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_PREDICTION_MARKET as Address) ?? null,
    privaraDisputeEscrowAdapter:
      (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_PRIVARA_DISPUTE_ESCROW_ADAPTER as Address) ?? null,
    usdc: (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_ADDRESS as Address) ?? null,
  },
};

export const ORACLE_REGISTRY_ABI = OracleRegistryArtifact.abi as Abi;
export const PREDICTION_MARKET_ABI = PredictionMarketArtifact.abi as Abi;
export const PRIVARA_DISPUTE_ESCROW_ADAPTER_ABI = PrivaraDisputeEscrowAdapterArtifact.abi as Abi;
export const ERC20_ABI = erc20Abi as Abi;
export const COFHE_TASK_MANAGER_ADDRESS = '0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9' as const;
export const COFHE_TASK_MANAGER_ABI = [
  {
    type: 'function',
    name: 'allowForDecryption',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ctHash', type: 'uint256' }],
    outputs: [],
  },
] as const satisfies Abi;

export const MARKET_TYPE_LABELS = ['BINARY', 'CATEGORICAL'] as const;
export const MARKET_STATE_LABELS = [
  'ACTIVE',
  'EXPIRED',
  'RESOLUTION_OPEN',
  'ESCALATED',
  'FINALIZED',
] as const;

export interface CollateralMetadata {
  symbol: string;
  decimals: number;
  isNative: boolean;
}

/**
 * Returns the configured contract addresses for the selected chain.
 * @param chainId The current chain id.
 * @returns The configured address set, if available.
 */
export function getContractAddresses(chainId?: number): ChainContractAddresses | null {
  if (!chainId) {
    return null;
  }

  return CONTRACT_ADDRESSES[chainId] ?? null;
}

/**
 * Returns the metadata needed to display and format the market collateral.
 * @param collateralToken The configured collateral token address.
 * @param chainId The current chain id.
 * @returns The collateral metadata.
 */
export function getCollateralMetadata(
  collateralToken: Address,
  chainId?: number,
): CollateralMetadata {
  const addresses = getContractAddresses(chainId);

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

/**
 * Converts a raw contract or wallet error into a concise user-facing message.
 * @param error The thrown error value.
 * @returns A plain-English message.
 */
export function formatContractError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Something went wrong while talking to the contract.';
  }

  const message = error.message;

  if (message.includes('User rejected') || message.includes('rejected the request')) {
    return 'The wallet request was rejected.';
  }

  if (message.includes('Connector not connected')) {
    return 'Connect your wallet before submitting this action.';
  }

  if (message.toLowerCase().includes('gas limit too high')) {
    return 'The network could not estimate gas for this action. Please retry; if it persists, the decrypt request may not be valid for this position yet.';
  }

  const viemRevertMatch = message.match(/reverted with the following reason:\s*([\s\S]*?)(?:\n|$)/i);
  if (viemRevertMatch?.[1]) {
    return viemRevertMatch[1].trim();
  }

  const revertMatch = message.match(/reverted with reason string ['"](.+?)['"]/i);
  if (revertMatch?.[1]) {
    return revertMatch[1];
  }

  const shortMessageMatch = message.match(/Details:\s(.+)$/i);
  if (shortMessageMatch?.[1]) {
    return shortMessageMatch[1];
  }

  return message;
}
