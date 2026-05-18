export interface BufferedGasFees {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

interface FeeCapablePublicClient {
  estimateFeesPerGas: () => Promise<{
    gasPrice?: bigint | null;
    maxFeePerGas?: bigint | null;
    maxPriorityFeePerGas?: bigint | null;
  }>;
}

const GAS_FEE_BUFFER_BPS = 2_500n;
const GAS_FEE_MIN_BUFFER_WEI = 1_000_000n;
const GAS_LIMIT_BUFFER_BPS = 3_000n;
const GAS_LIMIT_MIN_BUFFER = 50_000n;

function withGasBuffer(value: bigint): bigint {
  return value + (value * GAS_FEE_BUFFER_BPS) / 10_000n + GAS_FEE_MIN_BUFFER_WEI;
}

export async function getBufferedGasFees(
  publicClient: FeeCapablePublicClient,
): Promise<BufferedGasFees> {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice;

    if (!maxFeePerGas) {
      return {};
    }

    return {
      maxFeePerGas: withGasBuffer(maxFeePerGas),
      ...(fees.maxPriorityFeePerGas
        ? { maxPriorityFeePerGas: withGasBuffer(fees.maxPriorityFeePerGas) }
        : {}),
    };
  } catch {
    return {};
  }
}

export async function getBufferedContractGas(
  publicClient: { estimateContractGas: (request: never) => Promise<bigint> },
  request: Record<string, unknown>,
  fallbackGas: bigint,
): Promise<bigint> {
  try {
    const estimate = await publicClient.estimateContractGas(request as never);
    return estimate + (estimate * GAS_LIMIT_BUFFER_BPS) / 10_000n + GAS_LIMIT_MIN_BUFFER;
  } catch {
    return fallbackGas;
  }
}

export async function requireBufferedContractGas(
  publicClient: { estimateContractGas: (request: never) => Promise<bigint> },
  request: Record<string, unknown>,
): Promise<bigint> {
  const estimate = await publicClient.estimateContractGas(request as never);
  return estimate + (estimate * GAS_LIMIT_BUFFER_BPS) / 10_000n + GAS_LIMIT_MIN_BUFFER;
}
