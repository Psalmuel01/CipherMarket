import type { Abi } from 'viem';
import { erc20Abi } from 'viem';
import OracleRegistryArtifact from './abi/OracleRegistry.json' with { type: 'json' };
import PredictionMarketArtifact from './abi/PredictionMarket.json' with { type: 'json' };
import ReineiraDisputeEscrowAdapterArtifact from './abi/ReineiraDisputeEscrowAdapter.json' with { type: 'json' };

export const ORACLE_REGISTRY_ABI = OracleRegistryArtifact.abi as Abi;
export const PREDICTION_MARKET_ABI = PredictionMarketArtifact.abi as Abi;
export const REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI = ReineiraDisputeEscrowAdapterArtifact.abi as Abi;
export const ERC20_ABI = erc20Abi as Abi;

export { OracleRegistryArtifact, PredictionMarketArtifact, ReineiraDisputeEscrowAdapterArtifact };
