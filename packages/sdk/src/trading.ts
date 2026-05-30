import type { Address, Hex } from 'viem';
import { zeroAddress } from 'viem';
import { ERC20_ABI, PREDICTION_MARKET_ABI } from './abi';
import { decryptForTx, ensureCofheConnected, isZeroCtHash, normalizeCtHash } from './cofhe';
import { getBufferedContractGas, getBufferedGasFees } from './gas';
import { requirePredictionMarketAddress } from './addresses';
import type { CipherMarketClientConfig } from './types';

export interface BuySharesParams {
  marketId: number | bigint;
  outcomeIndex: number;
  collateralAmount: bigint;
  minSharesOut?: bigint;
  collateralToken: Address;
}

export interface SellSharesParams {
  marketId: number | bigint;
  outcomeIndex: number;
  sharesIn: bigint;
  minCollateralOut?: bigint;
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

export async function buyShares(
  config: CipherMarketClientConfig,
  params: BuySharesParams,
): Promise<Hex> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  if (params.collateralAmount <= 0n) {
    throw new Error('Enter a valid trade amount.');
  }

  if (params.collateralToken.toLowerCase() !== zeroAddress) {
    const approvalHash = await writeContract(config, {
      address: params.collateralToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [predictionMarketAddress, params.collateralAmount],
      ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
    });
    await config.publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }

  return writeContract(config, {
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'buyShares',
    args: [
      BigInt(params.marketId),
      params.outcomeIndex,
      params.collateralAmount,
      params.minSharesOut ?? 0n,
    ],
    value: params.collateralToken.toLowerCase() === zeroAddress ? params.collateralAmount : 0n,
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });
}

export async function sellShares(
  config: CipherMarketClientConfig,
  params: SellSharesParams,
): Promise<Hex> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const account = config.account ?? config.walletClient?.account?.address;
  if (!account) {
    throw new Error('Connect your wallet before selling shares.');
  }

  if (params.sharesIn <= 0n) {
    throw new Error('Enter a valid share amount.');
  }

  const encryptedPositionHandle = normalizeCtHash(await config.publicClient.readContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getEncryptedUserPositionHandle',
    args: [BigInt(params.marketId), account, params.outcomeIndex],
  }));

  if (isZeroCtHash(encryptedPositionHandle)) {
    throw new Error('This wallet has no encrypted position to sell for this outcome.');
  }

  const cofheClient = await ensureCofheConnected(config.cofheClient, config.publicClient, config.walletClient);
  const { decryptedValue, signature } = await decryptForTx(
    cofheClient,
    config.chainId,
    account,
    encryptedPositionHandle,
    'CipherMarket sell shares',
  );

  if (decryptedValue < params.sharesIn) {
    throw new Error('This wallet does not have enough decrypted shares to sell.');
  }

  const request = {
    account,
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'sellShares',
    args: [
      BigInt(params.marketId),
      params.outcomeIndex,
      params.sharesIn,
      params.minCollateralOut ?? 0n,
      decryptedValue,
      signature,
    ],
  };
  const gas = config.estimateGas
    ? await config.estimateGas(request, 1_800_000n)
    : await getBufferedContractGas(config.publicClient, request, 1_800_000n);

  return writeContract(config, {
    ...request,
    gas,
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });
}
