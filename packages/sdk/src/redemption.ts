import type { Hex } from 'viem';
import { PREDICTION_MARKET_ABI } from './abi';
import { decryptForTx, ensureCofheConnected, isZeroCtHash, normalizeCtHash } from './cofhe';
import { getBufferedContractGas, getBufferedGasFees } from './gas';
import { requirePredictionMarketAddress } from './addresses';
import type { CipherMarketClientConfig } from './types';

export interface RedeemWinningSharesParams {
  marketId: number | bigint;
  finalOutcomeIndex: number;
}

async function writeContract(
  config: CipherMarketClientConfig,
  request: Record<string, unknown>,
): Promise<Hex> {
  if (!config.walletClient) {
    throw new Error('Wallet client is not available.');
  }

  const account = config.account ?? config.walletClient.account?.address;
  if (!account) {
    throw new Error('Connect your wallet before submitting this action.');
  }

  return (config.walletClient as unknown as {
    writeContract: (request: Record<string, unknown>) => Promise<Hex>;
  }).writeContract({ account, ...request });
}

export async function redeemWinningShares(
  config: CipherMarketClientConfig,
  params: RedeemWinningSharesParams,
): Promise<{ hash: Hex; amount: bigint }> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const account = config.account ?? config.walletClient?.account?.address;
  if (!account) {
    throw new Error('Connect your wallet before redeeming shares.');
  }

  const hasRedeemed = await config.publicClient.readContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'hasRedeemed',
    args: [BigInt(params.marketId), account],
  });

  if (hasRedeemed) {
    throw new Error('This wallet has already redeemed its winning shares for this market.');
  }

  const encryptedWinningHandle = normalizeCtHash(await config.publicClient.readContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getEncryptedUserPositionHandle',
    args: [BigInt(params.marketId), account, params.finalOutcomeIndex],
  }));

  if (isZeroCtHash(encryptedWinningHandle)) {
    throw new Error('This wallet has no encrypted winning position to redeem.');
  }

  const cofheClient = await ensureCofheConnected(config.cofheClient, config.publicClient, config.walletClient);
  const { decryptedValue, signature } = await decryptForTx(
    cofheClient,
    config.chainId,
    account,
    encryptedWinningHandle,
    'CipherMarket redeem shares',
  );

  if (decryptedValue === 0n) {
    throw new Error('This wallet has no winning shares to redeem.');
  }

  const request = {
    account,
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'redeemShares',
    args: [BigInt(params.marketId), decryptedValue, signature],
  };
  const gas = config.estimateGas
    ? await config.estimateGas(request, 1_400_000n)
    : await getBufferedContractGas(config.publicClient, request, 1_400_000n);

  const hash = await writeContract(config, {
    ...request,
    gas,
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });

  return { hash, amount: decryptedValue };
}
