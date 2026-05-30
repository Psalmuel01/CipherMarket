import type { Abi } from 'viem';
import { erc20Abi } from 'viem';
import OracleRegistryArtifact from './abi/OracleRegistry.json';
import PredictionMarketArtifact from './abi/PredictionMarket.json';
import ReineiraDisputeEscrowAdapterArtifact from './abi/ReineiraDisputeEscrowAdapter.json';

export const ORACLE_REGISTRY_ABI = OracleRegistryArtifact.abi as Abi;
export const PREDICTION_MARKET_ABI = PredictionMarketArtifact.abi as Abi;
export const REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI = ReineiraDisputeEscrowAdapterArtifact.abi as Abi;
export const ERC20_ABI = erc20Abi as Abi;

export { OracleRegistryArtifact, PredictionMarketArtifact, ReineiraDisputeEscrowAdapterArtifact };
