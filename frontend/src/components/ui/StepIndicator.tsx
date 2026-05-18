'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStepIndex: number;
  /** 'compact' hides labels, 'expanded' shows descriptions */
  variant?: 'compact' | 'expanded';
  className?: string;
}

export default function StepIndicator({
  steps,
  currentStepIndex,
  variant = 'expanded',
  className,
}: StepIndicatorProps): JSX.Element {
  return (
    <div className={clsx('flex items-start gap-0', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isActive = index === currentStepIndex;
        const isPending = index > currentStepIndex;
        const Icon = step.icon;

        return (
          <div
            key={step.id}
            className={clsx(
              'flex items-start gap-0 flex-1',
              index < steps.length - 1 && 'relative',
            )}
          >
            {/* Step dot + connector */}
            <div className="flex flex-col items-center">
              <motion.div
                className={clsx(
                  'relative z-10 flex items-center justify-center rounded-full border-2 transition-colors duration-300',
                  variant === 'compact' ? 'h-6 w-6' : 'h-8 w-8',
                  isCompleted && 'border-primary bg-primary',
                  isActive && 'border-primary bg-primary/20',
                  isPending && 'border-white/10 bg-white/[0.03]',
                )}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={isActive ? { duration: 2, repeat: Infinity } : {}}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 text-primary-foreground" />
                ) : Icon ? (
                  <Icon
                    className={clsx(
                      'h-3 w-3',
                      isActive ? 'text-primary' : 'text-white/25',
                    )}
                  />
                ) : (
                  <span
                    className={clsx(
                      'font-mono text-[9px] font-bold',
                      isActive ? 'text-primary' : 'text-white/25',
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Labels */}
              {variant === 'expanded' && (
                <div className="mt-2 text-center max-w-[100px]">
                  <p
                    className={clsx(
                      'text-[10px] font-bold uppercase tracking-[0.15em]',
                      isCompleted && 'text-primary/70',
                      isActive && 'text-primary',
                      isPending && 'text-white/20',
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && isActive && (
                    <motion.p
                      className="mt-0.5 text-[9px] text-white/30 leading-tight"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {step.description}
                    </motion.p>
                  )}
                </div>
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 flex items-center pt-3.5 px-1">
                <div className="h-[2px] w-full relative rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : isActive ? '50%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
