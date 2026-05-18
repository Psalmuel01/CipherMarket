'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

export type ProgressRingStage =
  | 'encrypting'
  | 'decrypting'
  | 'proving'
  | 'verifying'
  | 'settling'
  | 'syncing'
  | 'indeterminate';

const STAGE_LABELS: Record<ProgressRingStage, string> = {
  encrypting: 'Encrypting',
  decrypting: 'Decrypting',
  proving: 'Proving',
  verifying: 'Verifying',
  settling: 'Settling',
  syncing: 'Syncing',
  indeterminate: 'Processing',
};

export interface ProgressRingProps {
  /** 0–100 for determinate, omit for indeterminate */
  progress?: number;
  stage?: ProgressRingStage;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export default function ProgressRing({
  progress,
  stage = 'indeterminate',
  size = 64,
  strokeWidth = 3,
  label,
  className,
}: ProgressRingProps): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isDeterminate = progress !== undefined;
  const offset = isDeterminate
    ? circumference - (progress / 100) * circumference
    : circumference * 0.7;

  return (
    <div
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-xl"
        style={{ background: 'radial-gradient(circle, rgba(232,83,58,0.25) 0%, transparent 70%)' }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={
            isDeterminate
              ? { strokeDashoffset: offset, rotate: -90 }
              : {
                  strokeDashoffset: [circumference * 0.7, circumference * 0.3, circumference * 0.7],
                  rotate: [0, 360],
                }
          }
          transition={
            isDeterminate
              ? { duration: 0.5, ease: 'easeOut' }
              : { duration: 2, repeat: Infinity, ease: 'linear' }
          }
          style={{ transformOrigin: 'center' }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
        {isDeterminate ? (
          <span className="font-mono text-[10px] font-medium text-primary">
            {Math.round(progress)}%
          </span>
        ) : (
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Stage label below */}
      {(label || stage) && (
        <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          {label ?? STAGE_LABELS[stage]}
        </p>
      )}
    </div>
  );
}
