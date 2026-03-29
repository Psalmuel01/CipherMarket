'use client';

import { useMemo } from 'react';
import { formatEther } from 'viem';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { formatContractError, getContractAddresses, ORACLE_REGISTRY_ABI } from '@/lib/contracts';
import useMarkets from '@/hooks/useMarkets';
import type { OracleProfile } from '@/types/market';

interface OracleRegistryProfile {
  stakedAmount: bigint;
  active: boolean;
}

export interface UseOracleStatusResult {
  data: OracleProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Reads the connected wallet's oracle registration status and pending market exposure.
 * @returns Oracle profile data plus loading and error state helpers.
 */
export default function useOracleStatus(): UseOracleStatusResult {
  const chainId = useChainId();
  const { address } = useAccount();
  const { data: markets, error: marketsError, isError: isMarketsError, isLoading: isMarketsLoading } =
    useMarkets();
  const addresses = getContractAddresses(chainId);
  const oracleRegistryAddress = addresses?.oracleRegistry ?? undefined;

  const profileQuery = useReadContract({
    address: oracleRegistryAddress ?? undefined,
    abi: ORACLE_REGISTRY_ABI,
    functionName: 'getOracle',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(oracleRegistryAddress) && Boolean(address),
    },
  });

  const minimumStakeQuery = useReadContract({
    address: oracleRegistryAddress ?? undefined,
    abi: ORACLE_REGISTRY_ABI,
    functionName: 'minimumStake',
    query: {
      enabled: Boolean(oracleRegistryAddress),
    },
  });

  const data = useMemo(() => {
    if (!address) {
      return null;
    }

    const profile = (profileQuery.data as OracleRegistryProfile | undefined) ?? {
      stakedAmount: 0n,
      active: false,
    };
    const activeAssignments = markets.filter(
      (market) => market.status === 'EXPIRED' || market.status === 'PROPOSED' || market.status === 'DISPUTED',
    ).length;

    return {
      isRegistered: profile.active,
      stakeAmount: profile.stakedAmount,
      stakeFormatted: `${formatEther(profile.stakedAmount)} ETH`,
      disputeExposure: `${markets.filter((market) => market.status === 'DISPUTED').length} disputed`,
      activeAssignments,
      minimumStakeFormatted: `${formatEther((minimumStakeQuery.data as bigint | undefined) ?? 0n)} ETH`,
    } satisfies OracleProfile;
  }, [address, markets, minimumStakeQuery.data, profileQuery.data]);

  const error =
    !address
      ? null
      : !oracleRegistryAddress
        ? new Error('OracleRegistry is not configured for the current chain.')
        : (profileQuery.error || minimumStakeQuery.error || marketsError
            ? new Error(
                formatContractError(profileQuery.error || minimumStakeQuery.error || marketsError),
              )
            : null);

  return {
    data,
    isLoading: isMarketsLoading || profileQuery.isLoading || minimumStakeQuery.isLoading,
    isError: isMarketsError || error !== null,
    error,
  };
}
