'use client';

import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import Button from '@/components/ui/Button';
import { truncateAddress } from '@/lib/formatters';

export interface WalletButtonProps {
  className?: string;
}

export default function WalletButton({ className }: WalletButtonProps): JSX.Element {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  if (isConnected && address) {
    return (
      <Button className={className} onClick={() => disconnect()} type="button" variant="ghost">
        {truncateAddress(address)} · {chainId}
      </Button>
    );
  }

  return (
    <Button
      className={className}
      onClick={() => connect({ connector: injected() })}
      type="button"
    >
      Connect Wallet
    </Button>
  );
}

