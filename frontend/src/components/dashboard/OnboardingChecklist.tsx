'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ShieldCheck, Zap, Wallet, Key } from 'lucide-react';
import { useAccount } from 'wagmi';
import clsx from 'clsx';
import useAppStore from '@/store/useAppStore';

export default function OnboardingChecklist(): JSX.Element | null {
  const { isConnected } = useAccount();
  const [isVisible, setVisible] = useState(true);

  // In a real app, we'd check contract state/local storage
  const [steps, setSteps] = useState([
    { id: 'wallet', label: 'Connect Wallet', completed: false, icon: Wallet },
    { id: 'permit', label: 'Self-Permit', completed: false, icon: Key, description: 'Grant FHE decryption access' },
    { id: 'collateral', label: 'Acquire USDC', completed: false, icon: ShieldCheck },
    { id: 'trade', label: 'First Private Trade', completed: false, icon: Zap },
  ]);

  useEffect(() => {
    setSteps(current => current.map(step => {
      if (step.id === 'wallet') return { ...step, completed: isConnected };
      return step;
    }));
  }, [isConnected]);

  // Hide if all completed
  const allCompleted = steps.every(s => s.completed);
  if (allCompleted && !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="glass-card rounded-[32px] p-6 border border-primary/20 bg-primary/[0.02] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={() => setVisible(false)}
              className="text-white/10 hover:text-white/30 transition-colors text-[10px] font-mono uppercase tracking-widest"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#e8e4df] tracking-tight">Getting Started</h3>
              <p className="text-[11px] text-white/30 leading-relaxed">
                Complete these steps to unlock full private trading capabilities on CipherMarket.
              </p>
            </div>

            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3 group">
                  <div className="mt-0.5 shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/10 group-hover:text-white/20 transition-colors" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={clsx(
                      "text-xs font-medium transition-colors",
                      step.completed ? "text-white/40" : "text-[#e8e4df]"
                    )}>
                      {step.label}
                    </p>
                    {step.description && !step.completed && (
                      <p className="text-[10px] text-white/20">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!allCompleted && (
              <div className="pt-2">
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
