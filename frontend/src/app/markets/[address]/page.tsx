'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Info, ShieldCheck, Wallet, ArrowLeft, Trophy, Clock, History, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import BetModal from '@/components/betting/BetModal';
import OutcomeSelector from '@/components/betting/OutcomeSelector';
import PoolDisplay from '@/components/betting/PoolDisplay';
import Button from '@/components/ui/Button';
import useClaimReward from '@/hooks/useClaimReward';
import { useDemoFlow } from '@/hooks/useDemoFlow';
import type { MarketOutcome, PoolSnapshot } from '@/types/market';
import clsx from 'clsx';

const OUTCOMES: MarketOutcome[] = [
  { id: 'yes', label: 'YES', impliedShare: 58 },
  { id: 'no', label: 'NO', impliedShare: 42 },
];

const POOLS: PoolSnapshot[] = [
  { outcomeId: 'yes', label: 'YES', liquidity: 738000n, percentage: 58 },
  { outcomeId: 'no', label: 'NO', liquidity: 542000n, percentage: 42 },
];

export default function Page({
  params,
}: {
  params: { address: `0x${string}` };
}): JSX.Element {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('yes');
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const { hasPlacedBet, hasResolved, setPlacedBet, setClaimed, hasClaimed } = useDemoFlow();
  const { claimReward, isLoading } = useClaimReward();
  const selectedOutcome = OUTCOMES.find((outcome) => outcome.id === selectedOutcomeId) ?? OUTCOMES[0];

  const handleClaim = async () => {
    await claimReward();
    setClaimed(true);
  };

  return (
    <>
      <TopBar eyebrow="Market Protocol" title="Terminal Access" />
      <main className="space-y-10 px-4 py-8 lg:px-10">
        {/* Header Section */}
        <section className="max-w-5xl space-y-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Link>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                FHE Powered Privacy
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                STATUS: {hasResolved ? 'RESOLVED' : 'ACTIVE'}
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
              Will ETH settle above $4,000 by June 30?
            </h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold">
              <Clock className="h-5 w-5 text-primary" />
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Expires In</p>
                <p>{hasResolved ? 'EXPIRED' : '93 Days'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Resolution</p>
                <p>{hasResolved ? 'YES (Final)' : 'Optimistic Oracle'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold">
              <History className="h-5 w-5 text-primary" />
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">History</p>
                <p>1.2k Total Bets</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
          {/* Main Content Area */}
          <div className="space-y-8">
            <PoolDisplay pools={POOLS} />
            
            <div className="glass-card rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Info className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">Market Information</h3>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground">
                This market utilizes Fully Homomorphic Encryption (FHE) on the Ethereum Sepolia network to encrypt individual stakes. While aggregate pool sizing is visible to maintain market health, individual positions remain sealed until resolution.
              </p>
            </div>
          </div>

          {/* Right Sidebar / Action Card */}
          <aside className="space-y-6">
            <div className="glass-card rounded-3xl p-8 space-y-8">
              {!hasResolved ? (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Place a Bet</h3>
                      </div>
                      {hasPlacedBet && (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">POSITION HELD</span>
                      )}
                    </div>
                    
                    <OutcomeSelector
                      onSelect={setSelectedOutcomeId}
                      outcomes={OUTCOMES}
                      selectedOutcomeId={selectedOutcomeId}
                    />
                  </div>

                  <div className="space-y-4 rounded-2xl bg-white/[0.03] p-4 text-xs font-bold leading-relaxed text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                      <p>Encrypted by FHE. Only the final settlement is shared publicly.</p>
                    </div>
                  </div>

                  <Button size="lg" className="w-full" onClick={() => setModalOpen(true)} type="button">
                    {hasPlacedBet ? 'Increase Position' : 'Place Private Bet'}
                  </Button>
                </>
              ) : (
                <div className="space-y-8 text-center py-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-primary/20 p-4 text-primary">
                      <Trophy className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-foreground">Resolution Success</h3>
                    <p className="text-sm text-muted-foreground">Outcome "YES" has been finalized. You predicted correctly!</p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] p-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Payout</p>
                    <p className="text-3xl font-black text-primary">+0.84 ETH</p>
                  </div>

                  <Button 
                    size="lg" 
                    disabled={isLoading || hasClaimed} 
                    onClick={handleClaim} 
                    type="button" 
                    className="w-full gap-2"
                  >
                    {hasClaimed ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {hasClaimed ? 'Reward Claimed' : isLoading ? 'Claiming...' : 'Claim Wins'}
                  </Button>

                  {hasClaimed && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-bold text-muted-foreground text-center"
                    >
                      Transaction finalized: 0x8f2d...4a11
                    </motion.p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        <BetModal
          marketAddress={params.address}
          onClose={() => {
            setModalOpen(false);
            setPlacedBet(true);
          }}
          open={isModalOpen}
          outcome={selectedOutcome}
        />
      </main>
    </>
  );
}
