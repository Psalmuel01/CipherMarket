import type { Abi, Address } from 'viem';
import OracleRegistryArtifact from './abi/OracleRegistry.json';
import PredictionMarketArtifact from './abi/PredictionMarket.json';
import MockUSDCArtifact from './abi/MockUSDC.json';

export interface ChainContractAddresses {
  oracleRegistry: Address | null;
  predictionMarket: Address | null;
  mockUsdc: Address | null;
}

export const LOCAL_CHAIN_ID = 420105;
export const SEPOLIA_CHAIN_ID = 11155111;
export const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const DEFAULT_ORACLE_STAKE = 10n ** 18n;
export const DEFAULT_DISPUTE_WINDOW_SECONDS = 24n * 60n * 60n;

export const CONTRACT_ADDRESSES: Record<number, ChainContractAddresses> = {
  [LOCAL_CHAIN_ID]: {
    oracleRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    predictionMarket: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    mockUsdc: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  },
  [SEPOLIA_CHAIN_ID]: {
    oracleRegistry: (process.env.NEXT_PUBLIC_SEPOLIA_ORACLE_REGISTRY as Address) ?? null,
    predictionMarket: (process.env.NEXT_PUBLIC_SEPOLIA_PREDICTION_MARKET as Address) ?? null,
    mockUsdc: (process.env.NEXT_PUBLIC_SEPOLIA_MOCK_USDC as Address) ?? null,
  },
};

export const ORACLE_REGISTRY_ABI = OracleRegistryArtifact.abi as Abi;
export const PREDICTION_MARKET_ABI = PredictionMarketArtifact.abi as Abi;
export const MOCK_USDC_ABI = MockUSDCArtifact.abi as Abi;

export const MARKET_TYPE_LABELS = ['BINARY', 'CATEGORICAL'] as const;
export const MARKET_STATE_LABELS = [
  'ACTIVE',
  'EXPIRED',
  'PROPOSED',
  'DISPUTED',
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

  if (addresses?.mockUsdc && collateralToken.toLowerCase() === addresses.mockUsdc.toLowerCase()) {
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
