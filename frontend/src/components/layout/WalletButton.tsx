'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import { truncateAddress } from '@/lib/formatters';

export interface WalletButtonProps {
  className?: string;
}

export default function WalletButton({ className }: WalletButtonProps): JSX.Element {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="group gap-2 rounded-full border-white/10 bg-white/[0.03] pl-2 pr-4"
          onClick={() => disconnect()}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-foreground">{truncateAddress(address)}</span>
          <LogOut className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      className={className}
      onClick={() => connect({ connector: connectors[0] })}
      type="button"
      variant="primary"
      size="md"
    >
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
