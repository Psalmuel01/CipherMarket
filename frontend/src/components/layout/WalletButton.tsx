'use client';

import { useDisconnect } from 'wagmi';
import { Wallet, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { truncateAddress } from '@/lib/formatters';

export interface WalletButtonProps {
  className?: string;
}

export default function WalletButton({ className }: WalletButtonProps): JSX.Element {
  const { disconnect } = useDisconnect();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        if (!ready) {
          return (
            <Button
              className={className}
              type="button"
              variant="primary"
              size="md"
              disabled
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          );
        }

        if (!connected) {
          return (
            <Button
              className={className}
              onClick={openConnectModal}
              type="button"
              variant="primary"
              size="md"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button
              className={className}
              onClick={openChainModal}
              type="button"
              variant="primary"
              size="md"
              style={{ backgroundColor: 'var(--destructive)', color: 'white' }}
            >
              Wrong network
            </Button>
          );
        }

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
              <span className="font-bold text-foreground">
                {truncateAddress(account.address)}
              </span>
              <LogOut className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
