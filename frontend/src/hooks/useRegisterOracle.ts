'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  DEFAULT_ORACLE_STAKE,
  formatContractError,
  getContractAddresses,
  ORACLE_REGISTRY_ABI,
} from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';

export interface RegisterOracleReceipt {
  txHash: string;
}

export interface UseRegisterOracleResult {
  data: RegisterOracleReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  registerOracle: (stakeAmount?: bigint) => Promise<void>;
}

/**
 * Registers the connected wallet as an oracle using ETH stake.
 * @returns Mutation state and the oracle registration action.
 */
export default function useRegisterOracle(): UseRegisterOracleResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const refreshProtocolData = useProtocolRefresh();
  const [data, setData] = useState<RegisterOracleReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const registerOracle = async (stakeAmount = DEFAULT_ORACLE_STAKE): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const oracleRegistryAddress = addresses?.oracleRegistry;

      if (!oracleRegistryAddress) {
        throw new Error('OracleRegistry is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      setError(null);
      setIsLoading(true);
      const gasFees = await getBufferedGasFees(publicClient);

      const hash = await writeContractAsync({
        address: oracleRegistryAddress,
        abi: ORACLE_REGISTRY_ABI,
        functionName: 'register',
        value: stakeAmount,
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setData({ txHash: hash });
      await refreshProtocolData();
      toast.success('Oracle registration submitted.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to register as an oracle.');

      setError(nextError);
      toast.error(nextError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
    registerOracle,
  };
}
