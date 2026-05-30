'use client';

import { CheckCircle2, Trophy, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import TransactionFlow from '@/components/betting/TransactionFlow';
import useRedeemShares from '@/hooks/useRedeemShares';
import { formatAmount } from '@/lib/formatters';

export interface RedeemModalProps {
  marketId: number;
  marketTitle: string;
  winningShares: bigint;
  collateralSymbol: string;
  collateralDecimals: number;
  finalOutcomeIndex: number | null;
  hasRedeemed: boolean;
  open: boolean;
  onClose: () => void;
}

export default function RedeemModal({
  marketId,
  marketTitle,
  winningShares,
  collateralSymbol,
  collateralDecimals,
  finalOutcomeIndex,
  hasRedeemed,
  open,
  onClose,
}: RedeemModalProps): JSX.Element {
  const { data, state, redeemShares, reset } = useRedeemShares();

  const handleRedeem = async (): Promise<void> => {
    await redeemShares(marketId, winningShares, collateralSymbol, collateralDecimals, finalOutcomeIndex);
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const steps = [
    { id: 'prepare', label: 'Prepare', description: 'Requesting decrypt' },
    { id: 'confirm', label: 'Execute', description: 'Confirm in wallet' },
    { id: 'success', label: 'Complete', description: 'Assets redeemed' },
  ];

  const displayedAmount = data?.amount ?? winningShares;
  const formattedAmount = formatAmount(displayedAmount, collateralDecimals);
  const claimableAmountLabel =
    winningShares > 0n ? `${formatAmount(winningShares, collateralDecimals)} ${collateralSymbol}` : 'Private until redeem';

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title="Redeem Winning Shares"
      description={state.stage === 'idle' ? "Claim your winnings after market finalization." : ""}
      size="md"
    >
      <TransactionFlow
        state={state}
        steps={steps}
        successTitle="Redemption Successful!"
        successDescription={`You have successfully redeemed ${formattedAmount} ${collateralSymbol} from ${marketTitle}.`}
        onClose={handleClose}
        onRetry={handleRedeem}
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[#e8e4df]">
                {claimableAmountLabel}
              </p>
              <p className="text-xs text-white/40 uppercase tracking-widest font-mono">
                Claimable Winnings
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                Security Protocol
              </p>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed">
              {hasRedeemed
                ? 'This wallet has already redeemed its winning shares for this market.'
                : 'Redeeming winnings requires a one-time decryption request to the FHE coprocessor. This ensures your final payout amount remains private until the moment of execution.'}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              className="flex-1"
              variant="outline"
              size="lg"
              onClick={handleClose}
              disabled={state.stage !== 'idle'}
            >
              Cancel
            </Button>
            <Button
              className="flex-[2] gap-2"
              size="lg"
              disabled={hasRedeemed || finalOutcomeIndex === null || state.stage !== 'idle'}
              onClick={handleRedeem}
            >
              <CheckCircle2 className="h-4 w-4" />
              Claim Winnings
            </Button>
          </div>
        </div>
      </TransactionFlow>
    </Modal>
  );
}
