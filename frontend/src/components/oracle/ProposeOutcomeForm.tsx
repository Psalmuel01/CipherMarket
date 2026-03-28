import { Activity, Info, Sparkles, Gavel, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useDemoFlow } from '@/hooks/useDemoFlow';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface ProposeOutcomeFormProps {
  className?: string;
}

export default function ProposeOutcomeForm({ className }: ProposeOutcomeFormProps): JSX.Element {
  const [isStaging, setIsStaging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { setResolved } = useDemoFlow();

  const handleStage = async () => {
    setIsStaging(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsStaging(false);
    setIsSuccess(true);
    setResolved(true);
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx("glass-card rounded-3xl p-8 text-center space-y-4", className)}
      >
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/20 p-4 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h3 className="text-xl font-black text-foreground">Proposal Staged</h3>
        <p className="text-xs text-muted-foreground">The optimistic dispute window is now open. The market will finalize in 24 hours if undisputed.</p>
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
          Resolution proposals will open the optimistic dispute window for 24 hours.
        </p>
      </div>

      <form className="space-y-6">
        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Market Address
          </label>
          <input
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            defaultValue="0x5f2d3d4f7f6b4c44f87c7250c6fe2f2606570a11"
          />
        </div>

        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Proposed Outcome
          </label>
          <select className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10">
            <option className="bg-background">Outcome: YES</option>
            <option className="bg-background">Outcome: NO</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Evidence URI (IPFS/HTTP)
          </label>
          <input
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            defaultValue="https://issuer.example/report-q2-2026"
          />
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-primary/5 p-4 text-[10px] font-black leading-relaxed text-primary/80 uppercase tracking-wider">
          <Info className="h-4 w-4 shrink-0" />
          <p>Important: Your locked stake will be slashed if this proposal is successfully disputed.</p>
        </div>

        <Button 
          className="w-full gap-2" 
          size="lg" 
          disabled={isStaging}
          onClick={(e) => {
            e.preventDefault();
            handleStage();
          }}
        >
          {isStaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isStaging ? 'Staging...' : 'Stage Proposal'}
        </Button>
      </form>
    </div>
  );
}

