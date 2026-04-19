'use client';

import { useMemo } from 'react';
import { LogOut, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import Button from '@/components/ui/Button';
import { wagmiChains } from '@/lib/chains';
import { truncateAddress } from '@/lib/formatters';

export interface WalletButtonProps {
  className?: string;
}

export default function WalletButton({ className }: WalletButtonProps): JSX.Element {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const targetChain = wagmiChains[0];

  const injectedConnector = useMemo(
    () => connectors.find((connector) => connector.type === 'injected') ?? connectors[0] ?? null,
    [connectors],
  );

  const isUnsupported = isConnected && chainId !== targetChain.id;

  const handleConnect = async (): Promise<void> => {
    if (!injectedConnector) {
      toast.error('No browser wallet was detected.');
      return;
    }

    try {
      await connectAsync({
        connector: injectedConnector,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect wallet.';
      toast.error(message);
    }
  };

  const handleSwitchChain = async (): Promise<void> => {
    try {
      await switchChainAsync({
        chainId: targetChain.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to switch network.';
      toast.error(message);
    }
  };

  return (
    <>
      {!isConnected ? (
        <Button
          className={className}
          onClick={() => void handleConnect()}
          type="button"
          variant="primary"
          size="md"
          disabled={isConnecting}
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      ) : null}

      {isUnsupported ? (
        <Button
          className={className}
          onClick={() => void handleSwitchChain()}
          type="button"
          variant="danger"
          size="md"
          disabled={isSwitching}
        >
          {isSwitching ? 'Switching...' : 'Switch To Sepolia'}
        </Button>
      ) : null}

      {isConnected && !isUnsupported && address ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="group gap-2 rounded-full border-white/10 bg-white/[0.03] pl-2 pr-4"
            onClick={() => disconnect()}
            type="button"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <span className="font-mono text-foreground">{truncateAddress(address)}</span>
            <LogOut className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Button>
        </div>
      ) : null}
    </>
  );
}
