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

  if (message.toLowerCase().includes('gas limit too high')) {
    return 'The network could not estimate gas for this action. Please retry; if it persists, the decrypt request may not be valid for this position yet.';
  }

  const viemRevertMatch = message.match(/reverted with the following reason:\s*([\s\S]*?)(?:\n|$)/i);
  if (viemRevertMatch?.[1]) {
    return viemRevertMatch[1].trim();
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
