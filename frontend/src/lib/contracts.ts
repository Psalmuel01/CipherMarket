import type { Abi } from 'viem';
import FHESmokeArtifact from '../../../contracts/artifacts/contracts/FHESmoke.sol/FHESmoke.json';

export const CONTRACT_ADDRESSES = {
  localhost: {
    fheSmoke: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  },
  sepolia: {
    fheSmoke: null,
  },
} as const;

export const FHESMOKE_ABI = FHESmokeArtifact.abi as Abi;
