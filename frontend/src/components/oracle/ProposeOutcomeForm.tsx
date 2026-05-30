import { Info, Sparkles, Gavel, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import useMarkets from '@/hooks/useMarkets';
import useProposeOutcome from '@/hooks/useProposeOutcome';

export interface ProposeOutcomeFormProps {
  className?: string;
  isOracleRegistered?: boolean;
}

export default function ProposeOutcomeForm({ className, isOracleRegistered }: ProposeOutcomeFormProps): JSX.Element {
  const { data: markets } = useMarkets();
  const [marketId, setMarketId] = useState<string>('');
  const [outcomeIndex, setOutcomeIndex] = useState<string>('0');
  const [isSuccess, setIsSuccess] = useState(false);
  const { data, error, isError, isLoading, proposeOutcome } = useProposeOutcome();
  const proposedMarket = markets.find((market) => String(market.marketId) === marketId) ?? null;

  const handleStage = async (): Promise<void> => {
    if (!proposedMarket) {
      return;
    }

    await proposeOutcome(proposedMarket.marketId, Number.parseInt(outcomeIndex, 10));
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx("glass-card rounded-3xl p-8 text-center space-y-3", className)}
      >
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/20 p-4 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h3 className="text-xl font-black text-foreground">Proposal Staged</h3>
        <p className="text-xs text-muted-foreground">
          The committee resolution window is now open. Other registered oracles can vote, and
          challengers can dispute with an explicit counter-outcome.
        </p>
        {data ? (
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tx: {data.txHash.slice(0, 10)}...
          </p>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setIsSuccess(false)}>New Proposal</Button>
      </motion.div>
    );
  }

  return (
    <div className={clsx("glass-card rounded-3xl p-8 space-y-8", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Gavel className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Propose Outcome</h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Resolution proposals open the committee voting window for registered oracles.
        </p>
      </div>

      <form className="space-y-6">
        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Market
          </label>
          <div className="relative">
            <select
              className="appearance-none h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              onChange={(event) => {
                setMarketId(event.target.value);
                setOutcomeIndex('0');
              }}
              value={marketId}
            >
              <option className="bg-background" value="">Select a market</option>
              {markets
                .filter((market) => market.status === 'EXPIRED')
                .map((market) => (
                  <option key={market.marketId} className="bg-background" value={String(market.marketId)}>
                    #{market.marketId} · {market.title}
                  </option>
                ))}
            </select>
            <div className="pointer-events-none text-xs absolute inset-y-0 right-3 flex items-center text-white/40">
              ▼
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Proposed Outcome
          </label>
          <div className="relative">
            <select
              className="appearance-none h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              onChange={(event) => setOutcomeIndex(event.target.value)}
              value={outcomeIndex}
            >
              {(proposedMarket?.outcomes ?? []).map((outcome) => (
                <option key={outcome.id} className="bg-background" value={outcome.outcomeIndex}>
                  Outcome: {outcome.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none text-xs absolute inset-y-0 right-3 flex items-center text-white/40">
              ▼
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Evidence URI (IPFS/HTTP)
          </label>
          <input
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            placeholder="https://issuer.example/report-q2-2026"
          />
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-primary/5 p-4 text-[10px] font-black leading-relaxed text-primary/80 uppercase tracking-wider">
          <Info className="h-4 w-4 shrink-0" />
          <p>Important: Your locked stake will be slashed if this proposal is successfully disputed.</p>
        </div>

        <Button
          className="w-full gap-2"
          size="lg"
          disabled={isLoading || !proposedMarket || !isOracleRegistered}
          onClick={(e) => {
            e.preventDefault();
            handleStage();
          }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? 'Submitting...' : 'Stage Proposal'}
        </Button>
        {!isOracleRegistered && (
          <p className="rounded-2xl text-center text-xs font-bold text-primary/80">
            Oracle is not registered
          </p>
        )}

        {isError && error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-bold text-destructive">
            {error.message}
          </div>
        ) : null}
      </form>
    </div>
  );
}
