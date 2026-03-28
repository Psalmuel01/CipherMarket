import type { Abi } from 'viem';
import FHESmokeArtifact from '../../../contracts/artifacts/contracts/FHESmoke.sol/FHESmoke.json';

export const CONTRACT_ADDRESSES = {
  localhost: {
    fheSmoke: null,
  },
  sepolia: {
    fheSmoke: null,
  },
} as const;

export const FHESMOKE_ABI = FHESmokeArtifact.abi as Abi;

